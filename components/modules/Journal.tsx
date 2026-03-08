"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate } from "@/lib/utils";

type EntryType = "morning" | "evening" | "extended";
type PromptType = "text" | "scale" | "select" | "multiselect";

interface Prompt {
  id: string;
  question: string;
  type: PromptType;
  options?: string[];
}

interface JournalEntry {
  id: string;
  date: string;
  entry_type: EntryType;
  mood_score: number | null;
  energy_score: number | null;
  responses: Record<string, unknown>;
  voice_note_url: string | null;
  updated_at: string;
}

interface JournalTag {
  id: string;
  name: string;
  color: string;
}

const ENTRY_TYPES: EntryType[] = ["morning", "evening", "extended"];

const FALLBACK_TEMPLATES: Record<EntryType, Prompt[]> = {
  morning: [
    { id: "top_priority", question: "Top priority for today", type: "text" },
    { id: "intention", question: "Daily intention", type: "text" },
    { id: "focus_area", question: "Main focus area", type: "select", options: ["Work", "Study", "Health", "Relationships"] },
  ],
  evening: [
    { id: "wins", question: "What went well today?", type: "text" },
    { id: "lesson", question: "What did I learn?", type: "text" },
    { id: "gratitude", question: "One gratitude", type: "text" },
  ],
  extended: [
    { id: "reflection", question: "Deep reflection", type: "text" },
    { id: "stress_level", question: "Stress level", type: "scale" },
    { id: "themes", question: "Themes", type: "multiselect", options: ["Career", "Money", "Habits", "Family", "Mindset"] },
  ],
};

export default function Journal() {
  const { user } = useAuth();
  const today = getPKTDate();

  const [entryType, setEntryType] = useState<EntryType>("morning");
  const [entryDate, setEntryDate] = useState(today);
  const [prompts, setPrompts] = useState<Prompt[]>(FALLBACK_TEMPLATES.morning);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [moodScore, setMoodScore] = useState(5);
  const [energyScore, setEnergyScore] = useState(5);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [voiceNoteUrl, setVoiceNoteUrl] = useState("");
  const [tags, setTags] = useState<JournalTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const activePrompts = useMemo(() => (prompts.length > 0 ? prompts : FALLBACK_TEMPLATES[entryType]), [prompts, entryType]);

  useEffect(() => {
    if (!user) return;
    loadPrompts(entryType);
    loadTags();
    loadEntry();
    loadRecentEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, entryType, entryDate]);

  const resetForm = () => {
    setEntryId(null);
    setMoodScore(5);
    setEnergyScore(5);
    setResponses({});
    setVoiceNoteUrl("");
    setSelectedTagIds([]);
  };

  const loadPrompts = async (type: EntryType) => {
    const { data } = await supabase
      .from("journal_templates")
      .select("prompts")
      .eq("entry_type", type)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const dbPrompts = Array.isArray(data?.prompts) ? (data?.prompts as Prompt[]) : [];
    setPrompts(dbPrompts.length > 0 ? dbPrompts : FALLBACK_TEMPLATES[type]);
  };

  const loadTags = async () => {
    if (!user) return;
    const { data } = await supabase.from("journal_tags").select("*").eq("user_id", user.id).order("name");
    setTags(data || []);
  };

  const loadEntry = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", entryDate)
      .eq("entry_type", entryType)
      .maybeSingle();

    if (!data) {
      resetForm();
      return;
    }

    setEntryId(data.id);
    setMoodScore(data.mood_score || 5);
    setEnergyScore(data.energy_score || 5);
    setResponses((data.responses as Record<string, unknown>) || {});
    setVoiceNoteUrl(data.voice_note_url || "");

    const { data: tagLinks } = await supabase.from("journal_entry_tags").select("tag_id").eq("entry_id", data.id);
    setSelectedTagIds((tagLinks || []).map((t) => t.tag_id));
  };

  const loadRecentEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("journal_entries")
      .select("id, date, entry_type, mood_score, energy_score, responses, voice_note_url, updated_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(8);
    setRecentEntries((data as JournalEntry[]) || []);
  };

  const updateResponse = (id: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const toggleMulti = (id: string, option: string) => {
    const current = Array.isArray(responses[id]) ? (responses[id] as string[]) : [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    updateResponse(id, next);
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]));
  };

  const createTag = async () => {
    if (!user || !newTagName.trim()) return;
    const { data } = await supabase
      .from("journal_tags")
      .insert({ user_id: user.id, name: newTagName.trim() })
      .select("*")
      .maybeSingle();
    if (data) {
      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTagIds((prev) => [...prev, data.id]);
    }
    setNewTagName("");
  };

  const saveEntry = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      date: entryDate,
      entry_type: entryType,
      mood_score: moodScore,
      energy_score: energyScore,
      responses,
      voice_note_url: voiceNoteUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("journal_entries")
      .upsert(payload, { onConflict: "user_id,date,entry_type" })
      .select("id")
      .single();

    if (error || !data?.id) {
      setSaving(false);
      return;
    }

    await supabase.from("journal_entry_tags").delete().eq("entry_id", data.id);
    if (selectedTagIds.length > 0) {
      await supabase.from("journal_entry_tags").insert(selectedTagIds.map((tagId) => ({ entry_id: data.id, tag_id: tagId })));
    }

    setEntryId(data.id);
    setSaving(false);
    loadRecentEntries();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Journal</h1>
          <p className="text-body" style={{ color: "var(--text-muted)" }}>Daily morning/evening reflections and extended journaling</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ENTRY_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setEntryType(type)}
            className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider"
            style={{ borderColor: entryType === type ? "var(--accent)" : "var(--border)", color: entryType === type ? "var(--accent)" : "var(--text-muted)" }}
          >
            {type}
          </button>
        ))}
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="input-brutal w-44 ml-auto" />
      </div>

      <div className="card-brutal p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="label-caps block mb-1 text-[10px]">Mood (1-10)</label>
            <input type="number" min={1} max={10} value={moodScore} onChange={(e) => setMoodScore(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)))} className="input-brutal" />
          </div>
          <div>
            <label className="label-caps block mb-1 text-[10px]">Energy (1-10)</label>
            <input type="number" min={1} max={10} value={energyScore} onChange={(e) => setEnergyScore(Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 1)))} className="input-brutal" />
          </div>
        </div>

        {activePrompts.map((p) => (
          <div key={p.id}>
            <label className="label-caps block mb-2 text-[10px]">{p.question}</label>
            {p.type === "text" && (
              <textarea
                rows={3}
                className="input-brutal"
                value={String(responses[p.id] || "")}
                onChange={(e) => updateResponse(p.id, e.target.value)}
              />
            )}
            {p.type === "scale" && (
              <input
                type="number"
                min={1}
                max={10}
                className="input-brutal"
                value={String(responses[p.id] || "")}
                onChange={(e) => updateResponse(p.id, parseInt(e.target.value, 10) || 0)}
              />
            )}
            {p.type === "select" && (
              <select
                className="input-brutal"
                value={String(responses[p.id] || "")}
                onChange={(e) => updateResponse(p.id, e.target.value)}
              >
                <option value="">Select</option>
                {(p.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {p.type === "multiselect" && (
              <div className="flex gap-2 flex-wrap">
                {(p.options || []).map((o) => {
                  const selected = Array.isArray(responses[p.id]) && (responses[p.id] as string[]).includes(o);
                  return (
                    <button
                      key={o}
                      onClick={() => toggleMulti(p.id, o)}
                      className="px-2 py-1 border-2 text-[10px] font-bold uppercase"
                      style={{ borderColor: selected ? "var(--accent)" : "var(--border)", color: selected ? "var(--accent)" : "var(--text-muted)" }}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div>
          <label className="label-caps block mb-1 text-[10px]">Voice note URL (optional)</label>
          <input value={voiceNoteUrl} onChange={(e) => setVoiceNoteUrl(e.target.value)} className="input-brutal" placeholder="https://..." />
        </div>

        <div>
          <label className="label-caps block mb-2 text-[10px]">Tags</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className="px-2 py-1 border-2 text-[10px] font-bold uppercase"
                  style={{ borderColor: selected ? tag.color || "var(--accent)" : "var(--border)", color: selected ? tag.color || "var(--accent)" : "var(--text-muted)" }}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="input-brutal" placeholder="New tag name" />
            <button onClick={createTag} className="btn-secondary text-xs px-3">ADD TAG</button>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={resetForm} className="btn-secondary text-xs">RESET</button>
          <button onClick={saveEntry} className="btn-primary text-xs">{saving ? "SAVING..." : entryId ? "UPDATE ENTRY" : "SAVE ENTRY"}</button>
        </div>
      </div>

      <div className="card-brutal p-4">
        <h3 className="label-caps mb-3">RECENT ENTRIES</h3>
        {recentEntries.length === 0 ? (
          <p className="font-display text-h4" style={{ color: "var(--text-muted)" }}>No journal entries yet.</p>
        ) : (
          <div className="space-y-2">
            {recentEntries.map((entry) => (
              <button
                key={entry.id}
                className="w-full text-left border-2 p-3"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                onClick={() => {
                  setEntryDate(entry.date);
                  setEntryType(entry.entry_type);
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="label-caps">{entry.date} · {entry.entry_type}</span>
                  <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>Mood {entry.mood_score || "-"} / Energy {entry.energy_score || "-"}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
