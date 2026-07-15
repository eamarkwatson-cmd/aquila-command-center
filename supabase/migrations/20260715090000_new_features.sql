-- ================================================================
-- July 15, 2026 — New Features Migration
-- Travel Bookings + Contacts + SOD Log tables
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TRAVEL BOOKINGS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_name       text NOT NULL,
  booking_type    text NOT NULL CHECK (booking_type IN ('flight','hotel','restaurant','car_rental','other')),
  name            text NOT NULL,
  confirmation_number text,
  event_date      date,
  event_datetime  timestamptz,
  end_date        date,
  location        text,
  address         text,
  guests          integer DEFAULT 1,
  total_cost      numeric,
  cancellation_deadline timestamptz,
  cancellation_policy   text,
  status          text DEFAULT 'Confirmed' CHECK (status IN ('Confirmed','Pending','Cancelled')),
  notes           text,
  contact_name    text,
  contact_phone   text,
  booked_by       text DEFAULT 'Kennedy',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.travel_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_travel" ON public.travel_bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- 2. CONTACTS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contacts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  role                  text,
  company               text,
  email                 text,
  phone                 text,
  category              text DEFAULT 'Other' CHECK (category IN ('Investment','Legal','EA/Operations','Portfolio Company','Personal','Financial','Other')),
  relationship_context  text,
  investment_connection text,
  last_contact_date     date,
  notes                 text,
  priority              text DEFAULT 'Normal' CHECK (priority IN ('High','Normal')),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_contacts" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- 3. SOD LOG
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sod_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date          date NOT NULL DEFAULT CURRENT_DATE,
  whatsapp_text text,
  slack_text    text,
  generated_by  text DEFAULT 'AI',
  sent          boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.sod_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all_sod" ON public.sod_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------
-- 4. SEED — TRAVEL BOOKINGS (current trips)
-- ----------------------------------------------------------------
INSERT INTO public.travel_bookings (trip_name, booking_type, name, confirmation_number, event_date, end_date, location, address, guests, total_cost, cancellation_deadline, cancellation_policy, status, notes, contact_phone, booked_by) VALUES

-- Philadelphia Trip
('Philadelphia + Princeton Jul 16–18', 'flight', 'PVD → Philadelphia (PHL) — American Airlines', NULL, '2026-07-16', '2026-07-16', 'Philadelphia International Airport', 'PHL', 1, NULL, NULL, 'Non-refundable', 'Confirmed', 'Non-stop. Departure 2:59 PM PVD. Mark to confirm exact flight number. Self-drive rental car Fri Philadelphia → Princeton.', NULL, 'Mark'),

('Philadelphia + Princeton Jul 16–18', 'hotel', 'The Study at University City', '8616960121-1', '2026-07-16', '2026-07-17', 'University City, Philadelphia', '20 S 33rd Street, Philadelphia, PA 19104', 2, 339.00, '2026-07-15 15:00:00-04', 'Free cancellation up to 24hrs before check-in. Within 24hrs = one night rate + taxes.', 'Confirmed', 'Room: Two Double Beds. Guests: Mark + son Marco. Check-in 3:00 PM, check-out 12:00 PM.', '+1-215-387-1400', 'Kennedy'),

('Philadelphia + Princeton Jul 16–18', 'restaurant', 'Dizengoff — Philadelphia Dinner', NULL, '2026-07-16', NULL, 'Rittenhouse, Philadelphia', '1625 Sansom St, Philadelphia, PA 19103', 2, NULL, NULL, 'Call to cancel', 'Confirmed', 'Reservation under Mark Watson. 7:00 PM Thursday July 16. No confirmation number. Michelin Bib Gourmand — Israeli cuisine.', '+1-215-867-8181', 'Kennedy'),

('Philadelphia + Princeton Jul 16–18', 'hotel', 'The Peacock Inn — Princeton', '48678211', '2026-07-17', '2026-07-18', 'Princeton, NJ', '20 Bayard Lane, Princeton, NJ 08540', 2, 433.67, '2026-07-14 16:00:00-04', 'Free cancellation until Jul 14 at 4pm. Full stay charged after.', 'Confirmed', 'Room: Queen bed + extra bed (confirmed with hotel). Guests: Mark + son Marco. Check-in 4:00 PM Friday, check-out 11:00 AM Saturday. Mark self-drives Philadelphia → Princeton Friday, Princeton → Newport Saturday.', '+1-609-924-1707', 'Kennedy'),

-- Eaglebrook Trip
('Eaglebrook Trustee Meeting Jul 28–29', 'hotel', 'Shelburne Springs — Suite 3 + Suite 2', 'PENDING', '2026-07-28', '2026-07-29', 'Shelburne Falls, MA', '904 Mohawk Trail, Shelburne Falls, MA 01370', 1, 725.00, '2026-07-18 00:00:00-04', '$50 cancellation fee before July 18. No refunds after July 18.', 'Pending', 'Suite 3 (Rooftop Queen, $375) = Mark previous room. Suite 2 (Panoramic King, $350) = second guest. Breakfast included. Awaiting Mark confirmation to book. Contact: David at Shelburne Springs.', NULL, 'Kennedy'),

('Eaglebrook Trustee Meeting Jul 28–29', 'other', 'Eaglebrook Long-Range Planning Meeting', NULL, '2026-07-28', '2026-07-29', 'Eaglebrook School, Deerfield, MA', '271 Pine Nook Rd, Deerfield, MA 01342', 1, NULL, NULL, NULL, 'Confirmed', 'Tue Jul 28: Cocktails and dinner 6:15 PM. Wed Jul 29: Breakfast 7:30 AM, sessions 8:30 AM–2:00 PM. Mark is a Trustee. RSVP to Sharon Calvo (sharon.calvo@eaglebrook.org, 413-774-9132). Carpool with Doug Brad from Newport (text to be sent by Mark).', '+1-413-774-9132', 'Kennedy');

-- ----------------------------------------------------------------
-- 5. SEED — CONTACTS
-- ----------------------------------------------------------------
INSERT INTO public.contacts (name, role, company, email, phone, category, relationship_context, investment_connection, priority) VALUES

('Teddy Marks', 'VP', 'Columbia Private Trust', 'TeddyMarks@columbiaprivatetrust.com', NULL, 'Financial', 'Manages Mark''s IRA investments at Columbia Private Trust. Primary contact for Kenetik, 021T Capital, and other Columbia-held investments.', 'Kenetik, 021T Capital, TBC', 'High'),

('Nora Wang', 'Fund Operations', 'UpMarket', 'nora.wang@upmarket.co', '+1-888-248-7658', 'Investment', 'UpMarket Fund Ops. Handles account activation documents and investment portal access. Requested formation cert + proof of address for Aquila Capital Partners LLC account activation.', 'Kraken Co-Investment Fund I, Anduril Pre-IPO Fund III, SPX management fees', 'High'),

('Devon Triplett', 'Fund Manager', '021T Capital', 'devon@021t.vc', NULL, 'Investment', '021T Capital fund manager. Active investment relationship. ERISA correction completed May 2026.', '021T Capital Fund I', 'High'),

('Bobbi Milliken', 'Paralegal Specialist — Investment Funds', 'Cooley LLP', 'bmilliken@cooley.com', '+1-703-456-8140', 'Legal', 'Cooley attorney handling 021T Capital subscription docs and ERISA correction. ERISA correction confirmed complete May 18, 2026.', '021T Capital Fund I', 'Normal'),

('Mark Cabato', 'CEO', 'Immunis Biomedical', 'Mark@immunisbiomedical.com', NULL, 'Portfolio Company', 'Immunis Biomedical CEO. Direct SAFE investment $500K (June 15 deadline passed, SimplyAgree docs never received — status unclear). Also referred Mark to Imagine SPV 2.', 'Immunis Biomedical SAFE $500K', 'High'),

('Darshana Revankar', 'Head of Process Operations', 'Imagine Global', 'darshana@imagineglobal.io', NULL, 'Investment', 'Head of Process Operations at Imagine Global. Sent Imagine SPV 2 dataroom link July 9: https://imagine-global.docsend.com/view/s/kc5m2egn4u76iitf', 'Imagine SPV 2', 'Normal'),

('Ani Chahal Honan', 'Managing Partner', 'Imagine Global', 'Ani@imagineglobal.io', NULL, 'Investment', 'Managing Partner, Imagine Global. Runs Imagine SPV 2 (syndicated SPV investing in Immunis). A360 Patron connection with Mark Cabato.', 'Imagine SPV 2', 'Normal'),

('Matt Weber', 'VP', 'Sage Venture Partners', 'mweber@sagevp.com', NULL, 'Investment', 'North Run SOF and Barefoot Scientist contact. Mark already invested in North Run SOF (Pacific Premier Trust IRA) — received distribution June 11, 2026. TWG/Progeny Plus LLC transaction also active.', 'North Run SOF, Barefoot Scientist, Progeny Plus LLC', 'Normal'),

('Shourya Wardhan', 'Associate', 'Setter Capital', 'shourya@settercap.com', NULL, 'Investment', 'LP liquidity + primary capital services. 2nd follow-up July 10, still no response from Mark. Decision pending: engage or decline.', 'Pending — LP liquidity offer', 'Normal'),

('Jamie Crystal', 'CEO & Co-Founder', 'MIC Global', 'Jamie.Crystal@MICGlobal.com', '+1-917-476-5823', 'Portfolio Company', 'MIC Global — AI-enabled MGU and Lloyd''s Coverholder specializing in embedded income protection globally. Met with Mark July 14, 2026. MiIncome product covers short-term income loss.', 'Potential investment — MIC Global', 'High'),

('Luke Fishman', 'Attorney', 'Sheppard Mullin', NULL, NULL, 'Legal', 'Sheppard Mullin attorney handling Immunis Biomedical SAFE documentation via SimplyAgree.', 'Immunis Biomedical SAFE', 'Normal'),

('Estella', 'Bookkeeper', 'Abaci ASC', 'ESTELLA@abaci-asc.com', NULL, 'EA/Operations', 'Mark''s bookkeeper at Abaci ASC, San Antonio. watsonlife333@gmail.com also used. Sent SAWS utility bill July 14 for UpMarket proof of address.', 'UpMarket account activation', 'Normal'),

('Sarah Powell', 'CPA', 'MyCPA', 'sarahp@mysacpa.com', NULL, 'Financial', 'Mark''s accountant. SafeSend 2023 and 2024 tax returns pending her clearance before Mark can e-sign. Mark to call July 15.', 'Tax returns 2023 & 2024', 'High'),

('Sharon Calvo', 'Head of School''s Executive Assistant', 'Eaglebrook School', 'sharon.calvo@eaglebrook.org', '+1-413-774-9132', 'Personal', 'Eaglebrook School trustee meeting coordinator. Awaiting Mark''s RSVP for July 28-29 Long-Range Planning Meeting.', NULL, 'Normal'),

('Whitney Simon', 'Executive Director', 'Storm Trysail Club', 'execdirector@stormtrysail.org', '+1-917-450-7547', 'Personal', 'STC Executive Director. Emailed July 14 re: unpaid initiation fee and 2026 dues. Mark not technically a member until paid. Statement link sent to inbox.', NULL, 'Normal'),

('Frazer Anderson', NULL, 'Link Ventures', NULL, NULL, 'Investment', 'Link Ventures contact. Introduced Mark to Ashwin Agarwal (Advocate) July 14, 2026. Context: bootstrapping datasets for hyperscale datacenter-oriented MGA.', 'Link Ventures portfolio, Advocate', 'Normal'),

('Ashwin Agarwal', 'CEO & Co-Founder', 'Advocate', NULL, '+1-650-248-7332', 'Portfolio Company', 'CEO of Advocate (tryadvocate.com) — tech-enabled insurance services. Frazer Anderson intro July 14. Ashwin replied same day wanting to meet in NYC for lunch or coffee.', 'Potential investment — Advocate', 'High');

