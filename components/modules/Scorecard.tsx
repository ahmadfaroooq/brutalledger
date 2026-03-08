"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, getWeekStart, getWeekEnd, formatPKR, formatDateShort } from "@/lib/utils";

interface WeekData {
  weekStart: string;
  weekEnd: string;
  dmsTotal: number;
  postsPublished: number;
  commentsTotal: number;
  avgSleep: number;
  studyMinutes: number;
  savingsBalance: number;
  habitsRate: number;
  bestPost: string;
  whatAvoided: string;
}

export default function Scorecard() {
  const { user } = useAuth();
  const today = getPKTDate();
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentWeek, setCurrentWeek] = useState<WeekData | null>(null);
  const [whatAvoided, setWhatAvoided] = useState("");
  const [saving, setSaving] = useState(false);
  const [exportRange, setExportRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (!user) return;
    loadCurrentWeek();
    loadPastWeeks();
  }, [user]);

  const loadCurrentWeek = async () => {
    if (!user) return;
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(weekStart);
    const data = await buildWeekData(weekStart, weekEnd);
    setCurrentWeek(data);
    setWhatAvoided(data.whatAvoided);
  };

  const loadPastWeeks = async () => {
    if (!user) return;
    const pastWeeks: WeekData[] = [];
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() - 7);
    for (let i = 0; i < 8; i++) {
      const ws = getWeekStart(d.toISOString().split("T")[0]);
      const we = getWeekEnd(ws);
      const data = await buildWeekData(ws, we);
      pastWeeks.push(data);
      d.setDate(d.getDate() - 7);
    }
    setWeeks(pastWeeks);
  };

  const buildWeekData = async (weekStart: string, weekEnd: string): Promise<WeekData> => {
    if (!user) return emptyWeek(weekStart, weekEnd);

    // DMs
    const { data: dms } = await supabase
      .from("outreach_daily_count")
      .select("dm_count, comment_count")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    const dmsTotal = dms?.reduce((s, r) => s + r.dm_count, 0) ?? 0;
    const commentsTotal = dms?.reduce((s, r) => s + r.comment_count, 0) ?? 0;

    // Posts
    const { data: posts } = await supabase
      .from("linkedin_posts")
      .select("*")
      .eq("user_id", user.id)
      .gte("date_posted", weekStart)
      .lte("date_posted", weekEnd)
      .order("impressions_d7", { ascending: false });
    const postsPublished = posts?.length ?? 0;
    const bestPost = posts?.[0]?.topic ?? "—";

    // Sleep
    const { data: sleep } = await supabase
      .from("sleep_log")
      .select("date, duration_minutes")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    const sleepByDay = new Map<string, number>();
    sleep?.forEach((s) => sleepByDay.set(s.date, (sleepByDay.get(s.date) || 0) + s.duration_minutes));
    const sleepDays = sleepByDay.size || 1;
    const totalSleepMins = Array.from(sleepByDay.values()).reduce((s, m) => s + m, 0);
    const avgSleep = Math.round((totalSleepMins / sleepDays / 60) * 10) / 10;

    // Study
    const { data: study } = await supabase
      .from("study_log")
      .select("minutes")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    const studyMinutes = study?.reduce((s, r) => s + r.minutes, 0) ?? 0;

    // Savings
    const { data: savings } = await supabase
      .from("savings_balance")
      .select("balance_pkr")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    const savingsBalance = savings ? Number(savings.balance_pkr) : 0;

    // Habits rate
    const { data: habits } = await supabase
      .from("habits_log")
      .select("completed")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    const totalHabits = habits?.length || 1;
    const completedHabits = habits?.filter((h) => h.completed).length ?? 0;
    const habitsRate = Math.round((completedHabits / totalHabits) * 100);

    // Scorecard text
    const { data: sc } = await supabase
      .from("weekly_scorecard")
      .select("what_avoided")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    return {
      weekStart,
      weekEnd,
      dmsTotal,
      postsPublished,
      commentsTotal,
      avgSleep,
      studyMinutes,
      savingsBalance,
      habitsRate,
      bestPost,
      whatAvoided: sc?.what_avoided ?? "",
    };
  };

  const emptyWeek = (ws: string, we: string): WeekData => ({
    weekStart: ws, weekEnd: we, dmsTotal: 0, postsPublished: 0, commentsTotal: 0,
    avgSleep: 0, studyMinutes: 0, savingsBalance: 0, habitsRate: 0, bestPost: "—", whatAvoided: "",
  });

  const saveWhatAvoided = async () => {
    if (!user || !currentWeek) return;
    setSaving(true);
    await supabase.from("weekly_scorecard").upsert(
      { user_id: user.id, week_start: currentWeek.weekStart, what_avoided: whatAvoided, updated_at: new Date().toISOString() },
      { onConflict: "user_id,week_start" }
    );
    setSaving(false);
  };

  const exportCSV = async () => {
    if (!user) return;
    let headers = "";
    let rows: string[] = [];

    if (exportRange === "week" && currentWeek) {
      headers = "Metric,Value,Target\n";
      rows = [
        `DMs Sent,${currentWeek.dmsTotal},50`,
        `Posts Published,${currentWeek.postsPublished},5`,
        `Comments,${currentWeek.commentsTotal},50`,
        `Avg Sleep,${currentWeek.avgSleep}h,7h`,
        `Study Minutes,${currentWeek.studyMinutes},315`,
        `Savings,${currentWeek.savingsBalance},`,
        `Habits Rate,${currentWeek.habitsRate}%,100%`,
        `Best Post,${currentWeek.bestPost},`,
        `What Avoided,"${currentWeek.whatAvoided}",`,
      ];
    } else if (exportRange === "month") {
      headers = "Week Start,DMs,Posts,Comments,Avg Sleep,Study Min,Habits %\n";
      const allWeeks = currentWeek ? [currentWeek, ...weeks] : weeks;
      rows = allWeeks.slice(0, 4).map((w) =>
        `${w.weekStart},${w.dmsTotal},${w.postsPublished},${w.commentsTotal},${w.avgSleep},${w.studyMinutes},${w.habitsRate}%`
      );
    } else {
      // All data export
      headers = "Week Start,DMs,Posts,Comments,Avg Sleep,Study Min,Habits %,Savings,Best Post\n";
      const allWeeks = currentWeek ? [currentWeek, ...weeks] : weeks;
      rows = allWeeks.map((w) =>
        `${w.weekStart},${w.dmsTotal},${w.postsPublished},${w.commentsTotal},${w.avgSleep},${w.studyMinutes},${w.habitsRate}%,${w.savingsBalance},"${w.bestPost}"`
      );
    }

    const csv = headers + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brutal-ledger-${exportRange}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderScoreRow = (label: string, value: string | number, target: string, hit: boolean) => (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "var(--border)" }}>
      <span className="label-caps text-xs">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-display text-h4" style={{ color: hit ? "#C8F135" : "var(--text-primary)" }}>{value}</span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ {target}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Scorecard</h1>
          <p className="text-text-muted text-body mt-1">Weekly performance review</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportRange}
            onChange={(e) => setExportRange(e.target.value as "week" | "month" | "all")}
            className="input-brutal text-xs py-2 px-2 w-24"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="all">All</option>
          </select>
          <button onClick={exportCSV} className="btn-primary text-xs">
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* Current week */}
      {currentWeek && (
        <div className="card-brutal p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display text-h3" style={{ color: "var(--text-primary)" }}>This Week</h2>
            <span className="label-caps text-[10px]">
              {formatDateShort(currentWeek.weekStart)} — {formatDateShort(currentWeek.weekEnd)}
            </span>
          </div>

          {renderScoreRow("OUTREACH DMs", currentWeek.dmsTotal, "50", currentWeek.dmsTotal >= 50)}
          {renderScoreRow("POSTS PUBLISHED", currentWeek.postsPublished, "5", currentWeek.postsPublished >= 5)}
          {renderScoreRow("COMMENTS LOGGED", currentWeek.commentsTotal, "50", currentWeek.commentsTotal >= 50)}
          {renderScoreRow("AVG SLEEP", `${currentWeek.avgSleep}h`, "7h", currentWeek.avgSleep >= 7)}
          {renderScoreRow("STUDY MINUTES", currentWeek.studyMinutes, "315", currentWeek.studyMinutes >= 315)}
          {renderScoreRow("SAVINGS", formatPKR(currentWeek.savingsBalance), "—", currentWeek.savingsBalance > 0)}
          {renderScoreRow("HABITS RATE", `${currentWeek.habitsRate}%`, "100%", currentWeek.habitsRate >= 80)}

          <div className="py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex justify-between items-center">
              <span className="label-caps text-xs">BEST POST</span>
              <span className="font-bold text-sm" style={{ color: "#C8F135" }}>{currentWeek.bestPost}</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="label-caps block mb-2">WHAT DID I AVOID THIS WEEK?</label>
            <textarea
              value={whatAvoided}
              onChange={(e) => setWhatAvoided(e.target.value)}
              className="input-brutal mb-3"
              rows={3}
              placeholder="Be honest with yourself..."
            />
            <button onClick={saveWhatAvoided} className="btn-primary text-xs" disabled={saving}>
              {saving ? "SAVING..." : "SAVE"}
            </button>
          </div>
        </div>
      )}

      {/* Past weeks */}
      <div className="space-y-4">
        <h2 className="font-display text-h3" style={{ color: "var(--text-primary)" }}>Past Weeks</h2>
        {weeks.map((w) => (
          <div key={w.weekStart} className="card-brutal p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-display text-h4" style={{ color: "var(--text-primary)" }}>
                {formatDateShort(w.weekStart)} — {formatDateShort(w.weekEnd)}
              </span>
              <span
                className="px-2 py-1 text-xs font-bold border-2"
                style={{
                  borderColor: w.habitsRate >= 80 ? "#C8F135" : w.habitsRate >= 50 ? "#A87820" : "#BF2222",
                  color: w.habitsRate >= 80 ? "#C8F135" : w.habitsRate >= 50 ? "#A87820" : "#BF2222",
                }}
              >
                {w.habitsRate}%
              </span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
              <MiniStat label="DMs" value={w.dmsTotal} target={50} />
              <MiniStat label="POSTS" value={w.postsPublished} target={5} />
              <MiniStat label="SLEEP" value={`${w.avgSleep}h`} target={7} numValue={w.avgSleep} />
              <MiniStat label="STUDY" value={`${w.studyMinutes}m`} target={315} numValue={w.studyMinutes} />
              <MiniStat label="CMTS" value={w.commentsTotal} target={50} />
              <div>
                <div className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{formatPKR(w.savingsBalance)}</div>
                <div className="label-caps text-[9px]">SAVINGS</div>
              </div>
            </div>
            {w.whatAvoided && (
              <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <span className="label-caps text-[10px]">AVOIDED: </span>
                <span className="text-sm" style={{ color: "var(--text-muted)" }}>{w.whatAvoided}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, target, numValue }: { label: string; value: string | number; target: number; numValue?: number }) {
  const num = numValue ?? (typeof value === "number" ? value : 0);
  const hit = num >= target;
  return (
    <div>
      <div className="font-display text-h4" style={{ color: hit ? "#C8F135" : "var(--text-primary)" }}>{value}</div>
      <div className="label-caps text-[9px]">{label}</div>
    </div>
  );
}
