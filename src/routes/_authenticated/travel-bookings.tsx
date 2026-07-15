import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { differenceInDays, format, parseISO } from "date-fns";
import { Plus, X, Plane, Hotel, UtensilsCrossed, Car, Package, AlertTriangle, CheckCircle2, Clock, Copy, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/travel-bookings")({
  component: TravelBookingsPage,
});

type Booking = {
  id: string; trip_name: string; booking_type: string; name: string;
  confirmation_number: string | null; event_date: string | null; end_date: string | null;
  event_datetime: string | null; location: string | null; address: string | null;
  guests: number | null; total_cost: number | null; cancellation_deadline: string | null;
  cancellation_policy: string | null; status: string; notes: string | null;
  contact_name: string | null; contact_phone: string | null; booked_by: string | null;
  created_at: string;
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  flight: Plane, hotel: Hotel, restaurant: UtensilsCrossed, car_rental: Car, other: Package,
};

const TYPE_LABELS: Record<string, string> = {
  flight: "Flight", hotel: "Hotel", restaurant: "Restaurant", car_rental: "Car Rental", other: "Other",
};

function urgencyLevel(deadline: string | null): "critical" | "warning" | "ok" | "none" {
  if (!deadline) return "none";
  const days = differenceInDays(parseISO(deadline), new Date());
  if (days < 0) return "none";
  if (days === 0) return "critical";
  if (days <= 2) return "critical";
  if (days <= 7) return "warning";
  return "ok";
}

const EMPTY_FORM = {
  trip_name: "", booking_type: "hotel", name: "", confirmation_number: "",
  event_date: "", end_date: "", location: "", address: "", guests: 1,
  total_cost: "", cancellation_deadline: "", cancellation_policy: "", status: "Confirmed",
  notes: "", contact_phone: "", booked_by: "Kennedy",
};

function TravelBookingsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "upcoming" | "pending" | "deadlines">("upcoming");
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["travel-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_bookings").select("*").order("event_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const trips = useMemo(() => {
    const names = [...new Set(bookings.map((b) => b.trip_name))];
    return names;
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = bookings;
    if (tripFilter !== "all") list = list.filter((b) => b.trip_name === tripFilter);
    const now = new Date();
    if (filter === "upcoming") {
      const todayStr = now.toISOString().slice(0, 10);
      list = list.filter((b) => !b.event_date || b.event_date >= todayStr);
    }
    if (filter === "pending") list = list.filter((b) => b.status === "Pending");
    if (filter === "deadlines") list = list.filter((b) => b.cancellation_deadline && urgencyLevel(b.cancellation_deadline) !== "none" && urgencyLevel(b.cancellation_deadline) !== "ok");
    return list;
  }, [bookings, filter, tripFilter]);

  const deadlineAlerts = bookings.filter((b) => urgencyLevel(b.cancellation_deadline) === "critical");

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        guests: Number(form.guests) || 1,
        total_cost: form.total_cost ? Number(form.total_cost) : null,
        confirmation_number: form.confirmation_number || null,
        end_date: form.end_date || null,
        location: form.location || null,
        address: form.address || null,
        cancellation_deadline: form.cancellation_deadline ? new Date(form.cancellation_deadline).toISOString() : null,
        cancellation_policy: form.cancellation_policy || null,
        notes: form.notes || null,
        contact_phone: form.contact_phone || null,
      };
      if (editing) {
        await supabase.from("travel_bookings").update(payload).eq("id", editing.id);
        toast.success("Booking updated");
      } else {
        await supabase.from("travel_bookings").insert(payload);
        toast.success("Booking added");
      }
      qc.invalidateQueries({ queryKey: ["travel-bookings"] });
      setShowForm(false); setEditing(null); setForm({ ...EMPTY_FORM });
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this booking?")) return;
    await supabase.from("travel_bookings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["travel-bookings"] });
    toast.success("Deleted");
  }

  function startEdit(b: Booking) {
    setEditing(b);
    setForm({
      trip_name: b.trip_name, booking_type: b.booking_type, name: b.name,
      confirmation_number: b.confirmation_number ?? "", event_date: b.event_date ?? "",
      end_date: b.end_date ?? "", location: b.location ?? "", address: b.address ?? "",
      guests: b.guests ?? 1, total_cost: b.total_cost?.toString() ?? "",
      cancellation_deadline: b.cancellation_deadline ? b.cancellation_deadline.slice(0, 16) : "",
      cancellation_policy: b.cancellation_policy ?? "", status: b.status,
      notes: b.notes ?? "", contact_phone: b.contact_phone ?? "",
      booked_by: b.booked_by ?? "Kennedy",
    });
    setShowForm(true);
  }

  async function copyDetails(b: Booking) {
    const lines = [
      b.name, b.confirmation_number ? `Conf #${b.confirmation_number}` : null,
      b.event_date ? `${format(parseISO(b.event_date), "EEE MMM d, yyyy")}` : null,
      b.address ?? b.location, b.contact_phone, b.notes,
    ].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(lines);
    toast.success("Details copied");
  }

  const Icon = (type: string) => { const I = TYPE_ICONS[type] ?? Package; return <I className="h-4 w-4" />; };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Travel Bookings</h2>
          <p className="text-sm text-muted-foreground">All flights, hotels, restaurants and reservations in one place.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Booking
        </button>
      </div>

      {/* Deadline alerts */}
      {deadlineAlerts.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" /> Cancellation Deadlines — Act Today
          </div>
          <div className="space-y-1">
            {deadlineAlerts.map((b) => (
              <div key={b.id} className="text-sm text-destructive">
                {b.name} — deadline {b.cancellation_deadline ? format(parseISO(b.cancellation_deadline), "EEE MMM d 'at' h:mm a") : "today"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["upcoming", "all", "pending", "deadlines"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn("rounded-full px-3 py-1 text-xs font-medium border transition",
              filter === f ? "bg-navy text-white border-navy" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
            {f === "upcoming" ? "Upcoming" : f === "all" ? "All" : f === "pending" ? "Pending" : "⚠️ Deadlines"}
          </button>
        ))}
        <div className="h-5 w-px bg-border self-center" />
        <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)}
          className="rounded-full border border-input bg-background px-3 py-1 text-xs focus:outline-none focus:border-navy">
          <option value="all">All trips</option>
          {trips.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Bookings grouped by trip */}
      {trips.filter((t) => tripFilter === "all" || t === tripFilter).map((trip) => {
        const items = filtered.filter((b) => b.trip_name === trip);
        if (items.length === 0) return null;
        return (
          <div key={trip} className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border bg-navy/5 px-5 py-3">
              <div className="text-sm font-semibold text-navy">{trip}</div>
            </div>
            <div className="divide-y divide-border">
              {items.map((b) => {
                const urgency = urgencyLevel(b.cancellation_deadline);
                return (
                  <div key={b.id} className="p-4 hover:bg-muted/30 transition">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                          b.booking_type === "flight" ? "bg-navy/10 text-navy" :
                          b.booking_type === "hotel" ? "bg-gold/10 text-gold" :
                          b.booking_type === "restaurant" ? "bg-green-500/10 text-green-600" :
                          "bg-muted text-muted-foreground")}>
                          {Icon(b.booking_type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">{b.name}</span>
                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium",
                              b.status === "Confirmed" ? "bg-green-100 text-green-700" :
                              b.status === "Pending" ? "bg-amber-100 text-amber-700" :
                              "bg-red-100 text-red-700")}>
                              {b.status}
                            </span>
                            {b.confirmation_number && (
                              <span className="text-[10px] text-muted-foreground">Conf #{b.confirmation_number}</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {b.event_date && <span>{format(parseISO(b.event_date), "EEE MMM d")}{b.end_date && b.end_date !== b.event_date ? ` → ${format(parseISO(b.end_date), "MMM d")}` : ""}</span>}
                            {b.location && <span>{b.location}</span>}
                            {b.guests && b.guests > 1 && <span>{b.guests} guests</span>}
                            {b.total_cost && <span className="font-medium text-navy">${b.total_cost.toLocaleString()}</span>}
                            {b.contact_phone && <span>{b.contact_phone}</span>}
                          </div>
                          {b.notes && <div className="mt-1 text-xs text-muted-foreground">{b.notes}</div>}
                          {b.cancellation_deadline && (
                            <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium rounded px-2 py-0.5 w-fit",
                              urgency === "critical" ? "bg-destructive/10 text-destructive" :
                              urgency === "warning" ? "bg-amber-50 text-amber-700" :
                              "bg-muted text-muted-foreground")}>
                              {urgency === "critical" ? <AlertTriangle className="h-3 w-3" /> :
                               urgency === "warning" ? <Clock className="h-3 w-3" /> :
                               <CheckCircle2 className="h-3 w-3" />}
                              Cancel by {format(parseISO(b.cancellation_deadline), "EEE MMM d 'at' h:mm a")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => copyDetails(b)} title="Copy details"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-navy">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => startEdit(b)} title="Edit"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-navy">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => del(b.id)} title="Delete"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Plane className="h-8 w-8 text-muted-foreground mb-2" />
          <div className="text-sm font-medium text-foreground">No bookings found</div>
          <div className="text-xs text-muted-foreground mt-1">Add a flight, hotel, or restaurant reservation to track it here.</div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold">{editing ? "Edit Booking" : "Add Booking"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Trip Name"><input value={form.trip_name} onChange={(e) => setForm({ ...form, trip_name: e.target.value })} placeholder="Philadelphia + Princeton" className="inp" /></Field>
                <Field label="Type">
                  <select value={form.booking_type} onChange={(e) => setForm({ ...form, booking_type: e.target.value })} className="inp">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Name / Description"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Study at University City" className="inp" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Confirmation #"><input value={form.confirmation_number} onChange={(e) => setForm({ ...form, confirmation_number: e.target.value })} className="inp" /></Field>
                <Field label="Status">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="inp">
                    {["Confirmed", "Pending", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Check-in / Date"><input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="inp" /></Field>
                <Field label="Check-out (optional)"><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="inp" /></Field>
              </div>
              <Field label="Location"><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="inp" /></Field>
              <Field label="Address"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="inp" /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Guests"><input type="number" value={form.guests} onChange={(e) => setForm({ ...form, guests: Number(e.target.value) })} className="inp" /></Field>
                <Field label="Total Cost ($)"><input type="number" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: e.target.value })} className="inp" /></Field>
                <Field label="Booked By"><input value={form.booked_by} onChange={(e) => setForm({ ...form, booked_by: e.target.value })} className="inp" /></Field>
              </div>
              <Field label="Cancellation Deadline"><input type="datetime-local" value={form.cancellation_deadline} onChange={(e) => setForm({ ...form, cancellation_deadline: e.target.value })} className="inp" /></Field>
              <Field label="Cancellation Policy"><input value={form.cancellation_policy} onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })} className="inp" /></Field>
              <Field label="Contact Phone"><input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="inp" /></Field>
              <Field label="Notes"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" /></Field>
            </div>
            <div className="border-t border-border px-5 py-4 flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.trip_name || !form.name}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Update" : "Add Booking"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.inp { width: 100%; rounded-md border border-input bg-background px-3 py-2 text-sm; border-radius: 0.375rem; border: 1px solid var(--color-input); background: var(--color-background); padding: 0.375rem 0.75rem; font-size: 0.875rem; } .inp:focus { outline: none; border-color: var(--color-navy); }`}</style>
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
