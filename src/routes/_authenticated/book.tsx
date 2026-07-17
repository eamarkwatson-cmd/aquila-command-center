import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Wand2, Copy, Check, Loader2, Linkedin, Globe, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/book")({
  component: BookPage,
});

// ─── Mark's pre-loaded website content ───────────────────────────────────────
const WEBSITE_CONTENT = `
MARK E. WATSON III — BIOGRAPHY (markewatsoniii.com)
Serial entrepreneur, impact investor, philanthropist. 25+ years as entrepreneur, investor, advisor. Ran 2 public companies — saved one from insolvency, turned it into a $10B asset market leader. Acquired dozens of companies public and private. Hired thousands of people. Navigated major world crises. Started as a boy with a paper route who bought candy and resold it for profit. At age 11 bought first stock — Walt Disney — which taught him early about investment and return. Co-founded Aquila Capital Partners in 1998. Wife AnaPaula is also his business partner. Together devoted to philanthropy helping disadvantaged children. YPO member. Featured in Inc, Newsweek, Bloomberg, HBS Online, EY Awards.

AQUILA CAPITAL PARTNERS (aquilavc.com)
Founded 1998 by Mark E. Watson III. Philosophy: "0 to 1 to 10" — for entrepreneurs who have taken their company from 0 to 1, Aquila helps them take it from 1 to 10. Entrepreneur-to-entrepreneur approach — Mark provides both financial and intellectual capital. Investment areas: FinTech/InsurTech, BioTech, AI, DTC Brands. Funding focus: seed and early stage, $1M to $150M in revenue. Specialties: product development, go-to-market strategy, scaling, management, supply chain. Portfolio: Kraken, Plaid, Fintron (FinTech), Leap, Eve, Embroker (InsurTech), Barefoot Scientist, Alps & Meters, Alastin, Grubmarket (Consumer), Xsphera Biosciences (BioTech), NLX (AI).

LEADER'S TOOLKIT — KEY THEMES
Leadership: Transcends task execution. Journey from managing details to envisioning futures. Difference between team leader and enterprise leader is not scale — it is a fundamental shift in thinking, communication, and decision-making.
Communication: Hardly anyone reads emails. Three-sentence rule: state the problem, state what you need, state the deadline. Communication is about what the other person understands, not what you say.
Future of Work: From Boomers to Zoomers — generational challenge is adapt or get left behind. Future of work is not about where you work, it is about how you create value. Remote work and AI agents are infrastructure, not trends.
Productivity: Delegation is not abdication — it is multiplication. If you are doing work someone else could do at 80% of your quality, you are the bottleneck. Protect your calendar like it is your most valuable asset.
Succession: Essential for continuity yet fraught with complexity. Companies wait too long. Great leaders build systems that outlast them.
Adaptability: The most adaptable companies and leaders thrive in disruption — not the smartest ones. Adaptability is the ultimate hard skill. AI is not coming for your job — someone who knows how to use AI is.
Mentorship: The best mentors do not give you all the answers — they ask you the right questions. A mentor relationship is two-way. The most valuable thing a mentor gives is perspective.

INVESTING PHILOSOPHY
I judge businesses the same way I judge people — by their track record, their character, and their capacity for growth. The best investments I have made were not in the best ideas. They were in the best operators. A mediocre idea with a great team beats a great idea with a mediocre team every time. The entrepreneur-to-entrepreneur model means I have been where you are. I know what it is like to stare at a payroll you cannot make. I know what it is like to make a bet that could take the whole company down.
`;

const CHAPTERS = [
  { id: "origin", label: "Origin story", desc: "From paper route to $10B — early lessons in money and risk" },
  { id: "enterprise", label: "Building enterprises", desc: "Running public companies, saving one from insolvency, scaling" },
  { id: "aquila", label: "The Aquila model", desc: "0 to 1 to 10 — entrepreneur-to-entrepreneur investing" },
  { id: "leadership", label: "Leadership at scale", desc: "From team leader to enterprise leader — the real shift" },
  { id: "delegation", label: "The art of delegation", desc: "Why delegation is multiplication, not abdication" },
  { id: "communication", label: "Communication", desc: "The three-sentence rule and why nobody reads your emails" },
  { id: "ai", label: "AI and the operating model", desc: "Not a tool problem — a management and infrastructure problem" },
  { id: "adaptability", label: "Adaptability", desc: "The ultimate hard skill in a world of constant disruption" },
  { id: "investing", label: "Investing in people", desc: "Why the best deals are about operators, not ideas" },
  { id: "mentorship", label: "Mentorship", desc: "What the best mentors actually do — and how to find them" },
  { id: "philanthropy", label: "Purpose beyond profit", desc: "Impact investing and giving disadvantaged children a shot" },
  { id: "custom", label: "Custom section", desc: "Write your own prompt for any part of the book" },
];

const TONES = [
  { id: "first", label: "First person (Mark's voice)" },
  { id: "narrative", label: "Third person narrative" },
  { id: "framework", label: "Practical framework" },
  { id: "story", label: "Story-driven" },
];

const LENGTHS = [
  { id: "short", label: "~300 words — opening" },
  { id: "medium", label: "~600 words — full section" },
  { id: "long", label: "~1000 words — deep chapter" },
];

function BookPage() {
  const [chapter, setChapter] = useState<string | null>(null);
  const [tone, setTone] = useState("first");
  const [length, setLength] = useState("medium");
  const [customPrompt, setCustomPrompt] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useLinkedIn, setUseLinkedIn] = useState(true);

  // Pull LinkedIn posts from Notion pipeline as context
  const { data: pipelineData, isLoading: loadingPipeline } = useQuery({
    queryKey: ["book-linkedin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("notion-list-pipeline");
      if (error) return [];
      return (data as any)?.posts ?? [];
    },
  });

  const linkedInContext = useLinkedIn && pipelineData?.length
    ? `\n\nMARK'S LINKEDIN POSTS (recent content and voice):\n${pipelineData
        .filter((p: any) => p.finalCaption)
        .slice(0, 8)
        .map((p: any) => `Title: ${p.title}\n${p.finalCaption}`)
        .join("\n\n---\n\n")}`
    : "";

  function buildPrompt() {
    const meta = CHAPTERS.find(c => c.id === chapter);
    const wordTargets: Record<string, number> = { short: 300, medium: 600, long: 1000 };
    const toneInstructions: Record<string, string> = {
      first: "Write in first person directly as Mark Watson. Use 'I' throughout. Confident, direct, experience-based. No hedging. Use specific anecdotes and real numbers where available.",
      narrative: "Write in third person narrative. Tell Mark Watson's story engagingly, documentary-style prose.",
      framework: "Write as a practical how-to framework grounded in Mark's principles and experience. Structured and actionable.",
      story: "Lead with a specific story or anecdote, then draw out the principle. Show before tell.",
    };
    const sectionPrompt = chapter === "custom"
      ? customPrompt
      : `Write a book manuscript section on: "${meta?.label} — ${meta?.desc}"`;

    return `You are ghostwriting a business leadership book for Mark E. Watson III. Here is everything you know about Mark:

${WEBSITE_CONTENT}${linkedInContext}

${additionalContext ? `ADDITIONAL CONTEXT FROM MARK:\n${additionalContext}\n\n` : ""}
TASK: ${sectionPrompt}

TONE: ${toneInstructions[tone]}

TARGET LENGTH: Approximately ${wordTargets[length]} words.

STYLE RULES:
- Write in Mark's authentic voice — direct, no fluff, experience-driven
- Lead with something specific, not a generic statement
- Use concrete examples and real numbers where possible
- No corporate clichés or filler
- Every paragraph earns its place
- End with something that makes the reader want to keep reading

Output only the manuscript text — no meta-commentary or preamble.`;
  }

  async function generate() {
    if (!chapter) { toast.error("Select a chapter first"); return; }
    if (chapter === "custom" && !customPrompt.trim()) { toast.error("Enter a custom prompt"); return; }
    setLoading(true); setOutput("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1500,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      setOutput(data.content?.[0]?.text ?? "No output returned.");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    }
    setLoading(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Book Generator</h2>
          <p className="text-sm text-muted-foreground">AI-powered manuscript writer using Mark's websites and LinkedIn content.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe className="h-3.5 w-3.5" />
          <span>markewatsoniii.com + aquilavc.com</span>
          {pipelineData?.length > 0 && (
            <>
              <span>·</span>
              <Linkedin className="h-3.5 w-3.5 text-blue-600" />
              <span>{pipelineData.filter((p: any) => p.finalCaption).length} LinkedIn posts loaded</span>
            </>
          )}
          {loadingPipeline && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT — Controls */}
        <div className="space-y-5">
          {/* Chapter */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">1 — Choose a section</div>
            <div className="space-y-1.5">
              {CHAPTERS.map((c) => (
                <button key={c.id} onClick={() => setChapter(c.id)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-all",
                    chapter === c.id
                      ? "border-navy bg-navy/5"
                      : "border-border bg-background hover:bg-muted/40"
                  )}>
                  <BookOpen className={cn("h-4 w-4 mt-0.5 shrink-0", chapter === c.id ? "text-navy" : "text-muted-foreground")} />
                  <div>
                    <div className={cn("text-sm font-medium", chapter === c.id ? "text-navy" : "text-foreground")}>{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {chapter === "custom" && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your prompt</div>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                placeholder="E.g. Write a section about the moment I nearly lost the company and what I learned"
                rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy" />
            </div>
          )}

          {/* Tone */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">2 — Tone</div>
            <div className="space-y-1.5">
              {TONES.map(t => (
                <label key={t.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input type="radio" name="tone" value={t.id} checked={tone === t.id} onChange={() => setTone(t.id)} className="accent-navy" />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          {/* Length */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">3 — Length</div>
            <div className="space-y-1.5">
              {LENGTHS.map(l => (
                <label key={l.id} className="flex items-center gap-2.5 cursor-pointer text-sm">
                  <input type="radio" name="length" value={l.id} checked={length === l.id} onChange={() => setLength(l.id)} className="accent-navy" />
                  {l.label}
                </label>
              ))}
            </div>
          </div>

          {/* LinkedIn toggle */}
          {pipelineData?.length > 0 && (
            <label className="flex items-center gap-2.5 cursor-pointer text-sm">
              <input type="checkbox" checked={useLinkedIn} onChange={e => setUseLinkedIn(e.target.checked)} className="accent-navy" />
              <Linkedin className="h-3.5 w-3.5 text-blue-600" />
              Include LinkedIn posts as context
            </label>
          )}

          {/* Additional context */}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">4 — Add context (optional)</div>
            <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)}
              placeholder="Paste notes, specific stories, or anything Mark wants incorporated…"
              rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:border-navy" />
          </div>

          <button onClick={generate} disabled={loading || !chapter}
            className={cn(
              "w-full flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition",
              loading || !chapter
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-navy text-white hover:opacity-90"
            )}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Wand2 className="h-4 w-4" /> Generate section</>}
          </button>
        </div>

        {/* RIGHT — Output */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manuscript output</div>
            {output && (
              <div className="flex items-center gap-2">
                <button onClick={generate} disabled={loading}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-muted">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
                <button onClick={copy}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition",
                    copied ? "border-green-300 bg-green-50 text-green-700" : "border-border bg-background hover:bg-muted text-muted-foreground"
                  )}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            "min-h-[520px] rounded-lg border border-border p-5 text-sm leading-relaxed",
            "bg-background font-serif",
            !output && "flex items-center justify-center"
          )}>
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs font-sans">Writing your manuscript section…</span>
              </div>
            ) : output ? (
              <div className="whitespace-pre-wrap text-foreground">{output}</div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8" />
                <span className="font-sans text-sm">Select a section and generate</span>
                <span className="font-sans text-xs max-w-[200px]">Your manuscript section will appear here</span>
              </div>
            )}
          </div>

          {output && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Next step:</strong> Copy into Google Docs and edit in Mark's voice. Paste refined text back into "Add context" and regenerate to improve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
