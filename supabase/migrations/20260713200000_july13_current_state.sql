-- ============================================================
-- July 13, 2026 — Current State Migration
-- Delegations, app settings, Philadelphia + Princeton data
-- ============================================================

-- ----------------------------------------------------------------
-- 1. APP SETTINGS — emails cleared count + Mark's location
-- ----------------------------------------------------------------
INSERT INTO public.app_settings (key, value)
VALUES
  ('emails_cleared', '14771'),
  ('mark_location',  'Newport')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ----------------------------------------------------------------
-- 2. DELEGATIONS — current task list as of July 13, 2026
--    Clear stale placeholder rows first, then insert current state
-- ----------------------------------------------------------------
DELETE FROM public.delegations
WHERE title IN (
  'SafeSend 2023 & 2024 — e-sign tax returns',
  'Delaware Certificate of Good Standing',
  'Kraken + SPX management fees — wire via UpMarket',
  'Immunis direct SAFE ($500K) — confirm allocation status',
  'Imagine SPV 2 dataroom — review and decide',
  'Setter Capital — engage or decline',
  '021T Capital ERISA correction — confirm Vanilla platform',
  'North Run SOF subscription docs',
  'UpMarket DocuSign — monitoring',
  'Aeterna DocuSign — monitoring',
  'Clearway Capital Fund — June 2026 performance review',
  'GLO Pharma / Ourself — confirm holding and trust',
  'Email Estella — proof of address for UpMarket',
  'Upload formation docs to UpMarket portal',
  'Peacock Inn — confirm extra bed',
  'Book Philadelphia dinner',
  'Book Princeton dinner',
  'UpMarket portal login — get from Mark',
  'Mark restaurant pick — Philadelphia + Princeton',
  'Philadelphia + Princeton trip — flights and hotels',
  'Section AI demo prep'
);

INSERT INTO public.delegations
  (id, title, description, owner, status, priority, source, notes, due_date)
VALUES

-- ── MARK TO ACTION ──────────────────────────────────────────
(
  gen_random_uuid(),
  'SafeSend 2023 & 2024 — e-sign tax returns',
  'Second automated reminder received July 13. 2023 and 2024 returns both awaiting Mark''s e-signature in SafeSend portal.',
  'Mark', 'Overdue', 'High', 'Email',
  '2nd system reminder in on Jul 13. No further action from Kennedy needed — Mark must log in and sign.',
  '2026-07-13'
),
(
  gen_random_uuid(),
  'Kraken + SPX management fees — wire via UpMarket',
  'Annual management fees outstanding. Wire blocked pending UpMarket account activation (formation docs + proof of address). July 31 liquidation risk on Kraken Co-Investment Fund I if unpaid.',
  'Mark', 'Overdue', 'High', 'Email',
  'UpMarket expense call due Jan 31 2025 still outstanding. Liquidation warning received Jul 13. Account activation in progress — Kennedy uploading docs.',
  '2026-07-31'
),
(
  gen_random_uuid(),
  'Immunis direct SAFE ($500K) — confirm allocation status',
  'June 15 closing deadline passed without SimplyAgree docs arriving. Mark emailed Cabato July 9. Cabato responded re: Imagine SPV 2 but did not address direct SAFE status.',
  'Mark', 'Waiting', 'High', 'Email',
  'Mark to confirm with Mark Cabato (Mark@immunisbiomedical.com) whether the $500K direct allocation is still open or has lapsed. Separate from Imagine SPV 2.',
  '2026-07-18'
),
(
  gen_random_uuid(),
  'Imagine SPV 2 dataroom — review and decide',
  'Darshana Revankar (Imagine Global) sent dataroom link July 9. Separate from direct Immunis SAFE. Syndicated SPV also investing in Immunis. Independent investment decision.',
  'Mark', 'Waiting', 'Medium', 'Email',
  'Dataroom: https://imagine-global.docsend.com/view/s/kc5m2egn4u76iitf — Forwarded to top of inbox Jul 13. Mark to review and decide independently.',
  '2026-07-25'
),
(
  gen_random_uuid(),
  'Setter Capital — engage or decline',
  'Shourya Wardhan (shourya@settercap.com) — LP liquidity + primary capital services. 2nd follow-up July 10. Originally contacted June 16. No response from Mark.',
  'Mark', 'Waiting', 'Medium', 'Email',
  'Mark to decide: engage or decline. Kennedy can draft reply once direction confirmed.',
  '2026-07-18'
),
(
  gen_random_uuid(),
  'Restaurant pick — Philadelphia + Princeton',
  'Michelin Bib Gourmand options sent to Mark via WhatsApp July 13. Philadelphia: Dizengoff, Royal Sushi, Pizzeria Beddia. Princeton: Elements, Mistral. Mark to text preference so Kennedy can book.',
  'Mark', 'Waiting', 'Medium', 'WhatsApp',
  'Mark driving to Brown University — unavailable ~45 min from 4:12pm. Will text preference when free.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'UpMarket portal login — send to Kennedy',
  'Kennedy needs Mark''s UpMarket login credentials to upload formation docs and complete account activation. Mark said he could not find them on July 13 call and would call back.',
  'Mark', 'Waiting', 'High', 'Call',
  'Mark to locate UpMarket credentials and send to Kennedy. Urgent — needed to complete account activation before July 31 deadline.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'Clearway Capital Fund — June 2026 performance review',
  'PDF performance report received July 10 from investors@clearwaycp.com. Frankfurt-based fund. Not in documented trust holdings — confirm active holding and which trust.',
  'Mark', 'Waiting', 'Low', 'Email',
  'Mark to confirm: is this an active holding and which trust (Columbia or Pacific Premier)?',
  NULL
),
(
  gen_random_uuid(),
  'GLO Pharma / Ourself — confirm holding and trust',
  'Q2 2026 investor update from Jim Hartman (jhartman@ourself.com) received July 12. Not in documented trust holdings.',
  'Mark', 'Waiting', 'Low', 'Email',
  'Mark to confirm: active holding? Which trust?',
  NULL
),

-- ── KENNEDY TO ACTION ────────────────────────────────────────
(
  gen_random_uuid(),
  'Email Estella — proof of address for UpMarket',
  'Mark instructed Kennedy on July 13 call to email Estella at watsonlife@gmail.com requesting utility bill or bank statement (last 3 months) for UpMarket account activation.',
  'Kennedy', 'In Progress', 'High', 'Call',
  'Email draft prepared. Send to watsonlife@gmail.com. Request utility bill or bank statement dated within 3 months.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'Upload formation docs to UpMarket portal',
  'Kreager Mitchell formation docs (Certificate of Formation + Operating Agreement) found in Mark inbox from August 2025. Upload to: upmarket.co → My Investments → Pending Investment → Edit Application Document. Needs Mark''s portal login first.',
  'Kennedy', 'Waiting', 'High', 'Email',
  'Blocked on: (1) proof of address from Estella (2) UpMarket portal login from Mark. Upload path: upmarket.co → My Investments → My Portfolio → Pending Investment → Edit Application Document. Do NOT email — portal upload only.',
  '2026-07-15'
),
(
  gen_random_uuid(),
  'Peacock Inn — confirm extra bed',
  'Extra bed added as special request in booking (Conf #48678211) but not guaranteed. Call to confirm hotel has actioned it.',
  'Kennedy', 'Not Started', 'Medium', 'Call',
  'Call +1 609-924-1707. Confirm extra bed for Fri Jul 17 check-in. Room: Queen + extra bed, 2 guests (Mark + son Marco). ⚠️ Free cancellation deadline: Jul 14 at 4pm local.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'Book Philadelphia dinner',
  'Michelin Bib Gourmand options sent to Mark. Awaiting his preference. Options: Dizengoff (Israeli, closest to hotel), Royal Sushi & Izakaya (Japanese), Pizzeria Beddia (pizza, South Philly). Dinner Thu Jul 17.',
  'Kennedy', 'Waiting', 'Medium', 'WhatsApp',
  'Waiting on Mark to text preference. Book for 2 (Mark + son Marco) for Thursday July 17 dinner. The Study at Penn is in University City — 10-15 min from all options.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'Book Princeton dinner',
  'Princeton not in Michelin Guide. Top options: Elements (fine dining tasting menu, most acclaimed in Princeton) or Mistral (upscale casual farm-to-table). Dinner Fri Jul 18.',
  'Kennedy', 'Waiting', 'Medium', 'WhatsApp',
  'Waiting on Mark to text preference. Book for 2 (Mark + son Marco) for Friday July 18 dinner. Both restaurants near Princeton campus / Peacock Inn.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  '021T Capital ERISA correction — confirm Vanilla platform',
  'Teddy Marks (Columbia Private Trust) confirmed the Columbia side is done. Need to email Bobbi Milliken at Cooley to confirm correction completed on Vanilla platform.',
  'Kennedy', 'Not Started', 'Medium', 'Email',
  'Email Bobbi Milliken: bmilliken@cooley.com. Ask to confirm 021T Capital ERISA correction completed on Vanilla platform. Mark Watson account.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'North Run SOF subscription docs — follow up Matt Weber',
  'Subscription documents still outstanding. Matt Weber''s July 7 email was about Barefoot Scientist (different deal). No update on North Run SOF specifically.',
  'Kennedy', 'In Progress', 'Medium', 'Email',
  'Follow up: Matt Weber mweber@sagevp.com. Reference North Run SOF subscription documents specifically — not the Barefoot Scientist thread.',
  '2026-07-14'
),
(
  gen_random_uuid(),
  'UpMarket DocuSign — monitoring',
  'DocuSign for UpMarket investment still outstanding. No new docs in inbox as of July 13.',
  'Kennedy', 'In Progress', 'Low', 'Email',
  'Monitor inbox for DocuSign from UpMarket. Flag immediately when received.',
  NULL
),
(
  gen_random_uuid(),
  'Aeterna DocuSign — monitoring',
  'Aeterna DocuSign still outstanding. No new docs in inbox as of July 13.',
  'Kennedy', 'In Progress', 'Low', 'Email',
  'Monitor inbox for DocuSign from Aeterna. Flag immediately when received.',
  NULL
),

-- ── COMPLETED TODAY ──────────────────────────────────────────
(
  gen_random_uuid(),
  'Philadelphia + Princeton trip — flights and hotels booked',
  'Flight PVD→PHL July 16 (non-stop, 2:59pm, American Airlines). The Study at Penn: Conf #8616960121-1, Thu Jul 16 check-in, Two Double Beds, $339 total. The Peacock Inn: Conf #48678211, Fri Jul 17 check-in, Queen + extra bed, $433.67 total.',
  'Kennedy', 'Done', 'High', 'Call',
  'Study cancellation: free until Jul 15 3pm. Peacock cancellation: FREE UNTIL JUL 14 4PM — urgent. Mark driving PHL→Princeton Fri, Princeton→Newport Sat (self-drive, own rental).',
  '2026-07-16'
),
(
  gen_random_uuid(),
  'Delaware Certificate — confirmed NOT needed for UpMarket',
  'Resolved July 13. UpMarket (Nora Wang, June 25 email) asked for formation cert OR operating agreement — NOT Certificate of Good Standing. Both found in Kreager Mitchell email (Aug 2025). eCorp order was a ghost task.',
  'Kennedy', 'Done', 'High', 'Email',
  'Formation docs available: Certificate of Formation (11-07-12) and Signed Operating Agreement — both in mew@aquilavc.com inbox from Kreager Mitchell Aug 2025. Delaware cert only ever needed for Kenetik/Columbia Private Trust (sent Jun 29, confirmed by Teddy).',
  '2026-07-13'
),
(
  gen_random_uuid(),
  'Section AI demo',
  'Section AI demo confirmed for Monday July 21.',
  'Kennedy', 'Not Started', 'Medium', 'Email',
  'Demo on Monday July 21. Prep and confirm details ahead of time.',
  '2026-07-21'
);

-- ----------------------------------------------------------------
-- 3. CITY RECOMMENDATIONS — Philadelphia + Princeton
-- ----------------------------------------------------------------
INSERT INTO public.city_recommendations
  (city, region, category, name, address, phone, booking_url, detail, best_for)
VALUES

-- Philadelphia — Michelin Bib Gourmand
('Philadelphia', 'Pennsylvania', 'Dinner / Client Dinner', 'Dizengoff', '1625 Sansom St, Philadelphia, PA 19103', NULL, 'https://www.dizengoffhummus.com', 'Michael Solomonov''s vibrant Israeli spot. Legendary hummus and fresh-baked pita. Closest Michelin Bib Gourmand to The Study at Penn. Casual, fast, excellent.', 'Casual dinner near University City'),
('Philadelphia', 'Pennsylvania', 'Dinner / Client Dinner', 'Royal Sushi & Izakaya', '780 S 2nd St, Philadelphia, PA 19147', NULL, 'https://royalsushiizakaya.com', 'Michelin Bib Gourmand. High-energy Japanese pub. World-class omakase counter plus comfort izakaya plates. Book ahead — small room.', 'Dad and son dinner, sushi'),
('Philadelphia', 'Pennsylvania', 'Dinner / Client Dinner', 'Pizzeria Beddia', '1313 N Lee St, Philadelphia, PA 19122', NULL, 'https://pizzeriabeddia.com', 'Michelin Bib Gourmand. Widely regarded as one of the best artisanal pizzas in the country. Wood-fired, small menu, reservations essential. Fishtown neighborhood.', 'Casual pizza dinner'),
('Philadelphia', 'Pennsylvania', 'Dinner / Client Dinner', 'Friday Saturday Sunday', '261 S 21st St, Philadelphia, PA 19103', NULL, 'https://www.fridaysaturdaysunday.com', '1 Michelin Star. 8-course contemporary tasting menu. Rittenhouse Square. Black-owned, chef-owned. Spectacular if Mark wants a high-end dinner. Reserve well in advance.', 'Special occasion fine dining'),
('Philadelphia', 'Pennsylvania', 'Hotel / Meeting Base', 'The Study at University City', '20 S 33rd St, Philadelphia, PA 19104', '+1-215-387-1400', 'https://www.thestudyatuniversitycity.com', 'Mark''s booked hotel Jul 16–17. Conf #8616960121-1. Two Double Beds. $339 total. Check-in 3pm, check-out 12pm. Free cancellation until Jul 15 at 3pm.', 'Current booking Jul 16–17'),
('Philadelphia', 'Pennsylvania', 'Transport', 'SEPTA Airport Line — PHL to 30th St Station', 'PHL Airport Terminal A/B/C/D/E', NULL, NULL, 'Direct train from PHL to 30th Street Station (University City, one stop from The Study). ~25 min. $7.', 'Airport to hotel transfer'),

-- Princeton
('Princeton', 'New Jersey', 'Dinner / Client Dinner', 'Elements', '163 Bayard Ln, Princeton, NJ 08540', '+1-609-924-0078', 'https://www.elementsprinceton.com', 'Most acclaimed restaurant in Princeton. Chef Scott Anderson''s tasting menu built around foraging, local farms, and seasonal produce. Long-format tasting menu. Book ahead.', 'Fine dining, special dinner'),
('Princeton', 'New Jersey', 'Dinner / Client Dinner', 'Mistral', '66 Witherspoon St, Princeton, NJ 08542', '+1-609-688-8808', 'https://www.mistralprinceton.com', 'Sister restaurant to Elements. Upscale casual, farm-to-table small plates designed for sharing. Warm atmosphere. Great for a relaxed father-son dinner.', 'Casual upscale dinner, sharing plates'),
('Princeton', 'New Jersey', 'Hotel / Meeting Base', 'The Peacock Inn', '20 Bayard Ln, Princeton, NJ 08540', '+1-609-924-1707', 'https://www.peacockinn.com', 'Mark''s booked hotel Jul 17–18. Conf #48678211. Queen bed + extra bed (requested). $433.67 total. Check-in 4pm, check-out 11am. ⚠️ Free cancellation until Jul 14 at 4pm.', 'Current booking Jul 17–18'),
('Princeton', 'New Jersey', 'Coffee / Breakfast', 'Chez Alice', '4 Witherspoon St, Princeton, NJ 08542', NULL, NULL, 'Highly rated Princeton cafe. Near campus and Peacock Inn. Good for a morning coffee before the drive back to Newport Saturday.', 'Morning coffee before checkout'),
('Princeton', 'New Jersey', 'Transport', 'NJ Transit — Princeton Junction to NYC', 'Princeton Junction Station, NJ', NULL, 'https://www.njtransit.com', 'Take the Dinky shuttle from Princeton to Princeton Junction, then Northeast Corridor to Penn Station NYC. ~75 min total. $18.', 'Rail to New York City');

