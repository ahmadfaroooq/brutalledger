"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import {
  getPKTDate,
  formatDate,
  formatPKR,
  MOTIVATIONAL_LINES,
  ALL_HABITS,
} from "@/lib/utils";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { user } = useAuth();
  const today = getPKTDate();
  const [habitsCompleted, setHabitsCompleted] = useState(0);
  const [habitsTotal, setHabitsTotal] = useState(ALL_HABITS.length);
  const [dmsToday, setDmsToday] = useState(0);
  const [commentsToday, setCommentsToday] = useState(0);
  const [sleepHours, setSleepHours] = useState(0);
  const [spentToday, setSpentToday] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [recentActivity, setRecentActivity] = useState<{ text: string; time: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
    const interval = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % MOTIVATIONAL_LINES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Habits
    const { data: habits } = await supabase
      .from("habits_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("completed", true);
    setHabitsCompleted(habits?.length ?? 0);

    // DMs
    const { data: dms } = await supabase
      .from("outreach_daily_count")
      .select("dm_count, comment_count")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();
    setDmsToday(dms?.dm_count ?? 0);
    setCommentsToday(dms?.comment_count ?? 0);

    // Sleep
    const { data: sleep } = await supabase
      .from("sleep_log")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .eq("date", today);
    const totalMins = sleep?.reduce((s, r) => s + r.duration_minutes, 0) ?? 0;
    setSleepHours(Math.round((totalMins / 60) * 10) / 10);

    // Expenses today
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount_pkr")
      .eq("user_id", user.id)
      .eq("date", today);
    setSpentToday(expenses?.reduce((s, r) => s + Number(r.amount_pkr), 0) ?? 0);

    // Recent activity
    const activities: { text: string; time: string }[] = [];
    const { data: recentExpenses } = await supabase
      .from("expenses")
      .select("item_name, amount_pkr, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);
    recentExpenses?.forEach((e) =>
      activities.push({ text: `Logged expense: ${e.item_name} (${formatPKR(Number(e.amount_pkr))})`, time: e.created_at })
    );
    const { data: recentStudy } = await supabase
      .from("study_log")
      .select("subject, minutes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2);
    recentStudy?.forEach((s) =>
      activities.push({ text: `Studied ${s.subject} for ${s.minutes}m`, time: s.created_at })
    );

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActivity(activities.slice(0, 5));
  };

  const habitPercent = habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Date header */}
      <div>
        <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>
          {formatDate(today)}
        </h1>
      </div>

      {/* Top row: Progress + Motivation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Square progress */}
        <div className="card-brutal p-6 flex flex-col items-center justify-center">
          <div
            className="w-32 h-32 border-2 relative flex items-center justify-center mb-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div
              className="absolute bottom-0 left-0 right-0 transition-all duration-500"
              style={{
                height: `${habitPercent}%`,
                background: "#C8F135",
              }}
            />
            <span className="font-display text-h2 relative z-10" style={{ color: habitPercent > 50 ? "#0D0D0D" : "var(--text-primary)" }}>
              {habitPercent}%
            </span>
          </div>
          <span className="label-caps">HABITS COMPLETED</span>
        </div>

        {/* Motivational */}
        <div className="card-brutal p-6 md:col-span-2 flex items-center">
          <p
            className="font-display text-h3 md:text-h2 transition-opacity duration-500"
            style={{ color: "#C8F135" }}
          >
            &ldquo;{MOTIVATIONAL_LINES[quoteIndex]}&rdquo;
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={`${dmsToday}/10`}
          label="DMs SENT"
          accent={dmsToday >= 10 ? "lime" : dmsToday >= 5 ? "gold" : "crimson"}
          onClick={() => onNavigate("outreach")}
        />
        <StatCard
          value={`${commentsToday}/10`}
          label="COMMENTS"
          accent={commentsToday >= 10 ? "lime" : commentsToday >= 5 ? "gold" : "crimson"}
          onClick={() => onNavigate("outreach")}
        />
        <StatCard
          value={`${sleepHours}h`}
          label="SLEEP LAST NIGHT"
          accent={sleepHours >= 7 ? "lime" : sleepHours >= 5 ? "gold" : "crimson"}
          onClick={() => onNavigate("sleep")}
        />
        <StatCard
          value={formatPKR(spentToday)}
          label="SPENT TODAY"
          accent="gold"
          onClick={() => onNavigate("finance")}
        />
      </div>

      {/* Recent Activity */}
      <div className="card-brutal p-6">
        <h3 className="font-display text-h4 mb-4" style={{ color: "var(--text-primary)" }}>
          Recent Activity
        </h3>
        {recentActivity.length === 0 ? (
          <p className="font-display text-lg" style={{ color: "var(--text-muted)" }}>
            No activity yet today. Time to start building.
          </p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <span className="text-body" style={{ color: "var(--text-primary)" }}>{a.text}</span>
                <span className="label-caps text-[10px]">
                  {new Date(a.time).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ value, label, accent, onClick }: { value: string; label: string; accent: string; onClick?: () => void }) {
  const accentColor = accent === "lime" ? "#C8F135" : accent === "crimson" ? "#BF2222" : "#A87820";
  return (
    <button
      onClick={onClick}
      className="stat-card text-left w-full card-brutal-interactive"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="font-display text-h3 md:text-h2" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="label-caps mt-1">{label}</div>
    </button>
  );
}
