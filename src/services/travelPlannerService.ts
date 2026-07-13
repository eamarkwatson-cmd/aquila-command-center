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

export type TravelQuery = {
  origin: string;
  destination: string;
  departDate: string;
  returnDate: string;
};

export type TravelResults = {
  flights: FlightOption[];
  hotels: HotelOption[];
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

function findHotels(destination: string): { hotels: HotelOption[]; key: string } {
  const key = normalizeCityKey(destination);
  const matches = HOTELS.filter((h) => h.cityKey === key);
  return { hotels: matches, key };
}

export async function searchTravel(q: TravelQuery): Promise<TravelResults> {
  // Simulated latency; swap for real API call later.
  await new Promise((r) => setTimeout(r, 550));
  const { hotels, key } = findHotels(q.destination);
  return {
    flights: generateFlights(q),
    hotels,
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
