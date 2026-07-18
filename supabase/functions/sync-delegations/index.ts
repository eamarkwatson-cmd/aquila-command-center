// Two-way sync: Supabase `delegations` <-> Notion Task Tracker (All Tasks data source).
// The Task Tracker's Open/Completed/Overdue views all sit on ONE data source, so we
// sync against that single database and Notion's own view filters handle the rest.
//
// Requires in Vault/env: NOTION_API_KEY
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "npm:@supabase/supabase-js@2";

// "All Tasks" data source that backs Open/Completed/Overdue views in the July 2026
// month page of the Task Tracker. Can be overridden via app_settings key
// `notion_tasks_db_id` without redeploying.
const DEFAULT_TASKS_DB_ID = "fee44131-e7f5-4553-acb9-b0c23e028ae3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// App status <-> Notion status
function toNotionStatus(s: string): string {
  if (s === "Done") return "Complete";
  if (s === "Overdue") return "In Progress"; // Notion tracker derives overdue via views
  return s; // Not Started / In Progress / Waiting map 1:1
}
function toAppStatus(s: string | null): string {
  if (s === "Complete") return "Done";
  if (s && ["Not Started", "In Progress", "Waiting"].includes(s)) return s;
  return "Not Started";
}

function derivedDateProps(dueDate: string | null) {
  if (!dueDate) return {};
  const d = new Date(dueDate + "T00:00:00Z");
  if (isNaN(d.getTime())) return {};
  const month = MONTHS[d.getUTCMonth()];
  const week = `Week ${Math.min(4, Math.ceil(d.getUTCDate() / 7))}`;
  const dow = DAYS[d.getUTCDay()];
  const props: Record<string, unknown> = {
    Month: { select: { name: month } },
    Week: { select: { name: week } },
  };
  if (dow !== "Saturday" && dow !== "Sunday") props.Day = { select: { name: dow } };
  return props;
}

function notionProps(row: any) {
  const props: Record<string, unknown> = {
    Task: { title: [{ type: "text", text: { content: (row.title ?? "").slice(0, 2000) } }] },
    Owner: { select: { name: row.owner === "Other" ? "Kennedy" : row.owner } },
    Status: { select: { name: toNotionStatus(row.status) } },
    ...derivedDateProps(row.due_date),
  };
  if (row.priority) props.Priority = { select: { name: row.priority } };
  if (row.due_date) props["Due Date"] = { date: { start: row.due_date } };
  if (row.notes || row.description) {
    props.Notes = { rich_text: [{ type: "text", text: { content: `${row.description ?? ""}${row.description && row.notes ? " | " : ""}${row.notes ?? ""}`.slice(0, 2000) } }] };
  }
  if (row.completed_at) props["Completed Date"] = { date: { start: row.completed_at.slice(0, 10) } };
  return props;
}

function extractText(prop: any): string {
  const arr = prop?.rich_text ?? prop?.title ?? [];
  return arr.map((r: any) => r.plain_text ?? "").join("");
}

async function notionFetch(token: string, path: string, method: string, body?: unknown) {
  const attempt = (version: string) =>
    fetch(`https://api.notion.com/v1/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": version,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  let res = await attempt("2022-06-28");
  if (res.status === 404 || res.status === 400) {
    const retry = await attempt("2025-09-03");
    if (retry.ok) res = retry;
  }
  return res;
}

async function queryAllNotionTasks(token: string, dbId: string) {
  const pages: any[] = [];
  let cursor: string | undefined = undefined;
  // Try databases endpoint, fall back to data_sources endpoint (newer API)
  for (const endpoint of [`databases/${dbId}/query`, `data_sources/${dbId}/query`]) {
    pages.length = 0;
    cursor = undefined;
    let failed = false;
    do {
      const res = await notionFetch(token, endpoint, "POST", {
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      if (!res.ok) { failed = true; break; }
      const json = await res.json();
      pages.push(...(json.results ?? []));
      cursor = json.has_more ? json.next_cursor : undefined;
    } while (cursor);
    if (!failed) return pages;
  }
  throw new Error("Could not query Notion tasks database (check NOTION_API_KEY, integration access to the Task Tracker, and the DB ID)");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const token = Deno.env.get("NOTION_API_KEY");
    if (!token) throw new Error("NOTION_API_KEY is not configured in Supabase Vault");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Allow DB id override via app_settings
    let dbId = DEFAULT_TASKS_DB_ID;
    const { data: dbSetting } = await supabase.from("app_settings").select("value").eq("key", "notion_tasks_db_id").maybeSingle();
    if (dbSetting?.value && typeof dbSetting.value === "string" && dbSetting.value.length > 10) dbId = dbSetting.value;

    const [notionPages, { data: rows, error: rowsErr }] = await Promise.all([
      queryAllNotionTasks(token, dbId),
      supabase.from("delegations").select("*"),
    ]);
    if (rowsErr) throw rowsErr;

    const byNotionId = new Map<string, any>();
    for (const r of rows ?? []) if (r.notion_page_id) byNotionId.set(r.notion_page_id, r);

    const stats = { pulled_new: 0, pulled_updates: 0, pushed_new: 0, pushed_updates: 0, errors: [] as string[] };
    const now = new Date().toISOString();
    const seenNotionIds = new Set<string>();

    // ---- Notion -> App ----
    for (const page of notionPages) {
      seenNotionIds.add(page.id);
      const p = page.properties ?? {};
      const incoming = {
        title: extractText(p.Task) || "(untitled)",
        owner: ["Mark", "Kennedy"].includes(p.Owner?.select?.name) ? p.Owner.select.name : "Other",
        status: toAppStatus(p.Status?.select?.name ?? null),
        priority: ["High", "Medium", "Low"].includes(p.Priority?.select?.name) ? p.Priority.select.name : null,
        due_date: p["Due Date"]?.date?.start?.slice(0, 10) ?? null,
        notes: extractText(p.Notes) || null,
        completed_at: p["Completed Date"]?.date?.start ? new Date(p["Completed Date"].date.start).toISOString() : null,
      };
      const existing = byNotionId.get(page.id);
      if (!existing) {
        const { error } = await supabase.from("delegations").insert({
          ...incoming,
          notion_page_id: page.id,
          synced_at: now,
          updated_at: now,
        });
        if (error) stats.errors.push(`insert "${incoming.title}": ${error.message}`);
        else stats.pulled_new++;
      } else {
        const notionEdited = new Date(page.last_edited_time).getTime();
        const appEdited = new Date(existing.updated_at).getTime();
        const lastSync = existing.synced_at ? new Date(existing.synced_at).getTime() : 0;
        if (notionEdited > lastSync && notionEdited >= appEdited) {
          // Notion is newer -> update app
          const { error } = await supabase.from("delegations")
            .update({ ...incoming, synced_at: now, updated_at: now })
            .eq("id", existing.id);
          if (error) stats.errors.push(`update "${incoming.title}": ${error.message}`);
          else stats.pulled_updates++;
        } else if (appEdited > lastSync) {
          // App is newer -> push to Notion
          const res = await notionFetch(token, `pages/${page.id}`, "PATCH", { properties: notionProps(existing) });
          if (!res.ok) stats.errors.push(`notion update "${existing.title}": ${res.status}`);
          else {
            await supabase.from("delegations").update({ synced_at: now }).eq("id", existing.id);
            stats.pushed_updates++;
          }
        }
      }
    }

    // ---- App -> Notion (new local rows, or rows whose Notion page was deleted) ----
    for (const row of rows ?? []) {
      const missingInNotion = row.notion_page_id && !seenNotionIds.has(row.notion_page_id);
      if (row.notion_page_id && !missingInNotion) continue;
      const res = await notionFetch(token, "pages", "POST", {
        parent: { database_id: dbId },
        properties: notionProps(row),
      });
      if (!res.ok) {
        // Newer API wants data_source_id parent
        const res2 = await notionFetch(token, "pages", "POST", {
          parent: { data_source_id: dbId },
          properties: notionProps(row),
        });
        if (!res2.ok) { stats.errors.push(`notion create "${row.title}": ${res.status}`); continue; }
        const created2 = await res2.json();
        await supabase.from("delegations").update({ notion_page_id: created2.id, synced_at: now }).eq("id", row.id);
        stats.pushed_new++;
        continue;
      }
      const created = await res.json();
      await supabase.from("delegations").update({ notion_page_id: created.id, synced_at: now }).eq("id", row.id);
      stats.pushed_new++;
    }

    await supabase.from("app_settings").upsert({ key: "delegations_last_sync", value: JSON.stringify(now), updated_at: now });
    try {
      await supabase.from("activity_log").insert({
        entity_type: "notion_sync",
        action: "notion_synced",
        performed_by: "sync-delegations",
        details: `Delegations sync: +${stats.pulled_new} pulled, ${stats.pulled_updates} updated from Notion, +${stats.pushed_new} pushed, ${stats.pushed_updates} updated in Notion${stats.errors.length ? `, ${stats.errors.length} errors` : ""}`,
      });
    } catch { /* best-effort */ }

    return new Response(JSON.stringify({ ok: true, ...stats, synced_at: now }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-delegations failed", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
