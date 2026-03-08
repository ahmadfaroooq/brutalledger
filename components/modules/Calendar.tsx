"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, formatDateShort } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeBlock {
  id: string;
  user_id: string;
  title: string;
  date: string;
  start_time: string; // "HH:MM:00"
  end_time: string;
  color: string;
  category: string;
  notes: string | null;
}

type View = "week" | "day";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_START = 6;   // 6 AM
const HOUR_END = 23;    // 11 PM
const SLOT_HEIGHT = 40; // px per 30 minutes
const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60; // 1020 min

const CATEGORIES: { label: string; color: string }[] = [
  { label: "Focus",    color: "#6FAE2B" },
  { label: "Meeting",  color: "#E85A1A" },
  { label: "Exercise", color: "#3B82F6" },
  { label: "Study",    color: "#8B5CF6" },
  { label: "Personal", color: "#F59E0B" },
  { label: "Outreach", color: "#EC4899" },
  { label: "Finance",  color: "#10B981" },
];

const DAYS_SHORT = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function topPx(startTime: string): number {
  const mins = timeToMinutes(startTime) - HOUR_START * 60;
  return (mins / 30) * SLOT_HEIGHT;
}

function heightPx(startTime: string, endTime: string): number {
  const dur = timeToMinutes(endTime) - timeToMinutes(startTime);
  return Math.max((dur / 30) * SLOT_HEIGHT, SLOT_HEIGHT / 2);
}

function slotTimeFromY(y: number): string {
  const slot = Math.floor(y / SLOT_HEIGHT);
  const mins = HOUR_START * 60 + slot * 30;
  return minutesToTime(Math.min(mins, HOUR_END * 60 - 30));
}

function categoryColor(cat: string): string {
  return CATEGORIES.find((c) => c.label === cat)?.color ?? "#6FAE2B";
}

function weekLabel(monday: string): string {
  const sunday = addDays(monday, 6);
  const s = new Date(monday + "T00:00:00");
  const e = new Date(sunday + "T00:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (s.getMonth() === e.getMonth()) {
    return `${months[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
  }
  return `${months[s.getMonth()]} ${s.getDate()} – ${months[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  block?: TimeBlock;
  date?: string;
  startTime?: string;
}

const EMPTY_FORM = {
  title: "",
  date: "",
  start_time: "09:00",
  end_time: "10:00",
  category: "Focus",
  notes: "",
};

function BlockModal({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: ModalState;
  onClose: () => void;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (state.mode === "edit" && state.block) {
      const b = state.block;
      setForm({
        title: b.title,
        date: b.date,
        start_time: b.start_time.slice(0, 5),
        end_time: b.end_time.slice(0, 5),
        category: b.category,
        notes: b.notes ?? "",
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        date: state.date ?? getPKTDate(),
        start_time: state.startTime ?? "09:00",
        end_time: minutesToTime(
          Math.min(
            timeToMinutes(state.startTime ?? "09:00") + 60,
            HOUR_END * 60
          )
        ),
      });
    }
  }, [state]);

  const set = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const color = categoryColor(form.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card-brutal w-full max-w-md"
        style={{ background: "var(--surface)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 border-2"
              style={{ background: color, borderColor: "var(--border)" }}
            />
            <span className="label-caps">
              {state.mode === "create" ? "NEW BLOCK" : "EDIT BLOCK"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-lg font-bold leading-none"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="label-caps block mb-1">Title *</label>
            <input
              className="input-brutal w-full"
              placeholder="Deep work session..."
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="label-caps block mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.label}
                  onClick={() => set("category", cat.label)}
                  className="px-2 py-1 text-[11px] font-bold uppercase border-2 tracking-wide transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
                  style={{
                    background: form.category === cat.label ? cat.color : "transparent",
                    borderColor: cat.color,
                    color: form.category === cat.label ? "#fff" : cat.color,
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Times */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 md:col-span-1">
              <label className="label-caps block mb-1">Date</label>
              <input
                type="date"
                className="input-brutal w-full"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </div>
            <div>
              <label className="label-caps block mb-1">Start</label>
              <input
                type="time"
                className="input-brutal w-full"
                value={form.start_time}
                onChange={(e) => set("start_time", e.target.value)}
              />
            </div>
            <div>
              <label className="label-caps block mb-1">End</label>
              <input
                type="time"
                className="input-brutal w-full"
                value={form.end_time}
                onChange={(e) => set("end_time", e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label-caps block mb-1">Notes</label>
            <textarea
              className="input-brutal w-full resize-none"
              rows={2}
              placeholder="Optional notes..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="btn-primary flex-1"
            >
              {saving ? "SAVING..." : state.mode === "create" ? "CREATE BLOCK" : "SAVE CHANGES"}
            </button>
            {state.mode === "edit" && state.block && (
              <button
                onClick={() => state.block && onDelete(state.block.id)}
                className="btn-destructive px-3"
              >
                DELETE
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day Column ───────────────────────────────────────────────────────────────

function DayColumn({
  date,
  blocks,
  isToday,
  onClick,
  onBlockClick,
}: {
  date: string;
  blocks: TimeBlock[];
  isToday: boolean;
  onClick: (date: string, time: string) => void;
  onBlockClick: (block: TimeBlock) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);

  const totalHeight = ((HOUR_END - HOUR_START) * 60 / 30) * SLOT_HEIGHT;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a block
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    const rect = colRef.current!.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const time = slotTimeFromY(y);
    onClick(date, time);
  };

  return (
    <div
      ref={colRef}
      className="relative border-l-2 cursor-crosshair"
      style={{
        borderColor: "var(--border)",
        height: totalHeight,
        minWidth: 0,
      }}
      onClick={handleClick}
    >
      {/* 30-min slot lines */}
      {Array.from({ length: (HOUR_END - HOUR_START) * 2 }).map((_, i) => (
        <div
          key={i}
          className="absolute left-0 right-0"
          style={{
            top: i * SLOT_HEIGHT,
            height: SLOT_HEIGHT,
            borderBottom: i % 2 === 1
              ? `1px solid var(--border)`
              : `1px dashed var(--border)`,
            opacity: 0.35,
          }}
        />
      ))}

      {/* Today highlight */}
      {isToday && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "var(--accent)", opacity: 0.04 }}
        />
      )}

      {/* Blocks */}
      {blocks.map((b) => {
        const top = topPx(b.start_time);
        const height = heightPx(b.start_time, b.end_time);
        const color = b.color || categoryColor(b.category);
        const dur = timeToMinutes(b.end_time) - timeToMinutes(b.start_time);

        return (
          <div
            key={b.id}
            data-block="true"
            onClick={(e) => { e.stopPropagation(); onBlockClick(b); }}
            className="absolute left-1 right-1 border-2 overflow-hidden cursor-pointer transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            style={{
              top,
              height,
              background: color + "22",
              borderColor: color,
              borderLeft: `3px solid ${color}`,
            }}
          >
            <div className="px-1 pt-0.5 leading-tight overflow-hidden h-full">
              <p
                className="font-bold truncate"
                style={{
                  fontSize: height < 30 ? "9px" : "10px",
                  color,
                  fontFamily: "var(--font-inter)",
                }}
              >
                {b.title}
              </p>
              {height >= 36 && (
                <p
                  className="truncate"
                  style={{ fontSize: "9px", color, opacity: 0.8, fontFamily: "var(--font-inter)" }}
                >
                  {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                  {dur >= 60 && ` · ${Math.floor(dur / 60)}h${dur % 60 ? `${dur % 60}m` : ""}`}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Subscribe Panel ──────────────────────────────────────────────────────────

function SubscribePanel({ userId }: { userId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken();
  }, [userId]);

  const loadToken = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("calendar_tokens")
      .select("token")
      .eq("user_id", userId)
      .single();

    if (data) {
      setToken(data.token);
    } else {
      // Auto-create token
      const { data: created } = await supabase
        .from("calendar_tokens")
        .insert({ user_id: userId })
        .select("token")
        .single();
      if (created) setToken(created.token);
    }
    setLoading(false);
  };

  const regenerate = async () => {
    await supabase.from("calendar_tokens").delete().eq("user_id", userId);
    const { data } = await supabase
      .from("calendar_tokens")
      .insert({ user_id: userId })
      .select("token")
      .single();
    if (data) setToken(data.token);
  };

  const feedUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar?token=${token}`
    : "";

  const copy = () => {
    navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-brutal p-4 mt-6" style={{ background: "var(--surface)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">📅</span>
        <span className="label-caps">Subscribe to Calendar</span>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generating your feed URL...</p>
      ) : (
        <>
          <div
            className="border-2 p-2 mb-3 font-mono text-xs break-all select-all"
            style={{
              borderColor: "var(--border)",
              background: "var(--bg)",
              color: "var(--text-muted)",
            }}
          >
            {feedUrl}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={copy} className="btn-primary text-xs py-1.5 px-3">
              {copied ? "COPIED ✓" : "COPY URL"}
            </button>
            <button onClick={regenerate} className="btn-secondary text-xs py-1.5 px-3">
              REGENERATE
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <div
              className="border-2 p-2"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-primary)", fontSize: "10px" }}>
                Google Calendar
              </p>
              <p>Other calendars → + → From URL → paste URL → Add Calendar</p>
            </div>
            <div
              className="border-2 p-2"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-bold uppercase tracking-wide mb-1" style={{ color: "var(--text-primary)", fontSize: "10px" }}>
                Apple Calendar
              </p>
              <p>File → New Calendar Subscription → paste URL → Subscribe</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Calendar() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(getPKTDate);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create" });
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = getPKTDate();
  const monday = getMonday(currentDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // Scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      const scrollTop = ((8 - HOUR_START) * 60 / 30) * SLOT_HEIGHT - 40;
      scrollRef.current.scrollTop = scrollTop;
    }
  }, []);

  useEffect(() => {
    if (user) loadBlocks();
  }, [user, currentDate, view]);

  const loadBlocks = async () => {
    if (!user) return;
    let query = supabase
      .from("time_blocks")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time");

    if (view === "week") {
      query = query.gte("date", monday).lte("date", addDays(monday, 6));
    } else {
      query = query.eq("date", currentDate);
    }

    const { data } = await query;
    if (data) setBlocks(data);
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "week") {
      setCurrentDate((d) => addDays(getMonday(d), dir * 7));
    } else {
      setCurrentDate((d) => addDays(d, dir));
    }
  };

  const openCreate = (date: string, startTime: string) => {
    setModal({ open: true, mode: "create", date, startTime });
  };

  const openEdit = (block: TimeBlock) => {
    setModal({ open: true, mode: "edit", block });
  };

  const closeModal = () => setModal({ open: false, mode: "create" });

  const handleSave = async (form: typeof EMPTY_FORM) => {
    if (!user) return;
    if (modal.mode === "create") {
      await supabase.from("time_blocks").insert({
        user_id: user.id,
        title: form.title,
        date: form.date,
        start_time: form.start_time + ":00",
        end_time: form.end_time + ":00",
        color: categoryColor(form.category),
        category: form.category,
        notes: form.notes || null,
      });
    } else if (modal.block) {
      await supabase
        .from("time_blocks")
        .update({
          title: form.title,
          date: form.date,
          start_time: form.start_time + ":00",
          end_time: form.end_time + ":00",
          color: categoryColor(form.category),
          category: form.category,
          notes: form.notes || null,
        })
        .eq("id", modal.block.id);
    }
    closeModal();
    loadBlocks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("time_blocks").delete().eq("id", id);
    closeModal();
    loadBlocks();
  };

  const blocksForDate = (date: string) =>
    blocks.filter((b) => b.date === date);

  const totalHeight = ((HOUR_END - HOUR_START) * 60 / 30) * SLOT_HEIGHT;

  // Date label for nav
  const navLabel =
    view === "week"
      ? weekLabel(monday)
      : (() => {
          const d = new Date(currentDate + "T00:00:00");
          return d.toLocaleDateString("en-PK", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
        })();

  const displayDates = view === "week" ? weekDates : [currentDate];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-h3" style={{ color: "var(--text-primary)" }}>
            CALENDAR
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Time blocking · Click any slot to add a block
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex border-2" style={{ borderColor: "var(--border)" }}>
            {(["week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-label transition-colors"
                style={{
                  background: view === v ? "var(--accent)" : "var(--surface)",
                  color: view === v ? "#fff" : "var(--text-muted)",
                  fontFamily: "var(--font-inter)",
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 border-2 flex items-center justify-center font-bold transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(getPKTDate())}
              className="px-2 h-8 border-2 text-[10px] font-bold uppercase tracking-label transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
              style={{ borderColor: "var(--border)", color: "var(--accent)", background: "var(--surface)", fontFamily: "var(--font-inter)" }}
            >
              TODAY
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-8 h-8 border-2 flex items-center justify-center font-bold transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
              style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
            >
              →
            </button>
          </div>

          {/* Date range label */}
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-inter)" }}
          >
            {navLabel}
          </span>
        </div>
      </div>

      {/* Calendar grid */}
      <div
        className="card-brutal overflow-hidden"
        style={{ background: "var(--surface)" }}
      >
        {/* Day header row */}
        <div
          className="flex border-b-2"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Time gutter label */}
          <div
            className="flex-shrink-0 border-r-2 flex items-end pb-2 px-2"
            style={{
              width: 52,
              borderColor: "var(--border)",
              background: "var(--surface)",
            }}
          >
            <span className="label-caps text-[9px]">TIME</span>
          </div>
          {displayDates.map((date) => {
            const isToday = date === today;
            const d = new Date(date + "T00:00:00");
            const dayIdx = d.getDay(); // 0=Sun
            const dayLabel = view === "week"
              ? DAYS_SHORT[(dayIdx + 6) % 7] // Mon=0
              : d.toLocaleDateString("en-PK", { weekday: "short" }).toUpperCase();

            return (
              <div
                key={date}
                className="flex-1 min-w-0 py-2 px-1 text-center border-l-2"
                style={{
                  borderColor: "var(--border)",
                  background: isToday ? "var(--accent)" + "18" : "transparent",
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-label"
                  style={{
                    color: isToday ? "var(--accent)" : "var(--text-muted)",
                    fontFamily: "var(--font-inter)",
                  }}
                >
                  {dayLabel}
                </p>
                <p
                  className="font-display text-lg leading-tight"
                  style={{ color: isToday ? "var(--accent)" : "var(--text-primary)" }}
                >
                  {d.getDate()}
                </p>
                <p
                  className="text-[9px] uppercase"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
                >
                  {formatDateShort(date).split(" ")[0]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Scrollable time body */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ maxHeight: "65vh" }}
        >
          <div className="flex" style={{ height: totalHeight }}>
            {/* Time gutter */}
            <div
              className="flex-shrink-0 relative border-r-2"
              style={{
                width: 52,
                height: totalHeight,
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute right-0 pr-1.5 flex items-start"
                  style={{ top: i * SLOT_HEIGHT * 2 - 6, height: SLOT_HEIGHT * 2 }}
                >
                  <span
                    className="text-[9px] font-bold whitespace-nowrap"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
                  >
                    {formatHour(HOUR_START + i)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {displayDates.map((date) => (
              <div key={date} className="flex-1 min-w-0" style={{ height: totalHeight }}>
                <DayColumn
                  date={date}
                  blocks={blocksForDate(date)}
                  isToday={date === today}
                  onClick={openCreate}
                  onBlockClick={openEdit}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 border"
              style={{ background: cat.color + "44", borderColor: cat.color }}
            />
            <span
              className="text-[10px] uppercase font-bold tracking-wide"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}
            >
              {cat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Subscribe panel */}
      {user && <SubscribePanel userId={user.id} />}

      {/* Modal */}
      {modal.open && (
        <BlockModal
          state={modal}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
