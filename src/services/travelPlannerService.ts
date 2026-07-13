// Travel Planner mock service. Swap `searchTravel` with a real API later
// (e.g. Amadeus, Duffel, Kiwi). Keep the return shape stable.

export type FlightOption = {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departTime: string; // ISO
  arriveTime: string; // ISO
  durationMinutes: number;
  stops: number;
  priceUSD: number;
  cabin: "Economy" | "Premium" | "Business" | "First";
};

export type HotelOption = {
  id: string;
  name: string;
  cityKey: string;
  proximity: string;
  stars: number;
  pricePerNightUSD: number;
  address: string;
};

export type GroundTransportOption = {
  id: string;
  type: "Black Car" | "Car Rental" | "Rail" | "Taxi / Rideshare" | "Airport Transfer";
  provider: string;
  pickup: string;
  dropoff: string;
  estimatedMinutes: number;
  estimatedPriceUSD: number | null;
  phone: string | null;
  notes: string | null;
};

export type TravelQuery = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
  tripType: "one-way" | "round-trip";
  stops: "any" | "nonstop" | "1-stop" | "2+";
};

export type TravelResults = {
  flights: FlightOption[];
  hotels: HotelOption[];
  groundTransport: GroundTransportOption[];
  destinationKey: string;
};

// Normalize a city / airport string to a key we can match hotels against.
export function normalizeCityKey(v: string): string {
  const s = v.toLowerCase().replace(/[.,/()]/g, " ").replace(/\s+/g, " ").trim();
  const aliases: Record<string, string> = {
    "nyc": "new york", "manhattan": "new york", "jfk": "new york", "lga": "new york", "ewr": "new york",
    "dc": "washington", "washington dc": "washington", "dca": "washington", "iad": "washington", "georgetown": "washington",
    "lhr": "london", "lgw": "london", "lcy": "london",
    "cdg": "paris", "orly": "paris", "ory": "paris",
    "gva": "geneva",
    "bos": "boston", "cambridge": "boston",
    "aus": "austin",
    "sat": "san antonio",
    "sfo": "san francisco",
    "lax": "los angeles",
    "mia": "miami",
    "pvd": "newport", "providence": "newport",
    "philadelphia": "philadelphia", "phl": "philadelphia", "philly": "philadelphia",
    "princeton": "princeton", "princeton nj": "princeton",
  };
  if (aliases[s]) return aliases[s];
  for (const word of s.split(" ")) if (aliases[word]) return aliases[word];
  return s;
}

const HOTELS: HotelOption[] = [
  { id: "h1", name: "The Carlyle, A Rosewood Hotel", cityKey: "new york", proximity: "Near Central Park & Museum Mile", stars: 5, pricePerNightUSD: 1195, address: "35 E 76th St, New York, NY" },
  { id: "h2", name: "Aman New York", cityKey: "new york", proximity: "Near Grand Central & Midtown", stars: 5, pricePerNightUSD: 3200, address: "730 Fifth Ave, New York, NY" },
  { id: "h3", name: "The Mark", cityKey: "new york", proximity: "Near The Met, Upper East Side", stars: 5, pricePerNightUSD: 1450, address: "25 E 77th St, New York, NY" },

  { id: "h4", name: "Rosewood Washington DC", cityKey: "washington", proximity: "Georgetown waterfront", stars: 5, pricePerNightUSD: 895, address: "1050 31st St NW, Washington, DC" },
  { id: "h5", name: "Hay-Adams", cityKey: "washington", proximity: "Across from the White House", stars: 5, pricePerNightUSD: 950, address: "800 16th St NW, Washington, DC" },
  { id: "h6", name: "Four Seasons Georgetown", cityKey: "washington", proximity: "Georgetown / M Street", stars: 5, pricePerNightUSD: 875, address: "2800 Pennsylvania Ave NW, Washington, DC" },

  { id: "h7", name: "Claridge's", cityKey: "london", proximity: "Mayfair, near Bond Street", stars: 5, pricePerNightUSD: 1350, address: "Brook St, Mayfair, London" },
  { id: "h8", name: "The Connaught", cityKey: "london", proximity: "Mayfair, near Berkeley Square", stars: 5, pricePerNightUSD: 1500, address: "Carlos Pl, Mayfair, London" },
  { id: "h9", name: "The Savoy", cityKey: "london", proximity: "Covent Garden / Thames", stars: 5, pricePerNightUSD: 1100, address: "Strand, London" },

  { id: "h10", name: "Le Bristol Paris", cityKey: "paris", proximity: "Faubourg Saint-Honore", stars: 5, pricePerNightUSD: 1650, address: "112 Rue du Faubourg Saint-Honore, Paris" },
  { id: "h11", name: "Hotel de Crillon", cityKey: "paris", proximity: "Place de la Concorde", stars: 5, pricePerNightUSD: 1550, address: "10 Pl. de la Concorde, Paris" },
  { id: "h12", name: "Ritz Paris", cityKey: "paris", proximity: "Place Vendome", stars: 5, pricePerNightUSD: 1800, address: "15 Pl. Vendome, Paris" },

  { id: "h13", name: "Hotel President Wilson", cityKey: "geneva", proximity: "Lake Geneva waterfront", stars: 5, pricePerNightUSD: 1050, address: "47 Quai Wilson, Geneva" },
  { id: "h14", name: "Beau-Rivage Geneva", cityKey: "geneva", proximity: "Right bank of Lake Geneva", stars: 5, pricePerNightUSD: 1100, address: "13 Quai du Mont-Blanc, Geneva" },

  { id: "h15", name: "Four Seasons One Dalton", cityKey: "boston", proximity: "Back Bay", stars: 5, pricePerNightUSD: 895, address: "1 Dalton St, Boston, MA" },
  { id: "h16", name: "The Newbury Boston", cityKey: "boston", proximity: "Public Garden", stars: 5, pricePerNightUSD: 850, address: "15 Arlington St, Boston, MA" },

  { id: "h17", name: "Hotel Saint Cecilia", cityKey: "austin", proximity: "South Congress", stars: 5, pricePerNightUSD: 795, address: "112 Academy Dr, Austin, TX" },
  { id: "h18", name: "Austin Proper Hotel", cityKey: "austin", proximity: "2nd Street District", stars: 5, pricePerNightUSD: 675, address: "600 W 2nd St, Austin, TX" },

  { id: "h19", name: "Hotel Emma", cityKey: "san antonio", proximity: "Pearl District", stars: 5, pricePerNightUSD: 725, address: "136 E Grayson St, San Antonio, TX" },

  { id: "h20", name: "Castle Hill Inn", cityKey: "newport", proximity: "Ocean Drive waterfront", stars: 5, pricePerNightUSD: 995, address: "590 Ocean Dr, Newport, RI" },
  { id: "h21", name: "The Chanler at Cliff Walk", cityKey: "newport", proximity: "Cliff Walk", stars: 5, pricePerNightUSD: 950, address: "117 Memorial Blvd, Newport, RI" },

  // Philadelphia
  { id: "h22", name: "The Study at University City", cityKey: "philadelphia", proximity: "UPenn campus — University City", stars: 4, pricePerNightUSD: 259, address: "20 S 33rd Street, Philadelphia, PA 19104" },
  { id: "h23", name: "The Rittenhouse Hotel", cityKey: "philadelphia", proximity: "Rittenhouse Square", stars: 5, pricePerNightUSD: 595, address: "210 W Rittenhouse Sq, Philadelphia, PA 19103" },
  { id: "h24", name: "Four Seasons Philadelphia", cityKey: "philadelphia", proximity: "Center City — Comcast Tower", stars: 5, pricePerNightUSD: 795, address: "1 N 19th St, Philadelphia, PA 19103" },

  // Princeton
  { id: "h25", name: "The Peacock Inn", cityKey: "princeton", proximity: "Downtown Princeton — steps from campus", stars: 4, pricePerNightUSD: 377, address: "20 Bayard Lane, Princeton, NJ 08540" },
  { id: "h26", name: "Hyatt Regency Princeton", cityKey: "princeton", proximity: "Carnegie Center — near Princeton", stars: 4, pricePerNightUSD: 245, address: "102 Carnegie Center, Princeton, NJ 08540" },
];



const AIRLINES: Array<{ code: string; name: string }> = [
  { code: "AA", name: "American Airlines" },
  { code: "DL", name: "Delta Air Lines" },
  { code: "UA", name: "United Airlines" },
  { code: "B6", name: "JetBlue" },
  { code: "BA", name: "British Airways" },
  { code: "AF", name: "Air France" },
  { code: "LX", name: "Swiss" },
];

function isoAt(dateStr: string, hour: number, minute = 0): string {
  const d = new Date(dateStr);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function generateFlights(q: TravelQuery): FlightOption[] {
  if (!q.departDate) return [];
  const seed = (q.origin + q.destination).length;
  const picks = [
    { hour: 7, dur: 165, stops: 0, cabin: "Business" as const, price: 1450 },
    { hour: 10, dur: 195, stops: 0, cabin: "Business" as const, price: 1290 },
    { hour: 13, dur: 240, stops: 1, cabin: "Business" as const, price: 985 },
    { hour: 17, dur: 175, stops: 0, cabin: "First" as const, price: 2450 },
    { hour: 20, dur: 210, stops: 0, cabin: "Business" as const, price: 1195 },
  ];
  return picks.map((p, i) => {
    const airline = AIRLINES[(seed + i) % AIRLINES.length];
    const arr = new Date(isoAt(q.departDate, p.hour));
    arr.setMinutes(arr.getMinutes() + p.dur);
    return {
      id: `f${i}-${airline.code}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: `${airline.code} ${100 + ((seed + i * 37) % 900)}`,
      origin: q.origin,
      destination: q.destination,
      departTime: isoAt(q.departDate, p.hour),
      arriveTime: arr.toISOString(),
      durationMinutes: p.dur,
      stops: p.stops,
      priceUSD: p.price,
      cabin: p.cabin,
    };
  });
}

const GROUND_TRANSPORT: GroundTransportOption[] = [
  // New York
  { id: "gt-nyc-1", type: "Black Car", provider: "Carey Limousine", pickup: "JFK International Airport", dropoff: "Midtown Manhattan", estimatedMinutes: 55, estimatedPriceUSD: 185, phone: "1-800-336-4646", notes: "Reserve 24hrs ahead. Ask for executive sedan." },
  { id: "gt-nyc-2", type: "Airport Transfer", provider: "Carmel Car & Limousine", pickup: "EWR / LGA / JFK", dropoff: "Any Manhattan address", estimatedMinutes: 60, estimatedPriceUSD: 95, phone: "212-666-6666", notes: "Flat rate from all NYC-area airports." },
  { id: "gt-nyc-3", type: "Rail", provider: "AirTrain + LIRR / Subway", pickup: "JFK Terminal", dropoff: "Penn Station / Midtown", estimatedMinutes: 55, estimatedPriceUSD: 12, phone: null, notes: "Fastest option during rush hour. AirTrain to Jamaica, then LIRR." },

  // Washington DC
  { id: "gt-dc-1", type: "Black Car", provider: "EmpireCLS Washington DC", pickup: "DCA / IAD / BWI", dropoff: "Georgetown / Downtown DC", estimatedMinutes: 35, estimatedPriceUSD: 140, phone: "202-488-1000", notes: "Reserve 4hrs ahead. DCA is closest to Georgetown (~20 min)." },
  { id: "gt-dc-2", type: "Rail", provider: "DC Metro (Blue/Yellow Line)", pickup: "DCA (Reagan National)", dropoff: "Foggy Bottom / Downtown", estimatedMinutes: 22, estimatedPriceUSD: 3, phone: null, notes: "Metro directly from DCA. Blue or Yellow Line. Fastest from DCA." },

  // Philadelphia
  { id: "gt-phl-1", type: "Black Car", provider: "Executive Transportation PHL", pickup: "PHL International Airport", dropoff: "University City / Center City", estimatedMinutes: 30, estimatedPriceUSD: 85, phone: "215-545-5555", notes: "30 min to The Study at Penn. Reserve ahead." },
  { id: "gt-phl-2", type: "Rail", provider: "SEPTA Airport Line", pickup: "PHL Terminal A/B/C/D/E", dropoff: "30th Street Station (University City)", estimatedMinutes: 25, estimatedPriceUSD: 7, phone: null, notes: "Direct to 30th Street Station — one stop from The Study." },
  { id: "gt-phl-3", type: "Car Rental", provider: "Hertz / Avis at PHL", pickup: "PHL Rental Center", dropoff: "Self-drive", estimatedMinutes: 15, estimatedPriceUSD: 75, phone: null, notes: "Easy access to Princeton from PHL via I-95 / NJ Turnpike (~1hr)." },

  // Princeton
  { id: "gt-princeton-1", type: "Car Rental", provider: "Enterprise Princeton", pickup: "Princeton, NJ", dropoff: "Self-drive", estimatedMinutes: 10, estimatedPriceUSD: 65, phone: "609-924-3900", notes: "Convenient for driving Newport → Princeton → Newport." },
  { id: "gt-princeton-2", type: "Rail", provider: "NJ Transit (Princeton Junction)", pickup: "Princeton Junction Station", dropoff: "New York Penn Station", estimatedMinutes: 75, estimatedPriceUSD: 18, phone: null, notes: "Take Dinky shuttle to Princeton Junction, then Northeast Corridor to NYC." },

  // Boston
  { id: "gt-bos-1", type: "Black Car", provider: "Commonwealth Worldwide", pickup: "BOS Logan Airport", dropoff: "Back Bay / Downtown Boston", estimatedMinutes: 30, estimatedPriceUSD: 120, phone: "617-787-3400", notes: "Reserve 24hrs ahead. Flat rate to Back Bay hotels." },
  { id: "gt-bos-2", type: "Rail", provider: "MBTA Silver Line SL1", pickup: "BOS Logan All Terminals", dropoff: "South Station (Downtown)", estimatedMinutes: 25, estimatedPriceUSD: 3, phone: null, notes: "Free from terminals to South Station. Connect to Red Line for Cambridge." },

  // Newport
  { id: "gt-newport-1", type: "Car Rental", provider: "Enterprise / Hertz at PVD", pickup: "Providence TF Green Airport", dropoff: "Newport, RI (~30 min)", estimatedMinutes: 30, estimatedPriceUSD: 70, phone: null, notes: "Best option from PVD. Newport has no direct transit." },
  { id: "gt-newport-2", type: "Taxi / Rideshare", provider: "Newport Cab / Uber", pickup: "Newport anywhere", dropoff: "Providence / TF Green Airport", estimatedMinutes: 35, estimatedPriceUSD: 55, phone: "401-846-2500", notes: "Newport Cab available 24/7. Uber coverage is lighter than major cities." },

  // Austin
  { id: "gt-aus-1", type: "Black Car", provider: "Austin Black Car", pickup: "AUS Austin-Bergstrom Airport", dropoff: "Downtown / South Congress", estimatedMinutes: 25, estimatedPriceUSD: 75, phone: "512-452-6161", notes: "No rail from AUS. Black car or rideshare only." },

  // San Antonio
  { id: "gt-sat-1", type: "Black Car", provider: "San Antonio Limousine", pickup: "SAT San Antonio Airport", dropoff: "Downtown / Pearl District", estimatedMinutes: 20, estimatedPriceUSD: 65, phone: "210-733-6699", notes: "20 min to Hotel Emma in Pearl District." },

  // London
  { id: "gt-lhr-1", type: "Black Car", provider: "Addison Lee", pickup: "LHR Heathrow", dropoff: "Mayfair / Central London", estimatedMinutes: 60, estimatedPriceUSD: 110, phone: "+44-207-407-9000", notes: "Book via app or phone. Best for luggage. M4 can be slow." },
  { id: "gt-lhr-2", type: "Rail", provider: "Heathrow Express", pickup: "LHR Terminals 2/3/5", dropoff: "Paddington Station", estimatedMinutes: 15, estimatedPriceUSD: 35, phone: null, notes: "Fastest option LHR → Central London. Then taxi/tube to Mayfair." },
];

const GROUND_TRANSPORT_ALIASES: Record<string, string[]> = {
  "new york": ["nyc", "new york", "manhattan", "jfk", "lga", "ewr"],
  "nyc": ["nyc", "new york", "manhattan", "jfk", "lga", "ewr"],
  "washington": ["dc", "washington", "georgetown", "dca", "iad"],
  "philadelphia": ["philadelphia", "phl", "philly", "university city"],
  "princeton": ["princeton", "princeton nj"],
  "boston": ["boston", "bos", "cambridge"],
  "newport": ["newport", "pvd", "providence"],
  "austin": ["austin", "aus"],
  "san antonio": ["san antonio", "sat"],
  "london": ["london", "lhr", "lgw"],
};

function findGroundTransport(destination: string): GroundTransportOption[] {
  const key = normalizeCityKey(destination);
  const aliases = GROUND_TRANSPORT_ALIASES[key] ?? [key];
  return GROUND_TRANSPORT.filter((g) => {
    const combined = (g.pickup + " " + g.dropoff + " " + g.provider + " " + (g.notes ?? "")).toLowerCase();
    return aliases.some((a) => combined.includes(a));
  });
}

function findHotels(destination: string): { hotels: HotelOption[]; key: string } {
  const key = normalizeCityKey(destination);
  const matches = HOTELS.filter((h) => h.cityKey === key);
  return { hotels: matches, key };
}

export async function searchTravel(q: TravelQuery): Promise<TravelResults> {
  await new Promise((r) => setTimeout(r, 550));
  const { hotels, key } = findHotels(q.destination);
  let flights = generateFlights(q);

  // Apply stops filter
  if (q.stops === "nonstop") {
    flights = flights.filter((f) => f.stops === 0);
  } else if (q.stops === "1-stop") {
    flights = flights.filter((f) => f.stops === 1);
  } else if (q.stops === "2+") {
    flights = flights.filter((f) => f.stops >= 2);
  }

  const groundTransport = findGroundTransport(q.destination);

  return {
    flights,
    hotels,
    groundTransport,
    destinationKey: key,
  };
}

export function formatFlightForClipboard(f: FlightOption): string {
  const dep = new Date(f.departTime);
  const arr = new Date(f.arriveTime);
  const fmt = (d: Date) =>
    d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const h = Math.floor(f.durationMinutes / 60);
  const m = f.durationMinutes % 60;
  return [
    `${f.airline} ${f.flightNumber} — ${f.cabin}`,
    `${f.origin} → ${f.destination}`,
    `Depart: ${fmt(dep)}`,
    `Arrive: ${fmt(arr)}`,
    `Duration: ${h}h ${m}m · ${f.stops === 0 ? "Nonstop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}`,
    `Price: $${f.priceUSD.toLocaleString()}`,
  ].join("\n");
}
