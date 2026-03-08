"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, calculateDuration, formatDuration, getWeekStart, getDaysInRange, formatDateShort, getWeekEnd } from "@/lib/utils";

interface SleepSlot {
  id?: string;
  slot_number: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export default function Sleep() {
  const { user } = useAuth();
  const today = getPKTDate();
  const [slots, setSlots] = useState<SleepSlot[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ date: string; hours: number }[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("PM");
  const [endTime, setEndTime] = useState("");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (!user) return;
    loadSlots();
    loadWeekly();
  }, [user]);

  const loadSlots = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("sleep_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .order("slot_number");
    setSlots(data || []);
    checkWarnings(data || []);
  };

  const loadWeekly = async () => {
    if (!user) return;
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(weekStart);
    const days = getDaysInRange(weekStart, weekEnd);

    const { data } = await supabase
      .from("sleep_log")
      .select("date, duration_minutes")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    const weekly = days.map((d) => {
      const daySlots = data?.filter((r) => r.date === d) || [];
      const totalMins = daySlots.reduce((s, r) => s + r.duration_minutes, 0);
      return { date: d, hours: Math.round((totalMins / 60) * 10) / 10 };
    });
    setWeeklyData(weekly);
  };

  const checkWarnings = async (currentSlots: SleepSlot[]) => {
    if (!user) return;
    const w: string[] = [];
    const totalMins = currentSlots.reduce((s, r) => s + r.duration_minutes, 0);
    const totalHours = totalMins / 60;

    if (totalHours > 0 && totalHours < 5) w.push("LOW SLEEP — cognitive performance impaired today");
    if (currentSlots.length > 2) w.push("FRAGMENTED SLEEP — high nap count signals poor main sleep");
    if (totalHours > 10) w.push("OVERSLEEPING — check energy levels and mood");

    // Check 3 consecutive late nights
    const threeDaysAgo = new Date(today + "T00:00:00");
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
    const { data: recentSleep } = await supabase
      .from("sleep_log")
      .select("date, start_time")
      .eq("user_id", user.id)
      .eq("slot_number", 1)
      .gte("date", threeDaysAgo.toISOString().split("T")[0])
      .order("date");

    if (recentSleep && recentSleep.length >= 3) {
      const allLate = recentSleep.every((r) => {
        const match = r.start_time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) return false;
        let h = parseInt(match[1]);
        const p = match[3].toUpperCase();
        if (p === "AM" && h >= 2 && h < 12) return true;
        return false;
      });
      if (allLate) w.push("LATE SLEEP PATTERN — 3 consecutive nights past 2AM");
    }

    setWarnings(w);
  };

  const saveSlot = async () => {
    if (!user || !startTime || !endTime) return;
    const fullStart = `${startTime} ${startPeriod}`;
    const fullEnd = `${endTime} ${endPeriod}`;
    const duration = calculateDuration(fullStart, fullEnd);
    const slotNum = editing !== null ? editing : slots.length + 1;

    if (slotNum > 3) return;

    await supabase.from("sleep_log").upsert(
      {
        user_id: user.id,
        date: today,
        slot_number: slotNum,
        start_time: fullStart,
        end_time: fullEnd,
        duration_minutes: duration,
      },
      { onConflict: "user_id,date,slot_number" }
    );

    setStartTime("");
    setEndTime("");
    setEditing(null);
    loadSlots();
    loadWeekly();
  };

  const deleteSlot = async (slotNum: number) => {
    if (!user) return;
    await supabase
      .from("sleep_log")
      .delete()
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("slot_number", slotNum);
    loadSlots();
    loadWeekly();
  };

  const totalMinutes = slots.reduce((s, r) => s + r.duration_minutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const slotLabels = ["Main Sleep", "Nap 1", "Nap 2"];
  const maxChartHours = Math.max(10, ...weeklyData.map((d) => d.hours));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Sleep</h1>
          <p className="text-text-muted text-body mt-1">Track your rest patterns</p>
        </div>
        <div className="text-right">
          <div className="font-display text-h1" style={{ color: totalHours >= 7 ? "var(--accent)" : totalHours >= 5 ? "#A87820" : "#BF2222" }}>
            {totalHours}h
          </div>
          <div className="label-caps">TOTAL TODAY</div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} className="border-2 border-crimson p-4" style={{ background: "var(--surface)" }}>
          <span className="font-bold text-crimson text-sm uppercase tracking-wider">{w}</span>
        </div>
      ))}

      {/* Existing slots */}
      <div className="space-y-3">
        {slots.map((slot) => (
          <div key={slot.slot_number} className="card-brutal p-4 flex items-center justify-between">
            <div>
              <span className="label-caps text-xs">{slotLabels[slot.slot_number - 1]}</span>
              <div className="font-display text-h4 mt-1" style={{ color: "var(--text-primary)" }}>
                {slot.start_time} → {slot.end_time}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-h4" style={{ color: "var(--accent)" }}>
                {formatDuration(slot.duration_minutes)}
              </span>
              <button onClick={() => deleteSlot(slot.slot_number)} className="btn-destructive text-xs py-1 px-2">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add slot form */}
      {slots.length < 3 && (
        <div className="card-brutal p-5">
          <h3 className="label-caps mb-4">ADD {slotLabels[slots.length]}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label-caps block mb-2 text-[10px]">START TIME</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input-brutal flex-1"
                  placeholder="11:30"
                />
                <select
                  value={startPeriod}
                  onChange={(e) => setStartPeriod(e.target.value as "AM" | "PM")}
                  className="input-brutal w-20"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label-caps block mb-2 text-[10px]">END TIME</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input-brutal flex-1"
                  placeholder="6:00"
                />
                <select
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value as "AM" | "PM")}
                  className="input-brutal w-20"
                >
                  <option>AM</option>
                  <option>PM</option>
                </select>
              </div>
            </div>
          </div>
          {startTime && endTime && (
            <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
              Duration: {formatDuration(calculateDuration(`${startTime} ${startPeriod}`, `${endTime} ${endPeriod}`))}
            </p>
          )}
          <button onClick={saveSlot} className="btn-primary">
            SAVE SLEEP SLOT
          </button>
        </div>
      )}

      {/* Weekly chart */}
      <div className="card-brutal p-5">
        <h3 className="label-caps mb-4">THIS WEEK</h3>
        <div className="flex items-end gap-2" style={{ height: 200 }}>
          {weeklyData.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
              <span className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {d.hours > 0 ? `${d.hours}h` : ""}
              </span>
              <div
                className="w-full border-2 transition-all"
                style={{
                  height: `${(d.hours / maxChartHours) * 160}px`,
                  background: d.date === today ? "var(--accent)" : "var(--surface-raised)",
                  borderColor: "var(--border)",
                  minHeight: d.hours > 0 ? 8 : 0,
                }}
              />
              <span className="text-[10px] mt-2 label-caps">{formatDateShort(d.date)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
