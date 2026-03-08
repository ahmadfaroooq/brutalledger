"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  getPKTDate,
  getPKTDayOfWeek,
  getWeekStart,
  getWeekEnd,
  getMonthStart,
  getMonthEnd,
  getDaysInRange,
  formatDateShort,
  HABIT_GROUPS,
  ALL_HABITS,
} from "@/lib/utils";

interface HabitState {
  [key: string]: boolean;
}

interface StreakState {
  [key: string]: number;
}

interface DayCompletionData {
  date: string;
  completed: number;
  total: number;
}

export default function Habits() {
  const { user } = useAuth();
  const today = getPKTDate();
  const dayOfWeek = getPKTDayOfWeek();
  const [habits, setHabits] = useState<HabitState>({});
  const [streaks, setStreaks] = useState<StreakState>({});
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<DayCompletionData[]>([]);
  const [weeklyRate, setWeeklyRate] = useState(0);
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [monthlyCompleted, setMonthlyCompleted] = useState(0);
  const [viewTab, setViewTab] = useState<"today" | "week" | "month">("today");

  useEffect(() => {
    if (!user) return;
    loadHabits();
    loadStreaks();
    loadWeeklyData();
    loadMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadHabits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("habits_log")
      .select("habit_key, completed")
      .eq("user_id", user.id)
      .eq("date", today);

    const state: HabitState = {};
    ALL_HABITS.forEach((k) => (state[k] = false));
    data?.forEach((r) => (state[r.habit_key] = r.completed));
    setHabits(state);
    setLoading(false);
  };

  const loadStreaks = async () => {
    if (!user) return;
    const streakMap: StreakState = {};
    const sixtyDaysAgo = new Date(today + "T00:00:00");
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const startDate = sixtyDaysAgo.toISOString().split("T")[0];

    const { data } = await supabase
      .from("habits_log")
      .select("date, habit_key, completed")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .eq("completed", true)
      .order("date", { ascending: false });

    ALL_HABITS.forEach((key) => {
      let streak = 0;
      const d = new Date(today + "T00:00:00");
      for (let i = 0; i < 60; i++) {
        const dateStr = d.toISOString().split("T")[0];
        const found = data?.find((r) => r.habit_key === key && r.date === dateStr);
        if (found) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      streakMap[key] = streak;
    });
    setStreaks(streakMap);
  };

  const loadWeeklyData = async () => {
    if (!user) return;
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(weekStart);
    const days = getDaysInRange(weekStart, weekEnd);

    const { data } = await supabase
      .from("habits_log")
      .select("date, completed")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);

    let totalChecked = 0;
    let totalPossible = 0;

    const weekData = days.map((d) => {
      const dayLogs = data?.filter((r) => r.date === d) || [];
      const completed = dayLogs.filter((r) => r.completed).length;
      const total = ALL_HABITS.length;
      totalChecked += completed;
      totalPossible += total;
      return { date: d, completed, total };
    });

    setWeeklyData(weekData);
    setWeeklyRate(totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0);
  };

  const loadMonthlyData = async () => {
    if (!user) return;
    const monthStart = getMonthStart(today);
    const monthEnd = getMonthEnd(today);

    const { data } = await supabase
      .from("habits_log")
      .select("date, completed")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd);

    const completed = data?.filter((r) => r.completed).length ?? 0;
    const total = data?.length || 1;
    setMonthlyCompleted(completed);
    setMonthlyTotal(total);
    setMonthlyRate(Math.round((completed / total) * 100));
  };

  const toggleHabit = async (key: string) => {
    if (!user) return;
    const newVal = !habits[key];
    setHabits((prev) => ({ ...prev, [key]: newVal }));

    await supabase.from("habits_log").upsert(
      { user_id: user.id, date: today, habit_key: key, completed: newVal },
      { onConflict: "user_id,date,habit_key" }
    );

    loadStreaks();
    loadWeeklyData();
    loadMonthlyData();
  };

  const completedCount = Object.values(habits).filter(Boolean).length;
  const totalCount = ALL_HABITS.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isSunday = dayOfWeek === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="font-display text-h3" style={{ color: "var(--text-muted)" }}>Loading habits...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Habits</h1>
          <p className="text-body" style={{ color: "var(--text-muted)" }}>Daily discipline tracker</p>
        </div>
        <div className="text-right">
          <div className="font-display text-h1" style={{ color: "var(--accent)" }}>
            {percent}%
          </div>
          <div className="label-caps">TODAY</div>
        </div>
      </div>

      {/* Weekly + Monthly stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card" style={{ borderLeft: `4px solid var(--accent-bg)` }}>
          <div className="font-display text-h3" style={{ color: "var(--accent)" }}>{percent}%</div>
          <div className="label-caps">TODAY</div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{completedCount}/{totalCount}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #168080" }}>
          <div className="font-display text-h3" style={{ color: weeklyRate >= 80 ? "var(--accent)" : "var(--text-primary)" }}>{weeklyRate}%</div>
          <div className="label-caps">THIS WEEK</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #A87820" }}>
          <div className="font-display text-h3" style={{ color: monthlyRate >= 80 ? "var(--accent)" : "var(--text-primary)" }}>{monthlyRate}%</div>
          <div className="label-caps">THIS MONTH</div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{monthlyCompleted}/{monthlyTotal} checks</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #7A3880" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>
            {Object.values(streaks).filter((s) => s >= 7).length}
          </div>
          <div className="label-caps">7+ STREAKS</div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        {(["today", "week", "month"] as const).map((t) => (
          <button key={t} onClick={() => setViewTab(t)}
            className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider"
            style={{ borderColor: viewTab === t ? "var(--accent)" : "var(--border)", color: viewTab === t ? "var(--accent)" : "var(--text-muted)" }}>
            {t === "today" ? "TODAY" : t === "week" ? "WEEK" : "MONTH"}
          </button>
        ))}
      </div>

      {/* TODAY VIEW - checkboxes */}
      {viewTab === "today" && (
        <>
          {Object.entries(HABIT_GROUPS).map(([groupKey, group]) => (
            <div key={groupKey} className="card-brutal p-5">
              <h2 className="label-caps text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.habits.map((habit) => {
                  if (habit.key === "weekly_review" && !isSunday && !habits[habit.key]) return null;

                  const checked = habits[habit.key] || false;
                  const streak = streaks[habit.key] || 0;

                  return (
                    <div key={habit.key} className="flex items-center justify-between py-1">
                      <button onClick={() => toggleHabit(habit.key)} className="flex items-center gap-3 text-left">
                        <div className="w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                          style={{ borderColor: checked ? "#0D0D0D" : "var(--border)", background: checked ? "var(--accent-bg)" : "var(--surface)" }}>
                          {checked && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="square" />
                            </svg>
                          )}
                        </div>
                        <span className="text-body" style={{ color: checked ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {habit.label}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        {streak >= 7 && <span>🔥</span>}
                        {streak > 0 && (
                          <span className="px-2 py-0.5 text-xs font-bold" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
                            {streak}d
                          </span>
                        )}
                        {streak === 0 && !checked && <span title="Streak broken">💀</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* WEEK VIEW - daily completion chart */}
      {viewTab === "week" && (
        <div className="card-brutal p-5">
          <h3 className="label-caps mb-4">DAILY COMPLETION THIS WEEK</h3>
          <div className="flex items-end gap-2" style={{ height: 200 }}>
            {weeklyData.map((d) => {
              const pct = d.total > 0 ? (d.completed / d.total) * 100 : 0;
              const isToday = d.date === today;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-xs font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    {d.completed > 0 ? `${Math.round(pct)}%` : ""}
                  </span>
                  <div className="w-full border-2 transition-all"
                    style={{
                      height: `${(pct / 100) * 160}px`,
                      background: isToday ? "var(--accent-bg)" : "var(--surface-raised)",
                      borderColor: "var(--border)",
                      minHeight: d.completed > 0 ? 8 : 0,
                    }}
                  />
                  <span className="text-[10px] mt-2 label-caps">{formatDateShort(d.date)}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{d.completed}/{d.total}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between">
              <span className="label-caps">WEEKLY AVERAGE</span>
              <span className="font-display text-h4" style={{ color: "var(--accent)" }}>{weeklyRate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* MONTH VIEW - habit-by-habit breakdown */}
      {viewTab === "month" && (
        <div className="card-brutal p-5">
          <h3 className="label-caps mb-4">MONTHLY HABIT BREAKDOWN</h3>
          <div className="flex justify-between mb-4">
            <span className="label-caps">OVERALL RATE</span>
            <span className="font-display text-h4" style={{ color: "var(--accent)" }}>{monthlyRate}%</span>
          </div>
          <MonthlyBreakdown userId={user?.id || ""} today={today} />
        </div>
      )}
    </div>
  );
}

function MonthlyBreakdown({ userId, today }: { userId: string; today: string }) {
  const [habitRates, setHabitRates] = useState<{ key: string; label: string; rate: number; count: number }[]>([]);

  useEffect(() => {
    if (!userId) return;
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadRates = async () => {
    const monthStart = getMonthStart(today);
    const monthEnd = getMonthEnd(today);
    const daysInMonth = getDaysInRange(monthStart, today).length;

    const { data } = await supabase
      .from("habits_log")
      .select("habit_key, completed")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .eq("completed", true);

    const allHabits = Object.values(HABIT_GROUPS).flatMap((g) =>
      g.habits.map((h) => ({ key: h.key, label: h.label }))
    );

    const rates = allHabits.map((h) => {
      const count = data?.filter((r) => r.habit_key === h.key).length ?? 0;
      return { key: h.key, label: h.label, rate: daysInMonth > 0 ? Math.round((count / daysInMonth) * 100) : 0, count };
    });

    rates.sort((a, b) => b.rate - a.rate);
    setHabitRates(rates);
  };

  return (
    <div className="space-y-2">
      {habitRates.map((h) => (
        <div key={h.key}>
          <div className="flex justify-between mb-1">
            <span className="text-xs" style={{ color: "var(--text-primary)" }}>{h.label}</span>
            <span className="text-xs font-bold" style={{ color: h.rate >= 80 ? "var(--accent)" : h.rate >= 50 ? "#A87820" : "#BF2222" }}>{h.rate}%</span>
          </div>
          <div className="w-full h-3 border" style={{ borderColor: "var(--border)" }}>
            <div className="h-full" style={{ width: `${h.rate}%`, background: h.rate >= 80 ? "var(--accent-bg)" : h.rate >= 50 ? "#A87820" : "#BF2222" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
