import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Copy, Bookmark, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Rec = {
  id: string; city: string; region: string | null; category: string;
  name: string; address: string | null; phone: string | null;
  booking_url: string | null; detail: string | null; best_for: string | null;
};

// Alias map: any of these tokens should include the value tokens when searching.
const LOCATION_ALIASES: Record<string, string[]> = {
  "dc": ["washington", "georgetown", "dc"],
  "washington": ["washington", "georgetown", "dc"],
  "washington dc": ["washington", "georgetown", "dc"],
  "georgetown": ["washington", "georgetown", "dc"],
  "nyc": ["new york", "nyc", "manhattan"],
  "new york": ["new york", "nyc", "manhattan"],
  "manhattan": ["new york", "nyc", "manhattan"],
  "boston": ["boston", "cambridge", "massachusetts"],
  "cambridge": ["boston", "cambridge", "massachusetts"],
  "newport": ["newport", "rhode island"],
  "rhode island": ["newport", "rhode island", "providence"],
  "providence": ["newport", "rhode island", "providence"],
  "austin": ["austin", "texas"],
  "san antonio": ["san antonio", "texas"],
  "london": ["london", "mayfair", "united kingdom"],
  "paris": ["paris", "france"],
  "geneva": ["geneva", "switzerland"],
};

function normalizeLocation(input: string): string {
  return input.toLowerCase().replace(/[.,/()]/g, " ").replace(/\s+/g, " ").trim();
}

function expandTokens(normalized: string): string[] {
  if (!normalized) return [];
  const tokens = new Set<string>([normalized]);
  // whole-string alias
  if (LOCATION_ALIASES[normalized]) {
    LOCATION_ALIASES[normalized].forEach((t) => tokens.add(t));
  }
  // per-word aliases + raw words > 2 chars
  for (const word of normalized.split(" ")) {
    if (word.length > 2) tokens.add(word);
    if (LOCATION_ALIASES[word]) {
      LOCATION_ALIASES[word].forEach((t) => tokens.add(t));
    }
  }
  return [...tokens];
}

function matchesRec(rec: Rec, tokens: string[]): boolean {
  const haystack = [
    rec.city, rec.region, rec.name, rec.address, rec.detail, rec.best_for, rec.category,
  ].map((v) => (v ?? "").toLowerCase()).join(" | ");
  return tokens.some((t) => t && haystack.includes(t));
}

export function MarksWeek({ savedLocation, onSaveLocation }: {
  savedLocation: string;
  onSaveLocation: (loc: string) => void;
}) {
  const qc = useQueryClient();
  const [location, setLocation] = useState(savedLocation);
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  // FIX: sync internal location state when prop loads asynchronously from Supabase
  useEffect(() => {
    if (savedLocation && !location) {
      setLocation(savedLocation);
    }
  }, [savedLocation]);

  const normalized = useMemo(() => normalizeLocation(location), [location]);
  const tokens = useMemo(() => expandTokens(normalized), [normalized]);

  const { data: allRecs = [], isLoading } = useQuery<Rec[]>({
    queryKey: ["city-recs-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_recommendations")
        .select("*")
        .order("city");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Server-side filtered recs as primary source when a location is set
  const { data: serverRecs = [] } = useQuery<Rec[]>({
    queryKey: ["city-recs-search", normalized],
    enabled: !!normalized,
    queryFn: async () => {
      if (!normalized) return [];
      // Fan out tokens into an OR filter across all text fields
      const searchTokens = expandTokens(normalized);
      const orClauses = searchTokens.flatMap((t) => [
        `city.ilike.%${t}%`,
        `region.ilike.%${t}%`,
        `name.ilike.%${t}%`,
        `address.ilike.%${t}%`,
        `detail.ilike.%${t}%`,
        `best_for.ilike.%${t}%`,
        `category.ilike.%${t}%`,
      ]);
      const { data, error } = await supabase
        .from("city_recommendations")
        .select("*")
        .or(orClauses.join(","))
        .order("city");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Prefer server-filtered recs; fall back to client-side filter of all recs
  const recs = useMemo(() => {
    if (!normalized) return [];
    if (serverRecs.length > 0) return serverRecs;
    return allRecs.filter((r) => matchesRec(r, tokens));
  }, [serverRecs, allRecs, normalized, tokens]);

  const { data: planned = [] } = useQuery({
    queryKey: ["planned-items"],
    queryFn: async () => {
      const { data } = await supabase.from("planned_items").select("recommendation_id");
      return (data ?? []).map((p: any) => p.recommendation_id as string);
    },
  });

  const availableCats = [...new Set(recs.map((r) => r.category))];
  const filtered = activeCats.length === 0
    ? recs
    : recs.filter((r) => activeCats.includes(r.category));

  function toggleCat(cat: string) {
    setActiveCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  async function logActivity(action: string, details: Record<string, unknown>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        entity_type: "city_recommendation",
        action,
        performed_by: user?.email ?? null,
        details: details as any,
      });
    } catch { /* non-fatal */ }
  }

  async function saveLocation(val: string) {
    onSaveLocation(val);
    if (val.trim()) await logActivity("location_set", { location: val });
  }

  async function copyDetails(rec: Rec) {
    const text = [rec.name, rec.address, rec.phone, rec.booking_url, rec.detail]
      .filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
    await logActivity("copied_details", { name: rec.name, city: rec.city });
  }

  async function saveToPlan(rec: Rec) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("planned_items").insert({
      recommendation_id: rec.id, label: rec.name, detail: rec.detail,
      city: rec.city, created_by: user?.email ?? null,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["planned-items"] });
    await logActivity("saved_to_plan", { name: rec.name, city: rec.city });
    toast.success("Saved to plan ✓");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onBlur={(e) => saveLocation(e.target.value)}
          placeholder="Newport, Washington DC, Austin, New York, London…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-navy"
        />
        {location && (
          <button onClick={() => { setLocation(""); onSaveLocation(""); }}
            className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {availableCats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {availableCats.map((cat) => (
            <button key={cat} onClick={() => toggleCat(cat)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition",
                activeCats.includes(cat)
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              )}>
              {cat}
            </button>
          ))}
          {activeCats.length > 0 && (
            <button onClick={() => setActiveCats([])}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted">
              Clear
            </button>
          )}
        </div>
      )}

      {!location.trim() && (
        <p className="text-sm text-muted-foreground">
          Type Mark's location to see curated activity and dining suggestions.
        </p>
      )}

      {location.trim() && !isLoading && recs.length === 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-4 text-sm space-y-1">
          <div className="font-medium text-foreground">No matches for "{location}"</div>
          <p className="text-muted-foreground">
            Seeded cities: Newport · Washington DC / Georgetown · Austin · San Antonio ·
            Boston / Cambridge · New York · Geneva · London · Paris.
          </p>
          <button onClick={() => setShowDebug((v) => !v)}
            className="text-xs text-navy underline underline-offset-2">
            {showDebug ? "Hide" : "Show"} debug
          </button>
          {showDebug && (
            <div className="mt-2 rounded bg-background border border-border p-2 text-xs font-mono space-y-0.5">
              <div>raw: <span className="text-muted-foreground">{JSON.stringify(location)}</span></div>
              <div>normalized: <span className="text-muted-foreground">{JSON.stringify(normalized)}</span></div>
              <div>tokens: <span className="text-muted-foreground">{JSON.stringify(tokens)}</span></div>
              <div>rows in table (all): <span className="text-muted-foreground">{allRecs.length}</span></div>
              <div>rows from server search: <span className="text-muted-foreground">{serverRecs.length}</span></div>
              <div>rows after client filter: <span className="text-muted-foreground">0</span></div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((rec) => {
          const isSaved = planned.includes(rec.id);
          return (
            <div key={rec.id} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{rec.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{rec.category}</span>
                    <span className="text-[10px] text-muted-foreground">{rec.city}</span>
                  </div>
                  {rec.address && <div className="text-xs text-muted-foreground mt-0.5">{rec.address}</div>}
                  {rec.phone && <div className="text-xs text-muted-foreground">{rec.phone}</div>}
                  {rec.detail && <div className="text-xs text-muted-foreground mt-1">{rec.detail}</div>}
                  {rec.best_for && <div className="text-xs text-navy mt-1">Best for: {rec.best_for}</div>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {rec.booking_url && (
                    <a href={rec.booking_url} target="_blank" rel="noreferrer"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-navy" title="Book it">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button onClick={() => copyDetails(rec)} title="Copy details"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => !isSaved && saveToPlan(rec)} title={isSaved ? "Already saved" : "Save to plan"}
                    className={cn("rounded p-1.5", isSaved ? "text-navy" : "text-muted-foreground hover:bg-muted hover:text-navy")}>
                    <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-navy")} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
