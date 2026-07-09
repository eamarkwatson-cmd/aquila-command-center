import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function db(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_delegations",
  title: "List delegations",
  description: "List Aquila delegations (tasks). Optionally filter by status or owner.",
  inputSchema: {
    status: z.string().optional().describe("Filter by status, e.g. 'Not Started', 'In Progress', 'Done'."),
    owner: z.string().optional().describe("Filter by owner name."),
    limit: z.number().int().positive().max(200).optional().describe("Max rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, owner, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = db(ctx).from("delegations").select("*").order("updated_at", { ascending: false }).limit(limit ?? 50);
    if (status) q = q.eq("status", status);
    if (owner) q = q.eq("owner", owner);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { rows: data ?? [] } };
  },
});
