import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X, ExternalLink, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/investments")({
  component: InvestmentsPage,
});

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
  const [selected, setSelected] = useState<Investment | null>(null);
  const [creating, setCreating] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const { data: investments = [], isLoading } = useQuery<Investment[]>({
    queryKey: ["investments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investments").select("*").order("name");
      if (error) throw error;
      return ((data ?? []) as unknown) as Investment[];
    },
  });

  useEffect(() => {
    if (!isLoading && investments.length < 10 && !seeded) {
      setSeeded(true);
      (async () => {
        const existing = new Set(investments.map((i) => i.name.toLowerCase()));
        const toInsert = ALL_INVESTMENTS.filter((i) => !existing.has(i.name.toLowerCase()));
        if (toInsert.length === 0) return;
        const { error } = await supabase.from("investments").insert(toInsert as any);
        if (error) { console.error(error); return; }
        qc.invalidateQueries({ queryKey: ["investments"] });
        toast.success(`${toInsert.length} investments loaded ✓`);
      })();
    }
  }, [isLoading, investments.length, seeded]);

  const filtered = useMemo(() => {
    let r = investments;
    if (search) r = r.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.category ?? "").toLowerCase().includes(search.toLowerCase()) || (i.notes ?? "").toLowerCase().includes(search.toLowerCase()));
    if (entityF !== "all") r = r.filter((i) => i.holding_entity === entityF);
    if (statusF !== "all") r = r.filter((i) => i.status === statusF);
    if (categoryF !== "all") r = r.filter((i) => i.category === categoryF);
    return r;
  }, [investments, search, entityF, statusF, categoryF]);

  const actionNeeded = investments.filter((i) => i.capital_call_status === "Past Due" || i.docsign_status === "Not Sent" || (i.next_action_due && new Date(i.next_action_due) <= new Date()));
  const totalCommitted = investments.filter((i) => i.amount_committed && !["TBC","N/A"].includes(i.amount_committed)).reduce((s, i) => s + (parseFloat((i.amount_committed ?? "0").replace(/[$,]/g, "")) || 0), 0);

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await supabase.from("investments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["investments"] });
    setSelected(null);
    toast.success("Deleted");
  }

  const shortEntity = (e: string | null) => (e ?? "—").replace("Aquila Capital Partners LLC","Aquila").replace("Columbia Private Trust IRA","Columbia IRA").replace("Pacific Premier Trust IRA","PPT IRA");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Investments</h1>
          <p className="text-sm text-muted-foreground">{isLoading ? "Loading…" : `${investments.length} holdings · $${(totalCommitted/1_000_000).toFixed(2)}M tracked`}</p>
        </div>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy/90">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {actionNeeded.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-5 py-3">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-destructive" /><span className="text-sm font-medium text-destructive">{actionNeeded.length} need immediate action</span></div>
          <ul className="space-y-1">
            {actionNeeded.map((i) => (
              <li key={i.id} className="text-xs text-destructive cursor-pointer hover:underline" onClick={() => setSelected(i)}>
                • {i.name} — {i.capital_call_status === "Past Due" ? "Capital call past due" : i.docsign_status === "Not Sent" ? "DocuSign not sent" : i.next_action}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {selected && <InvestmentPanel investment={selected} onClose={() => setSelected(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ["investments"] }); setSelected(null); }} onDelete={() => remove(selected.id)} />}
      {creating && <InvestmentPanel investment={null} onClose={() => setCreating(false)} onSaved={() => { qc.invalidateQueries({ queryKey: ["investments"] }); setCreating(false); }} onDelete={() => {}} />}
    </div>
  );
}

function InvestmentPanel({ investment, onClose, onSaved, onDelete }: { investment: Investment | null; onClose: () => void; onSaved: () => void; onDelete: () => void }) {
  const [form, setForm] = useState<Partial<Investment>>(investment ?? { status: "Active", capital_call_status: "N/A", docsign_status: "N/A" });
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast.error("Name required");
    setSaving(true);
    let error;
    if (investment?.id) {
      ({ error } = await supabase.from("investments").update({ ...(form as any), updated_at: new Date().toISOString() }).eq("id", investment.id));
    } else {
      ({ error } = await supabase.from("investments").insert(form as any));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(investment ? "Updated" : "Created");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-foreground/20 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="flex h-full w-full max-w-xl flex-col overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold">{investment ? investment.name : "New investment"}</h3>
          <div className="flex items-center gap-2">
            {investment?.id && <button type="button" onClick={onDelete} className="rounded-md border border-destructive/30 px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>}
            {investment?.drive_folder_link && <a href={investment.drive_folder_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-navy hover:bg-muted"><ExternalLink className="h-3 w-3" /> Drive</a>}
            <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>
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
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
