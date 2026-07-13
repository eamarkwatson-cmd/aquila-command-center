
CREATE TABLE public.city_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  region text,
  category text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  booking_url text,
  detail text,
  best_for text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_recommendations TO authenticated;
GRANT ALL ON public.city_recommendations TO service_role;
ALTER TABLE public.city_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth can read city_recommendations" ON public.city_recommendations FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth can write city_recommendations" ON public.city_recommendations FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.planned_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid REFERENCES public.city_recommendations(id) ON DELETE CASCADE,
  label text NOT NULL,
  detail text,
  city text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_items TO authenticated;
GRANT ALL ON public.planned_items TO service_role;
ALTER TABLE public.planned_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth can manage planned_items" ON public.planned_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.city_recommendations (city, region, category, name, address, phone, booking_url, detail, best_for) VALUES
-- Newport, RI
('Newport', 'Rhode Island', 'Sailing / Yacht Racing', 'New York Yacht Club - Harbour Court', 'Halidon Ave, Newport, RI', NULL, 'https://www.nyyc.org', 'Private members club with race committee support.', 'Race weeks, member hosting'),
('Newport', 'Rhode Island', 'Golf', 'Newport Country Club', '280 Harrison Ave, Newport, RI', '+1-401-846-0461', NULL, 'Historic USGA venue; introductions required.', 'Client golf with introductions'),
('Newport', 'Rhode Island', 'Hotel / Meeting Base', 'Castle Hill Inn', '590 Ocean Dr, Newport, RI', '+1-401-849-3800', 'https://www.castlehillinn.com', 'Waterfront Relais & Chateaux; quiet meeting suites.', 'Overnight + client dinner'),
('Newport', 'Rhode Island', 'Dinner / Client Dinner', 'The Clarke Cooke House', '24 Bannister''s Wharf, Newport, RI', '+1-401-849-2900', 'https://www.clarkecooke.com', 'Bannister''s Wharf; ask for the Skybar.', 'Sailing crew dinners'),

-- Washington DC / Georgetown
('Washington DC', 'Georgetown', 'Hotel / Meeting Base', 'Rosewood Washington DC', '1050 31st St NW, Washington, DC', '+1-202-617-2400', 'https://www.rosewoodhotels.com/en/washington-dc', 'Georgetown waterfront; discreet meeting rooms.', 'Multi-day DC trips'),
('Washington DC', 'Georgetown', 'Dinner / Client Dinner', 'Cafe Milano', '3251 Prospect St NW, Washington, DC', '+1-202-333-6183', 'https://www.cafemilano.com', 'Georgetown power dining room.', 'Senator / lobbyist dinners'),
('Washington DC', 'DC', 'Coffee / Breakfast', 'The Lafayette at Hay-Adams', '800 16th St NW, Washington, DC', '+1-202-638-6600', 'https://www.hayadams.com', 'Directly across from the White House.', 'Breakfast meetings'),
('Washington DC', 'DC', 'Golf', 'Congressional Country Club', '8500 River Rd, Bethesda, MD', '+1-301-469-2000', NULL, 'Member introduction required.', 'High-signal client golf'),

-- Austin
('Austin', 'Texas', 'Hotel / Meeting Base', 'Hotel Saint Cecilia', '112 Academy Dr, Austin, TX', '+1-512-852-2400', 'https://hotelsaintcecilia.com', 'South Congress bungalows and suites.', 'Discreet overnight'),
('Austin', 'Texas', 'Dinner / Client Dinner', 'Uchi', '801 S Lamar Blvd, Austin, TX', '+1-512-916-4808', 'https://uchiaustin.com', 'Book the omakase counter for founder dinners.', 'Founder / VC dinners'),
('Austin', 'Texas', 'Coffee / Breakfast', 'Jo''s Coffee - South Congress', '1300 S Congress Ave, Austin, TX', '+1-512-444-3800', NULL, 'Iconic outdoor coffee bar.', 'Casual 1:1s'),
('Austin', 'Texas', 'Flying / Aviation', 'Atlantic Aviation AUS', '4309 General Aviation Ave, Austin, TX', '+1-512-530-6900', 'https://www.atlanticaviation.com', 'Preferred FBO for private arrivals.', 'Private jet arrival'),

-- San Antonio
('San Antonio', 'Texas', 'Hotel / Meeting Base', 'Hotel Emma', '136 E Grayson St, San Antonio, TX', '+1-210-448-8300', 'https://www.thehotelemma.com', 'Pearl District; best meeting hotel in the city.', 'Multi-day San Antonio'),
('San Antonio', 'Texas', 'Dinner / Client Dinner', 'Bliss', '926 S Presa St, San Antonio, TX', '+1-210-227-2900', 'https://foodisbliss.com', 'Southtown; chef-driven, quiet room.', 'Client dinner'),
('San Antonio', 'Texas', 'Golf', 'The Dominion Country Club', '1 Dominion Dr, San Antonio, TX', '+1-210-698-1146', NULL, 'Private; member introduction required.', 'Client golf'),

-- Boston / Cambridge
('Boston', 'Massachusetts', 'Hotel / Meeting Base', 'Four Seasons Hotel One Dalton Street', '1 Dalton St, Boston, MA', '+1-617-535-8888', 'https://www.fourseasons.com/onedalton', 'Back Bay tower; quiet suites for meetings.', 'Multi-day Boston'),
('Boston', 'Massachusetts', 'Dinner / Client Dinner', 'Grill 23 & Bar', '161 Berkeley St, Boston, MA', '+1-617-542-2255', 'https://grill23.com', 'Back Bay steakhouse standard.', 'Client steakhouse dinner'),
('Cambridge', 'Massachusetts', 'Coffee / Breakfast', 'Tatte Bakery - Harvard Square', '1288 Massachusetts Ave, Cambridge, MA', NULL, 'https://tattebakery.com', 'Reliable morning meeting spot near Harvard.', 'Harvard / MIT meetings'),
('Cambridge', 'Massachusetts', 'Culture / Free Time', 'Harvard Art Museums', '32 Quincy St, Cambridge, MA', '+1-617-495-9400', 'https://harvardartmuseums.org', 'Quiet walkthrough between meetings.', 'Downtime between meetings'),

-- New York
('New York', 'NYC', 'Hotel / Meeting Base', 'The Carlyle', '35 E 76th St, New York, NY', '+1-212-744-1600', 'https://www.rosewoodhotels.com/en/the-carlyle-new-york', 'Upper East Side classic.', 'UES meetings'),
('New York', 'NYC', 'Dinner / Client Dinner', 'The Grill', '99 E 52nd St, New York, NY', '+1-212-375-9001', 'https://thegrillnewyork.com', 'Seagram Building; Midtown power dinner.', 'Midtown client dinner'),
('New York', 'NYC', 'Coffee / Breakfast', 'Sant Ambroeus - Madison Ave', '1000 Madison Ave, New York, NY', '+1-212-570-2211', 'https://www.santambroeus.com', 'Milanese breakfast bar on the UES.', 'UES breakfast'),
('New York', 'NYC', 'Fitness / Wellness', 'Equinox Hudson Yards', '35 Hudson Yards, New York, NY', '+1-212-871-9694', 'https://www.equinox.com', 'Full-club access with member pass.', 'Between meetings workout'),

-- Geneva
('Geneva', 'Switzerland', 'Hotel / Meeting Base', 'Hotel President Wilson', '47 Quai Wilson, Geneva', '+41-22-906-6666', 'https://www.hotelpresidentwilson.com', 'Lakefront; discreet meeting suites.', 'LP / family office meetings'),
('Geneva', 'Switzerland', 'Dinner / Client Dinner', 'Le Chat-Botte', '13 Quai du Mont-Blanc, Geneva', '+41-22-716-6666', 'https://www.beau-rivage.ch/en/gastronomy/le-chat-botte/', 'Beau-Rivage; classic Geneva client dinner.', 'LP dinner'),

-- London
('London', 'United Kingdom', 'Hotel / Meeting Base', 'Claridge''s', 'Brook St, Mayfair, London', '+44-20-7629-8860', 'https://www.claridges.co.uk', 'Mayfair standard.', 'London base'),
('London', 'United Kingdom', 'Dinner / Client Dinner', 'Scott''s Mayfair', '20 Mount St, Mayfair, London', '+44-20-7495-7309', 'https://scotts-restaurant.com', 'Mount Street institution.', 'Mayfair client dinner'),
('London', 'United Kingdom', 'Coffee / Breakfast', 'The Wolseley', '160 Piccadilly, London', '+44-20-7499-6996', 'https://www.thewolseley.com', 'Grand cafe; iconic breakfast room.', 'Breakfast meetings'),

-- Paris
('Paris', 'France', 'Hotel / Meeting Base', 'Le Bristol Paris', '112 Rue du Faubourg Saint-Honore, Paris', '+33-1-53-43-43-00', 'https://www.oetkercollection.com/hotels/le-bristol-paris/', 'Palace hotel; discreet suites.', 'Paris base'),
('Paris', 'France', 'Dinner / Client Dinner', 'Laurent', '41 Ave Gabriel, Paris', '+33-1-42-25-00-39', 'https://www.le-laurent.com', 'Champs-Elysees garden pavilion.', 'Client dinner');
