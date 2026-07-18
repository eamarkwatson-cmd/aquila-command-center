import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plane, Hotel, Search, Copy, MapPin, Loader2, RotateCcw, Star, Car, MapPinned, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  searchTravel, fetchLiveCityRecs, formatFlightForClipboard, normalizeCityKey,
  type TravelResults, type FlightOption, type HotelOption, type GroundTransportOption, type CityRec,
} from "@/services/travelPlannerService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/travel-planner")({
  component: TravelPlannerPage,
});

type Tab = "flights" | "hotels" | "ground" | "marksweek";

type MarksWeekRec = {
  id: string; city: string; region: string | null; category: string;
  name: string; address: string | null; phone: string | null;
  booking_url: string | null; detail: string | null; best_for: string | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDuration(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function TravelPlannerPage() {
  const today = new Date().toISOString().slice(0, 10);
  const inAWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState(today);
  const [returnDate, setReturnDate] = useState(inAWeek);
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [stops, setStops] = useState<"any" | "nonstop" | "1-stop" | "2+">("any");
  const [tab, setTab] = useState<Tab>("flights");
  const [results, setResults] = useState<TravelResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedDestination, setSearchedDestination] = useState("");

  // Mark's Week recs for the destination city
  const destKey = normalizeCityKey(searchedDestination);
  const { data: marksWeekRecs = [], isLoading: loadingRecs } = useQuery<MarksWeekRec[]>({
    queryKey: ["travel-marksweek", destKey],
    enabled: !!destKey && !!results,
    queryFn: async () => {
      const orClauses = [
        `city.ilike.%${destKey}%`,
        `region.ilike.%${destKey}%`,
      ];
      // Also add the raw destination string
      if (searchedDestination.toLowerCase() !== destKey) {
        orClauses.push(`city.ilike.%${searchedDestination.toLowerCase()}%`);
      }
      const { data, error } = await supabase
        .from("city_recommendations")
        .select("*")
        .or(orClauses.join(","))
        .order("category");
      if (error) throw error;
      return data ?? [];
    },
  });

  // LIVE Mark's Week recs pulled from the web in real time (Claude + web search)
  const { data: liveRecs = [], isLoading: loadingLiveRecs, error: liveRecsError } = useQuery<CityRec[]>({
    queryKey: ["travel-marksweek-live", destKey],
    enabled: !!destKey && !!results,
    staleTime: 1000 * 60 * 30,
    retry: 0,
    queryFn: () => fetchLiveCityRecs(searchedDestination),
  });

  const [liveSearch, setLiveSearch] = useState<{ live: boolean; error?: string } | null>(null);

  async function onSearch() {
    if (!origin.trim() || !destination.trim()) {
      toast.error("Enter both origin and destination");
      return;
    }
    setLoading(true); setError(null);
    try {
      const r = await searchTravel({
        origin: origin.trim(),
        destination: destination.trim(),
        departDate,
        returnDate,
        tripType,
        stops,
      });
      setResults(r);
      setLiveSearch({ live: (r as any).live !== false, error: (r as any).liveError });
      setSearchedDestination(destination.trim());
    } catch (e: any) {
      setError(e?.message ?? "Search failed");
    } finally { setLoading(false); }
  }

  function onReset() {
    setOrigin(""); setDestination(""); setDepartDate(today); setReturnDate(inAWeek);
    setTripType("one-way"); setStops("any");
    setResults(null); setError(null); setSearchedDestination("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Travel Planner</h2>
        <p className="text-sm text-muted-foreground">Search flights, hotels, and ground transport for Mark's next trip.</p>
      </div>

      {/* Search panel */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        {/* Trip type + stops row */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Trip Type</div>
            <div className="flex rounded-md border border-border overflow-hidden">
              <button onClick={() => setTripType("one-way")}
                className={cn("px-3 py-1.5 text-xs font-medium transition",
                  tripType === "one-way" ? "bg-navy text-white" : "bg-background text-muted-foreground hover:bg-muted")}>
                One-way
              </button>
              <button onClick={() => setTripType("round-trip")}
                className={cn("px-3 py-1.5 text-xs font-medium border-l border-border transition",
                  tripType === "round-trip" ? "bg-navy text-white" : "bg-background text-muted-foreground hover:bg-muted")}>
                Round-trip
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Stops</div>
            <select value={stops} onChange={(e) => setStops(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:border-navy">
              <option value="any">Any</option>
              <option value="nonstop">Nonstop</option>
              <option value="1-stop">1 Stop</option>
              <option value="2+">2+ Stops</option>
            </select>
          </div>
        </div>

        {/* Search fields */}
        <div className={cn("grid grid-cols-1 gap-4", tripType === "round-trip" ? "md:grid-cols-4" : "md:grid-cols-3")}>
          <Field label="Origin (city or airport)">
            <input value={origin} onChange={(e) => setOrigin(e.target.value)}
              placeholder="Providence (PVD)"
              className="input" />
          </Field>
          <Field label="Destination (city or airport)">
            <input value={destination} onChange={(e) => setDestination(e.target.value)}
              placeholder="Philadelphia (PHL)"
              className="input" />
          </Field>
          <Field label="Departure">
            <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)}
              className="input" />
          </Field>
          {tripType === "round-trip" && (
            <Field label="Return">
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
                className="input" />
            </Field>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button onClick={onSearch} disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
          <button onClick={onReset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>

      {/* Results */}
      {results && liveSearch && !liveSearch.live && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Live search unavailable — showing sample data. Likely cause: <code className="font-mono">ANTHROPIC_API_KEY</code> missing
          from Supabase Vault, or the <code className="font-mono">travel-search</code> function isn't deployed yet.
          {liveSearch.error && <span className="block text-xs opacity-80 mt-1">{liveSearch.error}</span>}
        </div>
      )}

      {results && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 pt-3">
            <TabButton active={tab === "flights"} onClick={() => setTab("flights")}
              icon={<Plane className="h-4 w-4" />} label={`Flights (${results.flights.length})`} />
            <TabButton active={tab === "hotels"} onClick={() => setTab("hotels")}
              icon={<Hotel className="h-4 w-4" />} label={`Hotels (${results.hotels.length})`} />
            <TabButton active={tab === "ground"} onClick={() => setTab("ground")}
              icon={<Car className="h-4 w-4" />} label={`Ground (${results.groundTransport.length})`} />
            <TabButton active={tab === "marksweek"} onClick={() => setTab("marksweek")}
              icon={<MapPinned className="h-4 w-4" />} label={`Mark's Week (${marksWeekRecs.length + liveRecs.length})`} />
          </div>
          <div className="p-4">
            {tab === "flights" && <FlightList flights={results.flights} />}
            {tab === "hotels" && <HotelGrid hotels={results.hotels} destination={searchedDestination} />}
            {tab === "ground" && <GroundTransportList items={results.groundTransport} destination={searchedDestination} />}
            {tab === "marksweek" && (
              <div className="space-y-6">
                <LiveRecsSection recs={liveRecs} loading={loadingLiveRecs} error={liveRecsError as Error | null} destination={searchedDestination} />
                <MarksWeekList recs={marksWeekRecs} destination={searchedDestination} loading={loadingRecs} />
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border-radius: 0.375rem; border: 1px solid var(--color-input); background: var(--color-background); padding: 0.5rem 0.75rem; font-size: 0.875rem; }
      .input:focus { outline: none; border-color: var(--color-navy); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={cn(
        "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition",
        active ? "border-navy text-navy" : "border-transparent text-muted-foreground hover:text-foreground",
      )}>
      {icon} {label}
    </button>
  );
}

function FlightList({ flights }: { flights: FlightOption[] }) {
  if (flights.length === 0) {
    return <EmptyState icon={<Plane className="h-6 w-6" />} title="No flights found" hint="Try changing the stops filter or a different date." />;
  }
  async function copy(f: FlightOption) {
    await navigator.clipboard.writeText(formatFlightForClipboard(f));
    toast.success("Flight details copied");
  }
  return (
    <div className="space-y-3">
      {flights.map((f) => (
        <div key={f.id} className="rounded-md border border-border bg-background p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy/10 text-xs font-semibold text-navy">
                {f.airlineCode}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{f.airline}</div>
                <div className="text-xs text-muted-foreground">{f.flightNumber} · {f.cabin}</div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4 min-w-[280px]">
              <div>
                <div className="text-lg font-semibold text-foreground">{fmtTime(f.departTime)}</div>
                <div className="text-xs text-muted-foreground">{f.origin}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">{fmtDuration(f.durationMinutes)}</div>
                <div className="my-1 h-px bg-border" />
                <div className="text-xs font-medium text-navy">{f.stops === 0 ? "Nonstop" : `${f.stops} stop`}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-foreground">{fmtTime(f.arriveTime)}</div>
                <div className="text-xs text-muted-foreground">{f.destination}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-semibold text-gold">${f.priceUSD.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">per traveler</div>
              </div>
              <button onClick={() => copy(f)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HotelGrid({ hotels, destination }: { hotels: HotelOption[]; destination: string }) {
  if (hotels.length === 0) {
    return <EmptyState icon={<Hotel className="h-6 w-6" />}
      title={`No curated hotels for "${destination}" yet`}
      hint="Try New York, Washington DC, London, Paris, Geneva, Boston, Austin, San Antonio, or Newport." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {hotels.map((h) => (
        <div key={h.id} className="flex flex-col rounded-md border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{h.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-navy">
                <MapPin className="h-3 w-3" /> {h.proximity}
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: h.stars }).map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-gold text-gold" />
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{h.address}</div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">${h.pricePerNightUSD.toLocaleString()}</div>
              <div className="text-[10px] text-muted-foreground">per night</div>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + " " + h.address)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
              <MapPin className="h-3 w-3" /> View Map
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroundTransportList({ items, destination }: { items: GroundTransportOption[]; destination: string }) {
  if (items.length === 0) {
    return <EmptyState icon={<Car className="h-6 w-6" />}
      title={`No ground transport data for "${destination}" yet`}
      hint="Currently covering: New York, Washington DC, Philadelphia, Princeton, Boston, Newport, Austin, San Antonio, London." />;
  }

  async function copy(item: GroundTransportOption) {
    const text = [
      `${item.type} — ${item.provider}`,
      `${item.pickup} → ${item.dropoff}`,
      `~${item.estimatedMinutes} min`,
      item.estimatedPriceUSD ? `Est. $${item.estimatedPriceUSD}` : "",
      item.phone ? `Phone: ${item.phone}` : "",
      item.notes ?? "",
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Details copied");
  }

  const byType = items.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, GroundTransportOption[]>);

  return (
    <div className="space-y-6">
      {Object.entries(byType).map(([type, group]) => (
        <div key={type}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{type}</div>
          <div className="space-y-2">
            {group.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{item.provider}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.pickup} → {item.dropoff}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs">
                      <span className="text-navy font-medium">~{item.estimatedMinutes} min</span>
                      {item.estimatedPriceUSD && <span className="text-gold font-medium">~${item.estimatedPriceUSD}</span>}
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-navy">
                          <Phone className="h-3 w-3" /> {item.phone}
                        </a>
                      )}
                    </div>
                    {item.notes && <div className="mt-1.5 text-xs text-muted-foreground">{item.notes}</div>}
                  </div>
                  <button onClick={() => copy(item)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveRecsSection({ recs, loading, error, destination }: { recs: CityRec[]; loading: boolean; error: Error | null; destination: string }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Pulling live recommendations for {destination} from the web…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Live recommendations unavailable — showing curated list only.
        <span className="block text-xs opacity-80 mt-1">{error.message}</span>
      </div>
    );
  }
  if (recs.length === 0) return null;

  const byCategory = recs.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, CityRec[]>);

  async function copy(rec: CityRec) {
    const text = [rec.name, rec.address, rec.phone, rec.booking_url, rec.detail].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Live</span>
        <span className="text-xs text-muted-foreground">Fresh from the web for {destination} — refreshed each search</span>
      </div>
      <div className="space-y-5">
        {Object.entries(byCategory).map(([cat, group]) => (
          <div key={cat}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>
            <div className="space-y-2">
              {group.map((rec, i) => (
                <div key={`${cat}-${i}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{rec.name}</div>
                      {rec.address && <div className="text-xs text-muted-foreground mt-0.5">{rec.address}</div>}
                      {rec.phone && <div className="text-xs text-muted-foreground">{rec.phone}</div>}
                      {rec.detail && <div className="text-xs text-muted-foreground mt-1">{rec.detail}</div>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {rec.booking_url && (
                        <a href={rec.booking_url} target="_blank" rel="noreferrer"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-navy" title="Open">
                          <MapPin className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => copy(rec)} title="Copy details"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarksWeekList({ recs, destination, loading }: { recs: MarksWeekRec[]; destination: string; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (recs.length === 0) {
    return <EmptyState icon={<MapPinned className="h-6 w-6" />}
      title={`No curated recommendations for "${destination}" yet`}
      hint="Seeded cities: Newport · Washington DC · Austin · San Antonio · Boston · New York · Geneva · London · Paris." />;
  }

  async function copy(rec: MarksWeekRec) {
    const text = [rec.name, rec.address, rec.phone, rec.booking_url, rec.detail]
      .filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  const byCategory = recs.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, MarksWeekRec[]>);

  return (
    <div className="space-y-6">
      {Object.entries(byCategory).map(([cat, group]) => (
        <div key={cat}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{cat}</div>
          <div className="space-y-2">
            {group.map((rec) => (
              <div key={rec.id} className="rounded-md border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{rec.name}</div>
                    {rec.address && <div className="text-xs text-muted-foreground mt-0.5">{rec.address}</div>}
                    {rec.phone && <div className="text-xs text-muted-foreground">{rec.phone}</div>}
                    {rec.detail && <div className="text-xs text-muted-foreground mt-1">{rec.detail}</div>}
                    {rec.best_for && <div className="text-xs text-navy mt-1">Best for: {rec.best_for}</div>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {rec.booking_url && (
                      <a href={rec.booking_url} target="_blank" rel="noreferrer"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-navy" title="Book it">
                        <MapPin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button onClick={() => copy(rec)} title="Copy details"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
