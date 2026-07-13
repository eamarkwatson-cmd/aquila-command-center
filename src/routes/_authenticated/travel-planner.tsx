import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plane, Hotel, Search, Copy, MapPin, Loader2, RotateCcw, Star } from "lucide-react";
import { toast } from "sonner";
import {
  searchTravel, formatFlightForClipboard,
  type TravelResults, type FlightOption, type HotelOption,
} from "@/services/travelPlannerService";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/travel-planner")({
  component: TravelPlannerPage,
});

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
  const [tab, setTab] = useState<"flights" | "hotels">("flights");
  const [results, setResults] = useState<TravelResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSearch() {
    if (!origin.trim() || !destination.trim()) {
      toast.error("Enter both origin and destination");
      return;
    }
    setLoading(true); setError(null);
    try {
      const r = await searchTravel({ origin: origin.trim(), destination: destination.trim(), departDate, returnDate });
      setResults(r);
    } catch (e: any) {
      setError(e?.message ?? "Search failed");
    } finally { setLoading(false); }
  }

  function onReset() {
    setOrigin(""); setDestination(""); setDepartDate(today); setReturnDate(inAWeek);
    setResults(null); setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Travel Planner</h2>
        <p className="text-sm text-muted-foreground">Search flights and premium hotels for Mark's next trip.</p>
      </div>

      {/* Search panel */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Origin (city or airport)">
            <input value={origin} onChange={(e) => setOrigin(e.target.value)}
              placeholder="Austin (AUS)"
              className="input" />
          </Field>
          <Field label="Destination (city or airport)">
            <input value={destination} onChange={(e) => setDestination(e.target.value)}
              placeholder="New York (JFK)"
              className="input" />
          </Field>
          <Field label="Departure">
            <input type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)}
              className="input" />
          </Field>
          <Field label="Return">
            <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)}
              className="input" />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={onSearch} disabled={loading}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search Flights & Hotels
          </button>
          <button onClick={onReset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm text-muted-foreground hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>

      {/* Results */}
      {results && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center gap-1 border-b border-border px-4 pt-3">
            <TabButton active={tab === "flights"} onClick={() => setTab("flights")}
              icon={<Plane className="h-4 w-4" />} label={`Available Flights (${results.flights.length})`} />
            <TabButton active={tab === "hotels"} onClick={() => setTab("hotels")}
              icon={<Hotel className="h-4 w-4" />} label={`Hotels in ${destination || "destination"} (${results.hotels.length})`} />
          </div>
          <div className="p-4">
            {tab === "flights" ? <FlightList flights={results.flights} /> : <HotelGrid hotels={results.hotels} destination={destination} />}
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
    return <EmptyState icon={<Plane className="h-6 w-6" />} title="No flights found" hint="Try a different date or route." />;
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

function EmptyState({ icon, title, hint }: { icon: React.ReactNode; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
