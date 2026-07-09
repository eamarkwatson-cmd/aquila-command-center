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
  name: "create_delegation",
  title: "Create delegation",
  description: "Create a new delegation (task) for Mark or Kennedy.",
  inputSchema: {
    title: z.string().min(1).describe("Delegation title."),
    owner: z.string().min(1).describe("Assignee, e.g. 'Kennedy' or 'Mark'."),
    description: z.string().optional(),
    status: z.string().optional().describe("Default 'Not Started'."),
    priority: z.string().optional().describe("Low / Medium / High."),
    due_date: z.string().optional().describe("YYYY-MM-DD."),
    source: z.string().optional(),
    notes: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await db(ctx).from("delegations").insert(input).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { row: data } };
  },
});
