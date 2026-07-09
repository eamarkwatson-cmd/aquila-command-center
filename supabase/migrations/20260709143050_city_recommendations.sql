-- LinkedIn post metadata table
create table if not exists public.linkedin_post_metadata (
  notion_page_id text primary key,
  posted_at timestamptz,
  linkedin_post_url text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz default now()
);
alter table public.linkedin_post_metadata enable row level security;
create policy "auth all linkedin_post_metadata" on public.linkedin_post_metadata
  for all to authenticated using (true) with check (true);

-- City recommendations table
create table if not exists public.city_recommendations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  region text,
  category text not null,
  name text not null,
  address text,
  phone text,
  booking_url text,
  detail text,
  best_for text,
  created_at timestamptz default now()
);
alter table public.city_recommendations enable row level security;
create policy "auth all city_recommendations" on public.city_recommendations
  for all to authenticated using (true) with check (true);

-- Planned items table
create table if not exists public.planned_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid references public.city_recommendations(id),
  label text not null,
  detail text,
  city text,
  planned_for date,
  created_by text,
  created_at timestamptz default now()
);
alter table public.planned_items enable row level security;
create policy "auth all planned_items" on public.planned_items
  for all to authenticated using (true) with check (true);

-- Seed city recommendations
insert into public.city_recommendations (city, region, category, name, address, phone, booking_url, detail, best_for) values
-- Newport / Rhode Island
('Newport', 'Rhode Island', 'Golf', 'Newport National Golf Club', '324 mitchell''s ln, Middletown RI', '(401) 848-9690', 'https://newportnational.com', 'Book 5–7 days ahead. Premium public course with ocean views.', 'Morning round before meetings'),
('Newport', 'Rhode Island', 'Sailing / Yacht Racing', 'Sail Newport', 'Fort Adams State Park, Newport RI', '(401) 846-1983', 'https://sailnewport.org', 'Yacht charter and racing. Check race schedule on website.', 'Weekend sailing and yacht racing'),
('Newport', 'Rhode Island', 'Tennis', 'Newport Athletic Club', '550 Thames St, Newport RI', '(401) 849-5900', null, 'Call ahead for court availability.', 'Quick game between calls'),
('Newport', 'Rhode Island', 'Dinner / Client Dinner', 'The Vanderbilt', '41 Mary St, Newport RI', '(401) 846-6200', 'https://resy.com/cities/newpri/the-vanderbilt', 'Reserve 48–72hrs ahead. Elegant Newport dining.', 'Client dinner, celebration'),
('Newport', 'Rhode Island', 'Dinner / Client Dinner', 'Castle Hill Inn', '590 Ocean Dr, Newport RI', '(401) 849-3800', 'https://www.castlehillinn.com', 'Ocean views, classic New England. Reserve well ahead.', 'Special occasion, client dinner'),
('Newport', 'Rhode Island', 'Hotel / Meeting Base', 'The Vanderbilt Auberge', '41 Mary St, Newport RI', '(401) 846-6200', 'https://aubergeresorts.com/thevanderbilt', 'Auberge member hotel. Quiet and premium.', 'Hosting guests, overnight stays'),
-- Washington DC / Georgetown
('Washington DC', 'DC / Georgetown', 'Hotel / Meeting Base', 'Ritz-Carlton Georgetown', '3100 South St NW, Washington DC', '(202) 912-4100', 'https://www.ritzcarlton.com/en/hotels/washington-dc/georgetown', 'Mark''s preferred DC hotel. Confirmation #81683954.', 'DC trips, client meetings'),
('Washington DC', 'DC / Georgetown', 'Dinner / Client Dinner', 'Fiola Mare', '3050 K St NW, Washington DC', '(202) 628-0065', 'https://resy.com/cities/was/fiola-mare', 'Georgetown waterfront. Seafood. Reservation under Cristina Yacobucci July 9.', 'Client dinner, celebration'),
('Washington DC', 'DC / Georgetown', 'Dinner / Client Dinner', 'Fiola', '601 Pennsylvania Ave NW, Washington DC', '(202) 628-2888', 'https://resy.com/cities/was/fiola', 'Upscale Italian. Reserve ahead.', 'Client dinner'),
('Washington DC', 'DC / Georgetown', 'Golf', 'Army Navy Country Club', '1700 Army Navy Dr, Arlington VA', '(703) 521-6400', null, 'Member guest play. Arrange through member contact.', 'Golf with clients or partners'),
-- Austin / Texas
('Austin', 'Texas', 'Golf', 'Austin Country Club', '4408 Long Champ Dr, Austin TX', '(512) 328-0090', null, 'Tee times book 5 days ahead. Members and guests.', 'Morning round, client golf'),
('Austin', 'Texas', 'Tennis', 'Austin Tennis Academy', '7800 Shoal Creek Blvd, Austin TX', '(512) 477-7773', null, 'Court rental and lessons available.', 'Quick game, fitness'),
('Austin', 'Texas', 'Dinner / Client Dinner', 'Uchi', '801 S Lamar Blvd, Austin TX', null, 'https://resy.com/cities/aus/uchi', 'Reserve 2–3 days ahead. Japanese cuisine. Mark''s favorite.', 'Client dinner, date night'),
('Austin', 'Texas', 'Dinner / Client Dinner', 'Comedor', '501 Colorado St, Austin TX', null, 'https://resy.com/cities/aus/comedor', 'Modern Mexican. Downtown Austin.', 'Casual client dinner'),
-- Boston / Cambridge
('Boston', 'Massachusetts', 'Dinner / Client Dinner', 'Harvest', '44 Brattle St, Cambridge MA', '(617) 868-2255', 'https://www.opentable.com/harvest', 'New American. Cambridge. Reserve ahead.', 'Client dinner near Harvard'),
('Boston', 'Massachusetts', 'Hotel / Meeting Base', 'The Charles Hotel', '1 Bennett St, Cambridge MA', '(617) 864-1200', 'https://www.charleshotel.com', 'Mark''s Cambridge base. Amex FHR property. Two beds available.', 'Harvard visits, Boston meetings'),
('Boston', 'Massachusetts', 'Tennis', 'Longwood Cricket Club', '564 Hammond St, Chestnut Hill MA', '(617) 731-2900', null, 'Historic club. Guest play with member.', 'Tennis with Boston contacts'),
-- New York
('New York', 'New York', 'Dinner / Client Dinner', 'Le Bernardin', '155 W 51st St, New York NY', '(212) 554-1515', 'https://www.le-bernardin.com', 'Michelin three-star seafood. Reserve ahead.', 'Major client dinner'),
('New York', 'New York', 'Golf', 'Winged Foot Golf Club', 'Mamaroneck NY', '(914) 698-8400', null, 'Arrange through member contact.', 'Client golf near NYC'),
-- Geneva / Switzerland
('Geneva', 'Switzerland', 'Golf', 'Golf Club de Genève', 'Route de la Capite 70, Cologny', '+41 22 707 48 00', 'https://gcgeneve.ch', 'Guest play with member.', 'Geneva golf'),
('Geneva', 'Switzerland', 'Sailing / Yacht Racing', 'Société Nautique de Genève', 'Port Noir, Geneva', null, 'https://www.sng.ch', 'Lake Geneva sailing and racing.', 'Sailing on Lake Geneva'),
('Geneva', 'Switzerland', 'Dinner / Client Dinner', 'Le Chat-Botté', 'Quai du Mont-Blanc 13, Geneva', '+41 22 716 69 20', 'https://www.beau-rivage.ch/en/dining/le-chat-botte', 'Fine dining with lake views. Beau-Rivage hotel.', 'Client dinner, celebration'),
-- London
('London', 'United Kingdom', 'Golf', 'Wentworth Club', 'Virginia Water, Surrey', '+44 1344 842201', 'https://wentworth.com', 'Guest play. One of England''s top courses.', 'London golf'),
('London', 'United Kingdom', 'Tennis', 'Queen''s Club', 'Palliser Rd, West Kensington', '+44 20 7385 3421', null, 'Guest play with member.', 'London tennis'),
('London', 'United Kingdom', 'Dinner / Client Dinner', 'Scott''s Mayfair', '20 Mount St, Mayfair', '+44 20 7495 7309', 'https://www.opentable.co.uk/scotts-restaurant', 'Classic seafood. Book ahead.', 'London client dinner'),
-- Paris
('Paris', 'France', 'Golf', 'Golf National', '2 Ave du Golf, Guyancourt', '+33 1 30 43 36 00', 'https://www.golf-national.com', 'Home of the Ryder Cup. Visitor rounds available.', 'Paris golf'),
('Paris', 'France', 'Dinner / Client Dinner', 'Taillevent', '15 Rue Lamennais, Paris 8th', '+33 1 44 95 15 01', 'https://www.taillevent.com', 'Classic French fine dining. Reserve ahead.', 'Paris client dinner')
on conflict do nothing;
