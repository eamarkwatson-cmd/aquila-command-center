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
  name: "update_delegation_status",
  title: "Update delegation status",
  description: "Change the status of an existing delegation. Sets completed_at when status is 'Done'.",
  inputSchema: {
    id: z.string().uuid().describe("Delegation id."),
    status: z.string().min(1).describe("New status."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true },
  handler: async ({ id, status }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const patch: Record<string, unknown> = { status };
    if (status.toLowerCase() === "done") patch.completed_at = new Date().toISOString();
    const { data, error } = await db(ctx).from("delegations").update(patch).eq("id", id).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { row: data } };
  },
});
