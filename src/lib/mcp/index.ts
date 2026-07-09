import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDelegations from "./tools/list-delegations";
import createDelegation from "./tools/create-delegation";
import updateDelegationStatus from "./tools/update-delegation-status";
import listInvestments from "./tools/list-investments";
import listEvents from "./tools/list-events";
import listInbox from "./tools/list-inbox";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aquila-ea-dashboard",
  title: "Aquila EA Dashboard",
  version: "0.1.0",
  instructions:
    "Tools for the Aquila EA Dashboard. Use these to read delegations, investments, calendar events, and inbox items, and to create or update delegations on behalf of the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDelegations, createDelegation, updateDelegationStatus, listInvestments, listEvents, listInbox],
});
