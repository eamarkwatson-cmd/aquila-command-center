import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Plus, X, Search, Copy, Mail, Phone, Edit2, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/contacts")({
  component: ContactsPage,
});

type Contact = {
  id: string; name: string; role: string | null; company: string | null;
  email: string | null; phone: string | null; category: string;
  relationship_context: string | null; investment_connection: string | null;
  last_contact_date: string | null; notes: string | null;
  priority: string; created_at: string;
};

const CATEGORIES = ["All", "Investment", "Legal", "Financial", "Portfolio Company", "EA/Operations", "Personal", "Other"];

const CATEGORY_COLORS: Record<string, string> = {
  "Investment": "bg-navy/10 text-navy",
  "Legal": "bg-purple-100 text-purple-700",
  "Financial": "bg-gold/10 text-gold-700",
  "Portfolio Company": "bg-green-100 text-green-700",
  "EA/Operations": "bg-blue-100 text-blue-700",
  "Personal": "bg-pink-100 text-pink-700",
  "Other": "bg-muted text-muted-foreground",
};

const EMPTY_FORM = {
  name: "", role: "", company: "", email: "", phone: "",
  category: "Investment", relationship_context: "", investment_connection: "",
  last_contact_date: "", notes: "", priority: "Normal",
};

function ContactsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    let list = contacts;
    if (catFilter !== "All") list = list.filter((c) => c.category === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.role ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.investment_connection ?? "").toLowerCase().includes(q) ||
        (c.relationship_context ?? "").toLowerCase().includes(q)
      );
    }
    // High priority first
    return [...list].sort((a, b) => {
      if (a.priority === "High" && b.priority !== "High") return -1;
      if (b.priority === "High" && a.priority !== "High") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [contacts, catFilter, search]);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        role: form.role || null, company: form.company || null,
        email: form.email || null, phone: form.phone || null,
        relationship_context: form.relationship_context || null,
        investment_connection: form.investment_connection || null,
        last_contact_date: form.last_contact_date || null,
        notes: form.notes || null,
      };
      if (editing) {
        await supabase.from("contacts").update(payload).eq("id", editing.id);
        toast.success("Contact updated");
        setSelected(null);
      } else {
        await supabase.from("contacts").insert(payload);
        toast.success("Contact added");
      }
      qc.invalidateQueries({ queryKey: ["contacts"] });
      setShowForm(false); setEditing(null); setForm({ ...EMPTY_FORM });
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Delete this contact?")) return;
    await supabase.from("contacts").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["contacts"] });
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted");
  }

  function startEdit(c: Contact) {
    setEditing(c);
    setForm({
      name: c.name, role: c.role ?? "", company: c.company ?? "",
      email: c.email ?? "", phone: c.phone ?? "", category: c.category,
      relationship_context: c.relationship_context ?? "",
      investment_connection: c.investment_connection ?? "",
      last_contact_date: c.last_contact_date ?? "",
      notes: c.notes ?? "", priority: c.priority,
    });
    setShowForm(true);
  }

  async function copyContact(c: Contact) {
    const text = [c.name, c.role, c.company, c.email, c.phone, c.relationship_context]
      .filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Contact details copied");
  }

  const highCount = contacts.filter((c) => c.priority === "High").length;

  return (
    <div className="flex h-full gap-0">
      {/* Left panel */}
      <div className="flex flex-col flex-1 min-w-0 space-y-4 pr-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Contacts</h2>
            <p className="text-sm text-muted-foreground">{contacts.length} contacts · {highCount} high priority</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            <Plus className="h-4 w-4" /> Add Contact
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, role, or investment…"
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-navy" />
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium border transition",
                catFilter === c ? "bg-navy text-white border-navy" : "bg-background text-muted-foreground border-border hover:bg-muted")}>
              {c}
            </button>
          ))}
        </div>

        {/* Contact list */}
        <div className="rounded-lg border border-border bg-card shadow-sm divide-y divide-border overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <User className="h-8 w-8 text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground">No contacts found</div>
            </div>
          ) : filtered.map((c) => (
            <div key={c.id}
              onClick={() => setSelected(selected?.id === c.id ? null : c)}
              className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition",
                selected?.id === c.id && "bg-navy/5 border-l-2 border-l-navy")}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-sm font-semibold text-navy">
                {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                  {c.priority === "High" && <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-gold" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[c.role, c.company].filter(Boolean).join(" · ")}
                </div>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS["Other"])}>
                {c.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — contact detail */}
      {selected && (
        <div className="w-80 shrink-0 rounded-lg border border-border bg-card shadow-sm overflow-hidden self-start sticky top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="text-sm font-semibold text-foreground">{selected.name}</div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(selected)} className="rounded p-1 hover:bg-muted"><Edit2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <button onClick={() => del(selected.id)} className="rounded p-1 hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
              <button onClick={() => setSelected(null)} className="rounded p-1 hover:bg-muted"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-base font-semibold text-navy">
                {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{selected.name}</div>
                {selected.role && <div className="text-xs text-muted-foreground">{selected.role}</div>}
                {selected.company && <div className="text-xs text-navy font-medium">{selected.company}</div>}
              </div>
            </div>
            {(selected.email || selected.phone) && (
              <div className="space-y-1.5">
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-navy">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> {selected.email}
                  </a>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-navy">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {selected.phone}
                  </a>
                )}
              </div>
            )}
            {selected.relationship_context && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Relationship</div>
                <div className="text-xs text-foreground">{selected.relationship_context}</div>
              </div>
            )}
            {selected.investment_connection && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Investments</div>
                <div className="text-xs text-navy font-medium">{selected.investment_connection}</div>
              </div>
            )}
            {selected.notes && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                <div className="text-xs text-foreground">{selected.notes}</div>
              </div>
            )}
            {selected.last_contact_date && (
              <div className="text-xs text-muted-foreground">
                Last contact: {format(parseISO(selected.last_contact_date), "MMM d, yyyy")}
              </div>
            )}
            <button onClick={() => copyContact(selected)}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted transition">
              <Copy className="h-3.5 w-3.5" /> Copy Contact Details
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-background border border-border shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h3 className="text-base font-semibold">{editing ? "Edit Contact" : "Add Contact"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="inp" /></Field>
                <Field label="Priority">
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="inp">
                    <option>Normal</option><option>High</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Role"><input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="inp" /></Field>
                <Field label="Company"><input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="inp" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="inp" /></Field>
                <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="inp" /></Field>
              </div>
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="inp">
                  {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Relationship Context"><textarea rows={2} value={form.relationship_context} onChange={(e) => setForm({ ...form, relationship_context: e.target.value })} className="inp" /></Field>
              <Field label="Investment Connection"><input value={form.investment_connection} onChange={(e) => setForm({ ...form, investment_connection: e.target.value })} className="inp" /></Field>
              <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" /></Field>
              <Field label="Last Contact Date"><input type="date" value={form.last_contact_date} onChange={(e) => setForm({ ...form, last_contact_date: e.target.value })} className="inp" /></Field>
            </div>
            <div className="border-t border-border px-5 py-4 flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving…" : editing ? "Update" : "Add Contact"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.inp { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid var(--color-input, #e2e8f0); background: var(--color-background); padding: 0.375rem 0.75rem; font-size: 0.875rem; } .inp:focus { outline: none; border-color: #1e3a5f; }`}</style>
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
