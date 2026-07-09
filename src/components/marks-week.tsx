import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Bookmark, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Rec = {
  id: string; city: string; region: string | null; category: string;
  name: string; address: string | null; phone: string | null;
  booking_url: string | null; detail: string | null; best_for: string | null;
};

const ALL_CATEGORIES = [
  "Golf", "Tennis", "Sailing / Yacht Racing", "Dinner / Client Dinner",
  "Hotel / Meeting Base", "Fitness / Wellness", "Coffee / Breakfast",
  "Culture / Free Time", "Airport / Logistics", "Flying / Aviation",
];

export function MarksWeek({ savedLocation, onSaveLocation }: {
  savedLocation: string;
  onSaveLocation: (loc: string) => void;
}) {
  const qc = useQueryClient();
  const [location, setLocation] = useState(savedLocation);
  const [activeCats, setActiveCats] = useState<string[]>([]);

  const { data: recs = [] } = useQuery<Rec[]>({
    queryKey: ["city-recs", location],
    queryFn: async () => {
      if (!location.trim()) return [];
      // Normalise query and split into tokens so "Washington DC" matches "Washington"
      const q = location.trim().toLowerCase();
      const tokens = [...new Set([q, ...q.split(/[\s,/]+/).filter((t) => t.length > 2)])];

      const { data, error } = await supabase
        .from("city_recommendations")
        .select("*")
        .order("category");
      if (error) throw error;

      return (data ?? []).filter((r: Rec) => {
        const haystack = [
          r.city, r.region, r.name, r.address, r.detail, r.best_for,
        ].map((v) => (v ?? "").toLowerCase()).join(" ");
        return tokens.some((t) => haystack.includes(t));
      });
    },
    enabled: !!location.trim(),
  });

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

  async function saveLocation(val: string) {
    onSaveLocation(val);
    if (val.trim()) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("activity_log").insert({
        entity_type: "city_recommendation", action: "location_set",
        performed_by: user?.email ?? null, details: { location: val } as any,
      }).catch(() => {});
    }
  }

  async function copyDetails(rec: Rec) {
    const text = [
      rec.name, rec.address, rec.phone,
      rec.booking_url, rec.detail,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({
      entity_type: "city_recommendation", action: "copied_details",
      entity_title: rec.name, performed_by: user?.email ?? null, details: { city: rec.city } as any,
    }).catch(() => {});
  }

  async function saveToPlan(rec: Rec) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("planned_items").insert({
      recommendation_id: rec.id, label: rec.name, detail: rec.detail,
      city: rec.city, created_by: user?.email ?? null,
    });
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["planned-items"] });
    await supabase.from("activity_log").insert({
      entity_type: "city_recommendation", action: "saved_to_plan",
      entity_title: rec.name, performed_by: user?.email ?? null, details: { city: rec.city } as any,
    }).catch(() => {});
    toast.success("Saved to plan ✓");
  }

  return (
    <div className="space-y-4">
      {/* Location input */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-medium text-muted-foreground w-16 shrink-0">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onBlur={(e) => saveLocation(e.target.value)}
          placeholder="Newport, Austin, London, Geneva…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:border-navy"
        />
        {location && (
          <button onClick={() => { setLocation(""); onSaveLocation(""); }}
            className="rounded p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category chips */}
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

      {/* Recommendations */}
      {location.trim() && recs.length === 0 && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-4 text-sm">
          <div className="font-medium text-foreground mb-1">No results for "{location}"</div>
          <p className="text-muted-foreground">Searched city, region, name, address, and notes.</p>
          <p className="text-muted-foreground mt-1">Cities in the playbook: Newport · Washington DC / Georgetown · Austin · San Antonio · Boston / Cambridge · New York · Geneva · London · Paris.</p>
          <p className="text-xs text-muted-foreground mt-1">To add this city, insert rows into the city_recommendations table in Supabase.</p>
        </div>
      )}

      {!location.trim() && (
        <p className="text-sm text-muted-foreground">
          Type Mark's location to see curated activity and dining suggestions.
        </p>
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
