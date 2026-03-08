"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, getPKTDayOfWeek, HABIT_GROUPS, ALL_HABITS } from "@/lib/utils";

interface HabitState {
  [key: string]: boolean;
}

interface StreakState {
  [key: string]: number;
}

export default function Habits() {
  const { user } = useAuth();
  const today = getPKTDate();
  const dayOfWeek = getPKTDayOfWeek();
  const [habits, setHabits] = useState<HabitState>({});
  const [streaks, setStreaks] = useState<StreakState>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadHabits();
    loadStreaks();
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

    // Get last 60 days of habits
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

  const toggleHabit = async (key: string) => {
    if (!user) return;
    const newVal = !habits[key];
    setHabits((prev) => ({ ...prev, [key]: newVal }));

    // Upsert
    await supabase.from("habits_log").upsert(
      {
        user_id: user.id,
        date: today,
        habit_key: key,
        completed: newVal,
      },
      { onConflict: "user_id,date,habit_key" }
    );

    // Reload streaks
    loadStreaks();
  };

  const completedCount = Object.values(habits).filter(Boolean).length;
  const totalCount = ALL_HABITS.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Weekly review visible on Sunday or if already checked this week
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
      {/* Header with completion */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>
            Habits
          </h1>
          <p className="text-text-muted text-body mt-1">Daily discipline tracker</p>
        </div>
        <div className="text-right">
          <div className="font-display text-h1" style={{ color: "#C8F135" }}>
            {percent}%
          </div>
          <div className="label-caps">COMPLETED</div>
        </div>
      </div>

      {/* Habit Groups */}
      {Object.entries(HABIT_GROUPS).map(([groupKey, group]) => (
        <div key={groupKey} className="card-brutal p-5">
          <h2 className="label-caps text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            {group.label}
          </h2>
          <div className="space-y-3">
            {group.habits.map((habit) => {
              // Hide weekly_review unless Sunday or already checked
              if (habit.key === "weekly_review" && !isSunday && !habits[habit.key]) return null;

              const checked = habits[habit.key] || false;
              const streak = streaks[habit.key] || 0;
              const justBroke = streak === 0 && !checked;

              return (
                <div key={habit.key} className="flex items-center justify-between py-1">
                  <button
                    onClick={() => toggleHabit(habit.key)}
                    className="flex items-center gap-3 text-left"
                  >
                    {/* Custom checkbox */}
                    <div
                      className="w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={{
                        borderColor: checked ? "#0D0D0D" : "var(--border)",
                        background: checked ? "#C8F135" : "var(--surface)",
                      }}
                    >
                      {checked && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6L5 9L10 3" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="square" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="text-body"
                      style={{
                        color: checked ? "var(--text-primary)" : "var(--text-muted)",
                        textDecoration: checked ? "none" : "none",
                      }}
                    >
                      {habit.label}
                    </span>
                  </button>

                  {/* Streak */}
                  <div className="flex items-center gap-2">
                    {streak >= 7 && <span>🔥</span>}
                    {streak > 0 && (
                      <span
                        className="px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: "var(--text-primary)",
                          color: "var(--bg)",
                        }}
                      >
                        {streak}d
                      </span>
                    )}
                    {justBroke && streak === 0 && (
                      <span title="Streak broken">💀</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
