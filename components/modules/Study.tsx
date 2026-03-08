"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, getPKTDayOfWeek, getWeekStart, getWeekEnd, formatDuration, STUDY_SUBJECTS, STUDY_SCHEDULE } from "@/lib/utils";

interface StudyEntry {
  id: string;
  date: string;
  subject: string;
  minutes: number;
  notes: string;
}

interface SubjectStats {
  subject: string;
  weekMinutes: number;
  totalMinutes: number;
  streak: number;
}

export default function Study() {
  const { user } = useAuth();
  const today = getPKTDate();
  const dayOfWeek = getPKTDayOfWeek();
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [subject, setSubject] = useState<string>(STUDY_SUBJECTS[0]);
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionDate, setSessionDate] = useState(today);

  const todaySubjects = STUDY_SCHEDULE[dayOfWeek] || [];
  const TARGET_WEEKLY = 315;
  const TARGET_TOTAL_HOURS = 160;

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(weekStart);

    // Recent entries
    const { data: recentEntries } = await supabase
      .from("study_log")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(20);
    setEntries(recentEntries || []);

    // Week total
    const { data: weekData } = await supabase
      .from("study_log")
      .select("minutes")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    setWeeklyTotal(weekData?.reduce((s, r) => s + r.minutes, 0) ?? 0);

    // Per subject stats
    const stats: SubjectStats[] = [];
    for (const subj of STUDY_SUBJECTS) {
      const { data: weekSubj } = await supabase
        .from("study_log")
        .select("minutes")
        .eq("user_id", user.id)
        .eq("subject", subj)
        .gte("date", weekStart)
        .lte("date", weekEnd);

      const { data: allSubj } = await supabase
        .from("study_log")
        .select("minutes")
        .eq("user_id", user.id)
        .eq("subject", subj);

      // Streak
      let streak = 0;
      const d = new Date(today + "T00:00:00");
      for (let i = 0; i < 60; i++) {
        const dateStr = d.toISOString().split("T")[0];
        const { data: dayData } = await supabase
          .from("study_log")
          .select("id")
          .eq("user_id", user.id)
          .eq("subject", subj)
          .eq("date", dateStr)
          .limit(1);
        if (dayData && dayData.length > 0) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }

      stats.push({
        subject: subj,
        weekMinutes: weekSubj?.reduce((s, r) => s + r.minutes, 0) ?? 0,
        totalMinutes: allSubj?.reduce((s, r) => s + r.minutes, 0) ?? 0,
        streak,
      });
    }
    setSubjectStats(stats);
  };

  const logSession = async () => {
    if (!user || !minutes) return;
    await supabase.from("study_log").insert({
      user_id: user.id,
      date: sessionDate,
      subject,
      minutes: parseInt(minutes),
      notes,
    });
    setMinutes("");
    setNotes("");
    loadData();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("study_log").delete().eq("id", id);
    loadData();
  };

  const weeklyPercent = Math.min(100, Math.round((weeklyTotal / TARGET_WEEKLY) * 100));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Study</h1>
          <p className="text-text-muted text-body mt-1">A Level preparation tracker</p>
        </div>
        <div className="text-right">
          <div className="font-display text-h2" style={{ color: weeklyTotal >= TARGET_WEEKLY ? "#C8F135" : "var(--text-primary)" }}>
            {weeklyTotal}m
          </div>
          <div className="label-caps">THIS WEEK / {TARGET_WEEKLY}m</div>
        </div>
      </div>

      {/* Daily reminder */}
      <div className="card-brutal p-4" style={{ borderLeft: "4px solid #C8F135" }}>
        <span className="label-caps text-[10px]">TODAY&apos;S FOCUS</span>
        <div className="font-display text-h4 mt-1" style={{ color: "#C8F135" }}>
          {todaySubjects.join(" & ")}
        </div>
      </div>

      {/* Weekly progress bar */}
      <div className="card-brutal p-4">
        <div className="flex justify-between mb-2">
          <span className="label-caps">WEEKLY TARGET</span>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{weeklyPercent}%</span>
        </div>
        <div className="w-full h-6 border-2" style={{ borderColor: "var(--border)" }}>
          <div className="h-full transition-all" style={{ width: `${weeklyPercent}%`, background: "#C8F135" }} />
        </div>
      </div>

      {/* Log session */}
      <div className="card-brutal p-5">
        <h3 className="label-caps mb-4">LOG STUDY SESSION</h3>
        <div className="space-y-3">
          <div>
            <label className="label-caps block mb-2 text-[10px]">SUBJECT</label>
            <div className="flex gap-2 flex-wrap">
              {STUDY_SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="px-3 py-2 border-2 text-xs font-bold uppercase"
                  style={{
                    borderColor: subject === s ? "#C8F135" : "var(--border)",
                    background: subject === s ? "#C8F135" : "transparent",
                    color: subject === s ? "#0D0D0D" : "var(--text-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps block mb-2 text-[10px]">MINUTES</label>
              <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="input-brutal" placeholder="45" />
            </div>
            <div>
              <label className="label-caps block mb-2 text-[10px]">DATE</label>
              <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} className="input-brutal" />
            </div>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-brutal" rows={2} placeholder="Topics covered (optional)" />
          <button onClick={logSession} className="btn-primary">LOG SESSION</button>
        </div>
      </div>

      {/* Subject cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjectStats.map((s) => {
          const totalHours = Math.round((s.totalMinutes / 60) * 10) / 10;
          const progressPercent = Math.min(100, Math.round((totalHours / TARGET_TOTAL_HOURS) * 100));
          return (
            <div key={s.subject} className="card-brutal p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{s.subject}</h4>
                  <span className="label-caps text-[10px]">{formatDuration(s.weekMinutes)} this week</span>
                </div>
                {s.streak > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold" style={{ background: "var(--text-primary)", color: "var(--bg)" }}>
                    {s.streak >= 7 && "🔥"} {s.streak}d
                  </span>
                )}
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totalHours}h / {TARGET_TOTAL_HOURS}h</span>
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{progressPercent}%</span>
              </div>
              <div className="w-full h-4 border-2" style={{ borderColor: "var(--border)" }}>
                <div className="h-full" style={{ width: `${progressPercent}%`, background: "#C8F135" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent sessions */}
      <div className="card-brutal p-4">
        <h3 className="label-caps mb-3">RECENT SESSIONS</h3>
        {entries.length === 0 ? (
          <p className="font-display text-lg" style={{ color: "var(--text-muted)" }}>No study sessions yet. Open those books.</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{e.subject}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{e.date}</span>
                  {e.notes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{e.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm" style={{ color: "#C8F135" }}>{e.minutes}m</span>
                  <button onClick={() => deleteEntry(e.id)} className="text-crimson text-xs font-bold">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
