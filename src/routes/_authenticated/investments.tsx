import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X, ExternalLink, AlertCircle, Search, Sparkles, Copy, CheckCircle2, Pencil, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/_authenticated/investments")({
  component: InvestmentsPage,
});

const CHART_COLORS = ["#1B3A6B", "#C8A96E", "#2C5282", "#B8944D", "#4A6FA5", "#8B7A3F", "#6B8CBF", "#D4C08A", "#375987", "#A8935D"];

type Preset = "all" | "attention" | "past_due" | "pending_docs" | "exited";

function needsAttention(i: Investment): boolean {
  if (i.capital_call_status === "Past Due") return true;
  if (i.docsign_status === "Pending" || i.docsign_status === "Not Sent") return true;
  if (i.next_action_due && new Date(i.next_action_due) < new Date(new Date().toDateString())) return true;
  return false;
}

type Investment = {
  id: string; name: string; fund_entity: string | null; holding_entity: string | null;
  category: string | null; status: string; amount_committed: string | null;
  capital_call_status: string | null; docsign_status: string | null;
  contact: string | null; notes: string | null; drive_folder_link: string | null;
  next_action: string | null; next_action_due: string | null;
  created_at: string; updated_at: string;
};

const ALL_INVESTMENTS = [
  { name:"021T Capital Fund I LP", fund_entity:"021T Capital Fund I LP", holding_entity:"Columbia Private Trust IRA", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Teddy Marks — Columbia Private Trust", notes:"IRA investment via Columbia Private Trust.", drive_folder_link:"https://drive.google.com/drive/folders/1fvJqE-vUcnbdb_dok_3aPo64nSDapr99", next_action:null, next_action_due:null },
  { name:"Adelphi Capital", fund_entity:"Adelphi Capital", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:"Cristina Yacobucci — CYacobucci@adelphicapital.com", notes:"Active relationship. Dinner arranged July 9 DC trip.", drive_folder_link:"https://drive.google.com/drive/folders/1tGz4blYLGfB9l0umqKFkuBDgAB2gWDVX", next_action:null, next_action_due:null },
  { name:"Alastin", fund_entity:"Alastin Skincare", holding_entity:"Aquila Capital Partners LLC", category:"BioTech", status:"Exited", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:"Exited.", drive_folder_link:"https://drive.google.com/drive/folders/1y8hDFCrWd48s_rah92rpUZKaYm4tC4m-", next_action:null, next_action_due:null },
  { name:"Anduril Pre-IPO Fund III", fund_entity:"UpMarket / Anduril Pre-IPO Fund III", holding_entity:"Aquila Capital Partners LLC", category:"AI", status:"Active", amount_committed:"TBC", capital_call_status:"Pending", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"Sub Doc & OA signed June 25 2026. Awaiting proof of address and Delaware Certificate of Good Standing to complete UpMarket onboarding.", drive_folder_link:"https://drive.google.com/drive/folders/1-KE6GBXnoXUA_S4GSxzZH4Vv0f3FfaNx", next_action:"Send Delaware Certificate to Nora Wang once received", next_action_due:"2026-07-10" },
  { name:"Aquiline Capital Partners", fund_entity:"Aquiline Capital Partners", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1oL6LN2y_aFW1Ib53saNnl4KzLuICuK7G", next_action:null, next_action_due:null },
  { name:"Artmundi", fund_entity:"Artmundi", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/13yt4nqEN0Sd3wMr7apj5DaRegiaLDgkg", next_action:null, next_action_due:null },
  { name:"AtomH2O", fund_entity:"AtomH2O LLC", holding_entity:"Columbia Private Trust IRA", category:"Energy", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Teddy Marks — Columbia Private Trust", notes:"IRA investment. Active project meetings weekly.", drive_folder_link:"https://drive.google.com/drive/folders/19rSfNrRE6zoGYyDVe2MwXFZjHGXwCCaJ", next_action:null, next_action_due:null },
  { name:"ATX Innovation / Union / TabbedOut", fund_entity:"ATX Innovation (Union)", holding_entity:"Aquila Capital Partners LLC", category:"DTC", status:"Active", amount_committed:"$1,506,766", capital_call_status:"Funded", docsign_status:"Signed", contact:null, notes:"$1M (Feb 2020) + $506,766 (May 2021) committed.", drive_folder_link:"https://drive.google.com/drive/folders/1ZDpJuY0vb-TDwpOEAEEPlS1OjmwE1e3K", next_action:null, next_action_due:null },
  { name:"Bite Investments", fund_entity:"Bite Investments", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1HQQ0aswTizSwfuDSL1pUVRVETfDX_Az0", next_action:null, next_action_due:null },
  { name:"ByteDance Co-Investment", fund_entity:"ByteDance", holding_entity:"Aquila Capital Partners LLC", category:"AI", status:"Active", amount_committed:"$53,000", capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1ITdyJKf970QWqs0sAKHClC2MMKNWyqSm", next_action:null, next_action_due:null },
  { name:"Canteen", fund_entity:"Canteen", holding_entity:"Aquila Capital Partners LLC", category:"DTC", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/10FrIZ_gUMdV2OHhyqM8woqdcA9Z8DWL4", next_action:null, next_action_due:null },
  { name:"Capsure", fund_entity:"Capsure", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1x_pRVQDlep-94LwV_zrZRmsc8e-aVQev", next_action:null, next_action_due:null },
  { name:"Clearway Capital", fund_entity:"Clearway Capital", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:"investors@clearwaycp.com / gf@clearwaycp.com", notes:"Monthly performance reports active. March–May 2026 reports received.", drive_folder_link:"https://drive.google.com/drive/folders/1hYkw8I2Oe4S9pyTb3mJBDqBsuRjGT0r1", next_action:null, next_action_due:null },
  { name:"Clerisy Global Fund I", fund_entity:"Clerisy Global Fund I", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:null, capital_call_status:"Funded", docsign_status:"Signed", contact:null, notes:"New capital call June 18 2026 — Smash Kitchen investment. Q1 2026 financials on SUBSCRIBE portal.", drive_folder_link:"https://drive.google.com/drive/folders/1BNIKBSFIkO2Zv4kWVuvb3MSdfFA0Re_Y", next_action:"Review Smash Kitchen capital call", next_action_due:null },
  { name:"CyberFortress", fund_entity:"CyberFortress", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1qTm-PQG87hI9Iz1rRH7RmmhguBC-AETz", next_action:null, next_action_due:null },
  { name:"Ecliptic Capital", fund_entity:"Ecliptic Capital", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1SA61bgnMwPevE631ppMh_-hwgfIocet0", next_action:null, next_action_due:null },
  { name:"Embroker", fund_entity:"Embroker", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/14Mly4A4GaN2h0YsCKk5iJzW-vbH8EPAH", next_action:null, next_action_due:null },
  { name:"EQ Music LLC", fund_entity:"EQ Music LLC", holding_entity:"Aquila Capital Partners LLC", category:"Media & Entertainment", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1lKcn1HGz3VkSJfyqdhKxM9PVdEGNEmRt", next_action:null, next_action_due:null },
  { name:"Eve.io", fund_entity:"Eve.io", holding_entity:"Aquila Capital Partners LLC", category:"Media & Entertainment", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1tf3zvYk4QSt8V0b8XG_XJAzMhVEKwlDA", next_action:null, next_action_due:null },
  { name:"FancyAI", fund_entity:"FancyAI", holding_entity:"Aquila Capital Partners LLC", category:"AI", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/13eu1PMzj7_jr9xyKFOJ09f5eFL_677l5", next_action:null, next_action_due:null },
  { name:"FinTron", fund_entity:"FinTron Inc.", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1H-CU7CIMZno01zzsyAJELdPOPr76szB9", next_action:null, next_action_due:null },
  { name:"GLO Pharma — Series D", fund_entity:"GLO Pharma", holding_entity:"Columbia Private Trust IRA", category:"BioTech", status:"Active", amount_committed:"TBC", capital_call_status:"Pending", docsign_status:"Pending", contact:"Teddy Marks — Columbia Private Trust", notes:"Series D. IRA investment. DocuSign pending.", drive_folder_link:"https://drive.google.com/drive/folders/1cc2eFEA1LPO-34EFHFEA67UrDnM6f_AW", next_action:"Complete DocuSign", next_action_due:null },
  { name:"GRI (SVP)", fund_entity:"GRI (SVP)", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1CnmS84pqZvXqqyayaUDqC-0bSBurJndL", next_action:null, next_action_due:null },
  { name:"Harbor.ai", fund_entity:"Harbor.ai", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1Klp_FlQoW55viDzOsvMhFBs6LSctXzsR", next_action:null, next_action_due:null },
  { name:"Immunis Biomedical — SAFE Note", fund_entity:"Immunis Biomedical", holding_entity:"Columbia Private Trust IRA", category:"BioTech", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Not Sent", contact:"Teddy Marks — Columbia Private Trust", notes:"Original DocuSign voided May 19 2026 by Luke Fishman (Sheppard Mullin). New DocuSign not yet sent.", drive_folder_link:"https://drive.google.com/drive/folders/1x5bklCS7sK2sf1xG5U4JT7NXkLixUtnV", next_action:"Chase new DocuSign from Sheppard Mullin", next_action_due:null },
  { name:"Kenetik — Series A-1", fund_entity:"Kenetik Inc.", holding_entity:"Columbia Private Trust IRA", category:"DTC", status:"Active", amount_committed:"$100,000", capital_call_status:"Funded", docsign_status:"Signed", contact:"Devon Price, Josh Goodale", notes:"Series A-1 Stock Purchase Agreement signed June 2026. Sample order delivered July 2026.", drive_folder_link:"https://drive.google.com/drive/folders/1ZJq1lO1P4TAmxJ4Q3cBNd2AcmtNeBhHt", next_action:null, next_action_due:null },
  { name:"Kraken Co-Investment Fund I", fund_entity:"Kraken Co-Investment Fund I", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Past Due", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"2025 annual expense call due Jan 31 2025 remains outstanding. Multiple UpMarket reminders. Hiive secondary offering: $5M+ at $28/share (~$9.1B valuation) flagged July 2026.", drive_folder_link:"https://drive.google.com/drive/folders/1Rz_LbqiODWKvYJ01odUesov4XMgRJ1mZ", next_action:"Wire management fee — call UpMarket +1-888-248-7658 first", next_action_due:"2026-07-08" },
  { name:"LEAP Holdings", fund_entity:"LEAP Holdings", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"$200,000", capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/167-T_zfQpDSVqUkeQDA94Lmlhv19PiF4", next_action:null, next_action_due:null },
  { name:"Link Ventures XPV Fund 1 LP", fund_entity:"Link Ventures XPV Fund 1 LP", holding_entity:"Pacific Premier Trust IRA", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Teddy Marks — Columbia Private Trust", notes:"IRA via Pacific Premier Trust. Contact: Bobbi Milliken bmilliken@cooley.com, Devon devon@021t.vc", drive_folder_link:"https://drive.google.com/drive/folders/19yA8m75Q6VWHUifRGxA7uKW09RO-tDTH", next_action:null, next_action_due:null },
  { name:"Litmus Risk", fund_entity:"Litmus Risk", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/15FobQOvqeM9VOr1l9iMKWZalvxW86i3d", next_action:null, next_action_due:null },
  { name:"LKCM Headwater Investments III", fund_entity:"LKCM Headwater Investments III", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"$150,000", capital_call_status:"Funded", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/14iglF-RZE76QlhK8mMl72gLxnmYq8qQT", next_action:null, next_action_due:null },
  { name:"Marqeta Co-Investment Fund", fund_entity:"Marqeta Co-Investment Fund", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"2023 and 2024 K-1 on file. 2023 K-1 beginning capital $49,880.", drive_folder_link:"https://drive.google.com/drive/folders/1Rz_LbqiODWKvYJ01odUesov4XMgRJ1mZ", next_action:null, next_action_due:null },
  { name:"MIC Global", fund_entity:"MIC Global", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Active", amount_committed:"TBC", capital_call_status:"N/A", docsign_status:"Signed", contact:"Jamie Crystal CEO — jamie.crystal@micglobal.com", notes:"Active deal. Regular meetings. Jamie Crystal meeting July 8 2026.", drive_folder_link:"https://drive.google.com/drive/folders/1VykQ2LCbFwqd_sOojo1BuQB-K_MOJ9S_", next_action:null, next_action_due:null },
  { name:"Netskope Co-Investment Fund", fund_entity:"Netskope Co-Investment Fund", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"2024 K-1 and 2025 draft K-1 on file.", drive_folder_link:"https://drive.google.com/drive/folders/1Rz_LbqiODWKvYJ01odUesov4XMgRJ1mZ", next_action:null, next_action_due:null },
  { name:"NLX (Acquired by Amazon)", fund_entity:"NLX", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Exited", amount_committed:"$300,000", capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:"Convertible notes: $100k (Aug 2020) + $200k (Nov 2020). Acquired by Amazon 2026.", drive_folder_link:"https://drive.google.com/drive/folders/1DTtFQoe8_M347YvnhoeLYtLeZLPkC0ja", next_action:null, next_action_due:null },
  { name:"North Run SOF", fund_entity:"North Run SOF", holding_entity:"Pacific Premier Trust IRA", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Pending", docsign_status:"Signed", contact:"Matt Weber — mweber@sagevp.com", notes:"IRA via Pacific Premier Trust. Distribution #3 received June 11 2026 totalling $52k. Outstanding subscription documents on Carta.", drive_folder_link:"https://drive.google.com/drive/folders/1JUO0aChoTbTA_UE5xRod4zE5-XHJhNRv", next_action:"Complete outstanding subscription documents on Carta", next_action_due:null },
  { name:"Oakcliff Capital", fund_entity:"Oakcliff Capital", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1IdXJx6K4JSk6scSnuirPCM4NiMb-kIVQ", next_action:null, next_action_due:null },
  { name:"Onuu", fund_entity:"Onuu", holding_entity:"Aquila Capital Partners LLC", category:"FinTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1ShVwGFFRQw5Z4kSKEYReBbdx99B42SlX", next_action:null, next_action_due:null },
  { name:"Pilgrim Soul / Laurel Canyon", fund_entity:"Pilgrim Soul / Laurel Canyon", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1gVX3ljthsV_YK-n4rR55su7mZWMwz40I", next_action:null, next_action_due:null },
  { name:"Plaid Co-Investment Fund", fund_entity:"Plaid Co-Investment Fund", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"2024 K-1 and 2025 draft K-1 on file.", drive_folder_link:"https://drive.google.com/drive/folders/1Rz_LbqiODWKvYJ01odUesov4XMgRJ1mZ", next_action:null, next_action_due:null },
  { name:"Project Prometheus (UpMarket)", fund_entity:"Jeff Bezos Physical AI — UpMarket", holding_entity:"Aquila Capital Partners LLC", category:"AI", status:"Active", amount_committed:"$50,000", capital_call_status:"Pending", docsign_status:"Pending", contact:"Nora Wang — nora.wang@upmarket.co", notes:"Indication of interest submitted July 3 2026. Source: sell $50k SpaceX locked-up.", drive_folder_link:null, next_action:"Await UpMarket wire instructions", next_action_due:null },
  { name:"ReBalance Health", fund_entity:"ReBalance Health", holding_entity:"Aquila Capital Partners LLC", category:"BioTech", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1WPH-Lo7Vr4tDdGEaWhOeSQWPTchqu5MD", next_action:null, next_action_due:null },
  { name:"Recharge Capital", fund_entity:"Recharge Capital", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1Pu3W6oyJjgB3_AR60h5fhCzToeuyu-23", next_action:null, next_action_due:null },
  { name:"Sempulse — Convertible Note", fund_entity:"Sempulse", holding_entity:"Columbia Private Trust IRA", category:"Energy", status:"Active", amount_committed:"TBC", capital_call_status:"Funded", docsign_status:"Signed", contact:"Teddy Marks — Columbia Private Trust", notes:"Convertible note. IRA via Pacific Premier Trust.", drive_folder_link:"https://drive.google.com/drive/folders/1YRWAjYEna9NiSgoIFVd4uyGQMKrDM2YK", next_action:null, next_action_due:null },
  { name:"Spirited Cocktails", fund_entity:"Spirited Cocktails", holding_entity:"Aquila Capital Partners LLC", category:"DTC", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1wwLZ_17IyMt_bagrdX8Bb5fdwvYRS2Tx", next_action:null, next_action_due:null },
  { name:"SPX Access Fund", fund_entity:"SPX Access Fund", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:null, capital_call_status:"Past Due", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co", notes:"2026 management fee capital call due Jan 30 2026 — OUTSTANDING July 2026. Multiple UpMarket reminders.", drive_folder_link:"https://drive.google.com/drive/folders/1Yf0O870WrpuN9sooSJAY0J9H-ED2_WqP", next_action:"Wire management fee — call UpMarket +1-888-248-7658 first", next_action_due:"2026-07-08" },
  { name:"Tether (Venture)", fund_entity:"Tether", holding_entity:"Aquila Capital Partners LLC", category:"AI", status:"Active", amount_committed:"TBC", capital_call_status:"N/A", docsign_status:"N/A", contact:"Marguerite", notes:"Active Tether venture with Marguerite. Tech founder visiting for brainstorm sessions July 8–10 2026.", drive_folder_link:null, next_action:"Brainstorm session July 8–10", next_action_due:"2026-07-10" },
  { name:"UpMarket — Pre-IPO Portfolio", fund_entity:"UpMarket / MX Pre-IPO Portfolio Fund I", holding_entity:"Aquila Capital Partners LLC", category:"Fund / LP", status:"Active", amount_committed:null, capital_call_status:"Funded", docsign_status:"Signed", contact:"Nora Wang — nora.wang@upmarket.co / operations@upmarket.co", notes:"Multiple co-investment funds: Marqeta, Plaid, Bytedance, Kraken, Netskope, Anduril (pending). SPX management fee overdue.", drive_folder_link:"https://drive.google.com/drive/folders/1Rz_LbqiODWKvYJ01odUesov4XMgRJ1mZ", next_action:null, next_action_due:null },
  { name:"Vesttoo", fund_entity:"Vesttoo", holding_entity:"Aquila Capital Partners LLC", category:"InsurTech", status:"Closed", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1vs6SlqQlAheY2Nj8v-j_r1Y-Ty3eC-hH", next_action:null, next_action_due:null },
  { name:"WGD Freedom Investment Holdings", fund_entity:"WGD Freedom Investment Holdings", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:"$250,000", capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/13eYLERqApjaoiJNX7En7_LlCWoqTdA0_", next_action:null, next_action_due:null },
  { name:"Xsphera", fund_entity:"Xsphera", holding_entity:"Aquila Capital Partners LLC", category:"Other", status:"Active", amount_committed:null, capital_call_status:"N/A", docsign_status:"Signed", contact:null, notes:null, drive_folder_link:"https://drive.google.com/drive/folders/1mOfxk_-3HC2h8xw0IfS31Q-ECcrT18uD", next_action:null, next_action_due:null },
];

const STATUS_COLORS: Record<string, string> = {
  "Active": "bg-status-approved/10 text-status-approved border-status-approved/20",
  "Pending": "bg-status-review/10 text-status-review border-status-review/20",
  "Closed": "bg-muted text-muted-foreground border-border",
  "Exited": "bg-status-posted/10 text-status-posted border-status-posted/20",
};

const CALL_COLORS: Record<string, string> = {
  "Past Due": "bg-destructive/10 text-destructive border-destructive/20",
  "Pending": "bg-status-review/10 text-status-review border-status-review/20",
  "Funded": "bg-status-approved/10 text-status-approved border-status-approved/20",
  "N/A": "bg-muted text-muted-foreground border-border",
};

function InvestmentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [entityF, setEntityF] = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [categoryF, setCategoryF] = useState("all");
  const [preset, setPreset] = useState<Preset>("all");
  const [selected, setSelected] = useState<Investment | null>(null);
  const [creating, setCreating] = useState(false);
  const [showPortfolioAI, setShowPortfolioAI] = useState(false);

  const {
    data: notionData,
    isLoading: notionLoading,
    error: notionError,
  } = useQuery({
    queryKey: ["investments-notion"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-investments");
      if (error) throw new Error(error.message);
      return data as {
        investments: Investment[]; count: number; sync_status: string;
        using_fallback_source_id?: boolean; error?: string; fetched_at?: string;
      };
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: localInvestments = [] } = useQuery<Investment[]>({
    queryKey: ["investments-local"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investments").select("*").order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as Investment[];
    },
  });

  const notionFailed = !!notionError
    || notionData?.sync_status === "notion_error"
    || notionData?.sync_status === "exception"
    || notionData?.sync_status === "missing_api_key";
  const notionEmpty  = !notionFailed && notionData?.sync_status === "empty";
  const notionOk     = !notionFailed && (notionData?.investments?.length ?? 0) > 0;

  const investments: Investment[] = notionOk
    ? (notionData!.investments ?? [])
    : notionFailed ? localInvestments : [];

  const isLoading = notionLoading;

  const filtered = useMemo(() => {
    let r = investments;
    if (preset === "attention") r = r.filter(needsAttention);
    else if (preset === "past_due") r = r.filter((i) => i.capital_call_status === "Past Due");
    else if (preset === "pending_docs") r = r.filter((i) => i.docsign_status === "Pending" || i.docsign_status === "Not Sent");
    else if (preset === "exited") r = r.filter((i) => i.status === "Exited");
    if (search) r = r.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.category ?? "").toLowerCase().includes(search.toLowerCase()) || (i.notes ?? "").toLowerCase().includes(search.toLowerCase()));
    if (entityF !== "all") r = r.filter((i) => i.holding_entity === entityF);
    if (statusF !== "all") r = r.filter((i) => i.status === statusF);
    if (categoryF !== "all") r = r.filter((i) => i.category === categoryF);
    return r;
  }, [investments, search, entityF, statusF, categoryF, preset]);

  const parseAmount = (a: string | null) => (a && !["TBC","N/A"].includes(a) ? (parseFloat(a.replace(/[$,]/g, "")) || 0) : 0);
  const totalCommitted = investments.reduce((s, i) => s + parseAmount(i.amount_committed), 0);
  const activeCount = investments.filter((i) => i.status === "Active").length;
  const attentionList = investments.filter(needsAttention);
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    investments.forEach((i) => { const k = i.category ?? "Other"; m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [investments]);
  const entityCounts = useMemo(() => {
    const m = new Map<string, number>();
    investments.forEach((i) => { const k = shortEntity(i.holding_entity); m.set(k, (m.get(k) ?? 0) + 1); });
    return Array.from(m, ([name, value]) => ({ name, value }));
  }, [investments]);
  const uniqueCategories = categoryCounts.length;

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("investments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSelected(null);
    toast.success("Deleted");
  }

  const PRESETS: { key: Preset; label: string; count?: number }[] = [
    { key: "all", label: "All", count: investments.length },
    { key: "attention", label: "Needs Attention", count: attentionList.length },
    { key: "past_due", label: "Past Due", count: investments.filter(i => i.capital_call_status === "Past Due").length },
    { key: "pending_docs", label: "Pending Docs", count: investments.filter(i => i.docsign_status === "Pending" || i.docsign_status === "Not Sent").length },
    { key: "exited", label: "Exited", count: investments.filter(i => i.status === "Exited").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading from Notion…"
              : notionOk ? `${investments.length} holdings · $${(totalCommitted/1_000_000).toFixed(2)}M · Notion`
              : notionFailed ? `${localInvestments.length} holdings (local fallback — Notion unavailable)`
              : notionEmpty ? "Notion returned 0 rows — check integration access"
              : `${investments.length} holdings`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPortfolioAI(true)} className="inline-flex items-center gap-2 rounded-md border border-gold/50 bg-gold/10 px-3 py-2 text-sm font-medium text-navy hover:bg-gold/20">
            <Sparkles className="h-4 w-4" /> AI Portfolio Summary
          </button>
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Summary dashboard */}
      {!isLoading && investments.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Committed" value={`$${(totalCommitted/1_000_000).toFixed(2)}M`} sub={`${investments.filter(i => parseAmount(i.amount_committed) > 0).length} with amounts`} />
            <StatCard label="Active Positions" value={String(activeCount)} sub={`of ${investments.length} total`} />
            <StatCard label="Needs Attention" value={String(attentionList.length)} sub="past due · pending · overdue" tone={attentionList.length > 0 ? "warn" : "ok"} />
            <StatCard label="Categories" value={String(uniqueCategories)} sub="distinct sectors" />
          </div>
          <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">Allocation by Category</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {categoryCounts.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {categoryCounts.map((c, idx) => (
                <span key={c.name} className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{c.name} ({c.value})</span>
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">By Holding Entity</h3>
            <div className="h-56">
              <ResponsiveContainer>
                <BarChart data={entityCounts} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1B3A6B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Sync status */}
      {!notionLoading && notionFailed && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="font-medium text-destructive">Notion unavailable — </span>
          <span className="text-muted-foreground">
            {notionData?.error ?? (notionError as Error)?.message ?? "Could not reach Notion"}.{" "}
            Showing {localInvestments.length} locally saved investment{localInvestments.length !== 1 ? "s" : ""} as fallback.
          </span>
        </div>
      )}
      {!notionLoading && notionEmpty && (
        <div className="rounded-md border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-muted-foreground">
          Notion returned 0 investments. Check that the Aquila Dashboard integration has access to the Investments database in Notion.
        </div>
      )}
      {attentionList.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm font-medium text-destructive">{attentionList.length} need immediate action</span></div>
          <ul className="space-y-1">
            {attentionList.slice(0, 8).map((i) => (
              <li key={i.id} className="text-xs text-destructive cursor-pointer hover:underline" onClick={() => setSelected(i)}>
                • {i.name} — {i.capital_call_status === "Past Due" ? "Capital call past due" : i.docsign_status === "Not Sent" || i.docsign_status === "Pending" ? `DocuSign ${i.docsign_status.toLowerCase()}` : i.next_action ?? "Overdue action"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preset chips */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button key={p.key} onClick={() => setPreset(p.key)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition",
              preset === p.key
                ? "border-navy bg-navy text-white"
                : "border-border bg-card text-muted-foreground hover:bg-muted")}>
            {p.label} {typeof p.count === "number" && <span className={cn("ml-1", preset === p.key ? "text-white/70" : "text-muted-foreground/60")}>({p.count})</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search investments…" className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm" />
        </div>
        <select value={entityF} onChange={(e) => setEntityF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All entities</option>
          <option>Aquila Capital Partners LLC</option><option>Columbia Private Trust IRA</option><option>Pacific Premier Trust IRA</option><option>Personal</option>
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All statuses</option><option>Active</option><option>Pending</option><option>Closed</option><option>Exited</option>
        </select>
        <select value={categoryF} onChange={(e) => setCategoryF(e.target.value)} className="rounded-md border border-border bg-card px-2 py-2 text-xs">
          <option value="all">All categories</option>
          {["FinTech","InsurTech","AI","BioTech","DTC","Energy","Fund / LP","Media & Entertainment","Real Estate","Other"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{filtered.length} of {investments.length}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Investment</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Capital Call</th>
              <th className="px-4 py-3 text-left">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</td></tr>}
            {!isLoading && filtered.map((inv) => (
              <tr key={inv.id} onClick={() => setSelected(inv)}
                className={cn("cursor-pointer hover:bg-muted/30 transition", inv.capital_call_status === "Past Due" && "border-l-4 border-l-destructive")}>
                <td className="px-4 py-3"><div className="font-medium">{inv.name}</div>{inv.fund_entity && inv.fund_entity !== inv.name && <div className="text-xs text-muted-foreground">{inv.fund_entity}</div>}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{shortEntity(inv.holding_entity)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{inv.category}</span></td>
                <td className="px-4 py-3 text-sm font-medium">{inv.amount_committed ?? "—"}</td>
                <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_COLORS[inv.status] ?? "bg-muted text-muted-foreground border-border")}>{inv.status}</span></td>
                <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", CALL_COLORS[inv.capital_call_status ?? "N/A"] ?? "bg-muted text-muted-foreground border-border")}>{inv.capital_call_status ?? "N/A"}</span></td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-48 truncate">{inv.next_action ?? "—"}</td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No investments match.</td></tr>}
          </tbody>
        </table>
      </div>

      {selected && <InvestmentPanel investment={selected} onClose={() => setSelected(null)} onSaved={(updated) => { qc.invalidateQueries({ queryKey: ["investments"] }); if (updated) setSelected(updated); else setSelected(null); }} onDelete={() => remove(selected.id)} />}
      {creating && <InvestmentPanel investment={null} onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["investments"] }); setCreating(false); }} onDelete={() => {}} />}
      {showPortfolioAI && <PortfolioAIModal investments={investments} onClose={() => setShowPortfolioAI(false)} />}
    </div>
  );
}

function shortEntity(e: string | null) {
  return (e ?? "—")
    .replace("Aquila Capital Partners LLC", "Aquila")
    .replace("Columbia Private Trust IRA", "Columbia IRA")
    .replace("Pacific Premier Trust IRA", "PPT IRA");
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "ok" | "warn" }) {
  return (
    <div className={cn("rounded-lg border p-4",
      tone === "warn" ? "border-destructive/30 bg-destructive/5" :
      "border-border bg-card")}>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold", tone === "warn" && "text-destructive")}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

type AIResult = { summary: string; risks: string; next_action: string };

function InvestmentPanel({ investment, onClose, onSaved, onDelete }: { investment: Investment | null; onClose: () => void; onSaved: (updated?: Investment) => void; onDelete: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(investment === null);
  const [form, setForm] = useState<Partial<Investment>>(investment ?? { status: "Active", capital_call_status: "N/A", docsign_status: "N/A" });
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState<AIResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [note, setNote] = useState("");

  const investmentId = investment?.id;

  const { data: activity = [] } = useQuery({
    enabled: !!investmentId,
    queryKey: ["investment-activity", investmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("investment_activity" as never)
        .select("*").eq("investment_id", investmentId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { id: string; note: string; created_by: string; created_at: string }[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (n: string) => {
      const { error } = await supabase.from("investment_activity" as never).insert({
        investment_id: investmentId, note: n, created_by: "Kennedy",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["investment-activity", investmentId] }); setNote(""); toast.success("Note added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Name required");
    setSaving(true);
    let error, data;
    if (investment?.id) {
      ({ error, data } = await supabase.from("investments").update({ ...(form as any), updated_at: new Date().toISOString() }).eq("id", investment.id).select().single());
    } else {
      ({ error, data } = await supabase.from("investments").insert(form as any).select().single());
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(investment ? "Updated" : "Created");
    setEditing(false);
    onSaved(data as unknown as Investment);
  }

  async function runAI() {
    if (!investment) return;
    setAiLoading(true); setAi(null);
    try {
      const payload = {
        name: investment.name, category: investment.category, status: investment.status,
        amount_committed: investment.amount_committed, capital_call_status: investment.capital_call_status,
        docsign_status: investment.docsign_status, next_action: investment.next_action,
        next_action_due: investment.next_action_due, notes: investment.notes, contact: investment.contact,
      };
      const { data, error } = await supabase.functions.invoke("investment-ai", { body: { mode: "single", data: payload } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error ?? "AI request failed");
      setAi(data.result as AIResult);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  async function markActionDone() {
    if (!investment) return;
    const { error } = await supabase.from("investments")
      .update({ next_action: null, next_action_due: null, updated_at: new Date().toISOString() })
      .eq("id", investment.id);
    if (error) return toast.error(error.message);
    toast.success("Action marked done");
    onSaved({ ...investment, next_action: null, next_action_due: null });
  }

  function copyEmail() {
    const email = (investment?.contact ?? "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    if (!email) return toast.error("No email in contact field");
    navigator.clipboard.writeText(email);
    toast.success(`Copied ${email}`);
  }

  const contactEmail = investment?.contact ? investment.contact.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] : null;
  const overdue = investment?.next_action_due && new Date(investment.next_action_due) < new Date(new Date().toDateString());

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-foreground/20 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold truncate pr-2">{investment ? investment.name : "New investment"}</h3>
          <div className="flex items-center gap-2 shrink-0">
            {investment && !editing && (
              <>
                <button type="button" onClick={runAI} disabled={aiLoading} className="inline-flex items-center gap-1 rounded-md border border-gold/50 bg-gold/10 px-2 py-1 text-xs text-navy hover:bg-gold/20 disabled:opacity-60">
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Ask AI
                </button>
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </>
            )}
            {investment?.id && <button type="button" onClick={onDelete} className="rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>}
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {investment && !editing ? (
          <div className="flex-1 space-y-5 p-5">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {investment.category && <span className="rounded-full bg-navy/10 text-navy border border-navy/20 px-2.5 py-0.5 text-xs font-medium">{investment.category}</span>}
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[investment.status] ?? "bg-muted text-muted-foreground border-border")}>{investment.status}</span>
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", CALL_COLORS[investment.capital_call_status ?? "N/A"] ?? "bg-muted text-muted-foreground border-border")}>Call: {investment.capital_call_status ?? "N/A"}</span>
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs">DocuSign: {investment.docsign_status ?? "N/A"}</span>
              {investment.amount_committed && <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-xs font-medium text-navy">{investment.amount_committed}</span>}
            </div>

            <Field label="Holding entity" value={investment.holding_entity ?? "—"} />
            {investment.fund_entity && investment.fund_entity !== investment.name && <Field label="Fund / entity" value={investment.fund_entity} />}
            {investment.contact && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-0.5">Contact</div>
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="text-sm text-navy hover:underline">{investment.contact}</a>
                ) : <div className="text-sm">{investment.contact}</div>}
              </div>
            )}
            {investment.notes && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{investment.notes}</p>
              </div>
            )}
            {investment.next_action && (
              <div className={cn("rounded-lg border p-3", overdue ? "border-destructive/30 bg-destructive/5" : "border-gold/40 bg-gold/5")}>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Next Action</div>
                <div className="text-sm">{investment.next_action}</div>
                {investment.next_action_due && (
                  <div className={cn("mt-1 text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
                    Due {investment.next_action_due} {overdue && "· OVERDUE"}
                  </div>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              {investment.drive_folder_link && (
                <a href={investment.drive_folder_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-navy hover:bg-muted">
                  <ExternalLink className="h-3 w-3" /> Open Drive
                </a>
              )}
              {contactEmail && (
                <button onClick={copyEmail} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  <Copy className="h-3 w-3" /> Copy Email
                </button>
              )}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
                  <Mail className="h-3 w-3" /> Email
                </a>
              )}
              {investment.next_action && (
                <button onClick={markActionDone} className="inline-flex items-center gap-1 rounded-md border border-status-approved/30 bg-status-approved/10 px-3 py-1.5 text-xs text-status-approved hover:bg-status-approved/20">
                  <CheckCircle2 className="h-3 w-3" /> Mark Action Done
                </button>
              )}
            </div>

            {/* AI result */}
            {(aiLoading || ai) && (
              <div className="rounded-lg border border-gold/40 bg-gold/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <Sparkles className="h-4 w-4" /> AI Analysis
                </div>
                {aiLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</div>}
                {ai && (
                  <>
                    <AISection label="Status" body={ai.summary} />
                    <AISection label="Risks" body={ai.risks} />
                    <AISection label="Recommended Action" body={ai.next_action} />
                  </>
                )}
              </div>
            )}

            {/* Activity log */}
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity Log</div>
              <div className="space-y-2 mb-3">
                {activity.length === 0 && <div className="text-xs text-muted-foreground italic">No activity logged yet</div>}
                {activity.map((a) => (
                  <div key={a.id} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <div className="text-sm whitespace-pre-wrap">{a.note}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {a.created_by} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm" />
                <button onClick={() => note.trim() && addNote.mutate(note.trim())} disabled={!note.trim() || addNote.isPending} className="rounded-md bg-navy px-3 py-2 text-xs font-medium text-white disabled:opacity-60">
                  {addNote.isPending ? "…" : "Add"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={save} className="flex-1 flex flex-col">
            <div className="flex-1 space-y-3 p-5">
              {[["Investment name","name","text"],["Fund / Entity","fund_entity","text"],["Amount committed","amount_committed","text"],["Contact","contact","text"],["Next action","next_action","text"],["Drive folder link","drive_folder_link","text"]].map(([label, field, type]) => (
                <label key={field} className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
                  <input type={type} value={(form as any)[field] ?? ""} onChange={(e) => setForm({ ...form, [field]: e.target.value || null })} className="inp" /></label>
              ))}
              <div className="grid grid-cols-2 gap-3">
                {[["Holding entity","holding_entity",["Aquila Capital Partners LLC","Columbia Private Trust IRA","Pacific Premier Trust IRA","Personal"]],["Category","category",["FinTech","InsurTech","AI","BioTech","DTC","Energy","Fund / LP","Media & Entertainment","Real Estate","Other"]],["Status","status",["Active","Pending","Closed","Exited"]],["Capital call","capital_call_status",["Funded","Pending","Past Due","N/A"]],["DocuSign","docsign_status",["Signed","Pending","Not Sent","N/A"]]].map(([label, field, opts]) => (
                  <label key={field as string} className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">{label as string}</span>
                    <select value={(form as any)[field as string] ?? ""} onChange={(e) => setForm({ ...form, [field as string]: e.target.value })} className="inp">
                      <option value="">—</option>
                      {(opts as string[]).map((o) => <option key={o}>{o}</option>)}
                    </select></label>
                ))}
                <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Next action due</span>
                  <input type="date" value={form.next_action_due ?? ""} onChange={(e) => setForm({ ...form, next_action_due: e.target.value || null })} className="inp" /></label>
              </div>
              <label className="block"><span className="mb-1 block text-xs font-medium text-muted-foreground">Notes</span>
                <textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" /></label>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-5 py-4">
              <button type="button" onClick={() => investment ? setEditing(false) : onClose()} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function AISection({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-navy mb-0.5">{label}</div>
      <div className="text-sm leading-relaxed">{body}</div>
    </div>
  );
}

function PortfolioAIModal({ investments, onClose }: { investments: Investment[]; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio-ai", investments.length],
    queryFn: async () => {
      const summary = investments.map((i) => ({
        name: i.name, status: i.status, capital_call_status: i.capital_call_status,
        docsign_status: i.docsign_status, next_action: i.next_action, next_action_due: i.next_action_due,
      }));
      const { data, error } = await supabase.functions.invoke("investment-ai", { body: { mode: "portfolio", data: summary } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error ?? "AI request failed");
      return data.result as { bullets: string[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border bg-navy px-5 py-4 rounded-t-lg">
          <div className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="text-base font-semibold">AI Portfolio Summary</h3>
          </div>
          <button onClick={onClose} className="rounded p-1 text-white/80 hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 min-h-40">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing {investments.length} investments…
            </div>
          )}
          {error && <div className="text-sm text-destructive">{(error as Error).message}</div>}
          {data?.bullets && (
            <ul className="space-y-3">
              {data.bullets.map((b, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <span className="text-sm leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
