"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, getWeekStart, getWeekEnd, getMonthStart, getMonthEnd, PROSPECT_STATUSES, STATUS_COLORS } from "@/lib/utils";

interface Prospect {
  id: string;
  name: string;
  linkedin_url: string;
  status: string;
  created_at: string;
  comment_count?: number;
  comments?: { id: string; note: string; created_at: string }[];
}

export default function Outreach() {
  const { user } = useAuth();
  const today = getPKTDate();
  const [dmCount, setDmCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [weeklyDms, setWeeklyDms] = useState(0);
  const [weeklyComments, setWeeklyComments] = useState(0);
  const [monthlyDms, setMonthlyDms] = useState(0);
  const [monthlyComments, setMonthlyComments] = useState(0);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (!user) return;
    loadCounts();
    loadProspects();
  }, [user]);

  const loadCounts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("outreach_daily_count")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();
    setDmCount(data?.dm_count ?? 0);
    setCommentCount(data?.comment_count ?? 0);

    // Weekly
    const weekStart = getWeekStart(today);
    const weekEnd = getWeekEnd(weekStart);
    const { data: weekData } = await supabase
      .from("outreach_daily_count")
      .select("dm_count, comment_count")
      .eq("user_id", user.id)
      .gte("date", weekStart)
      .lte("date", weekEnd);
    setWeeklyDms(weekData?.reduce((s, r) => s + r.dm_count, 0) ?? 0);
    setWeeklyComments(weekData?.reduce((s, r) => s + r.comment_count, 0) ?? 0);

    // Monthly
    const monthStart = getMonthStart(today);
    const monthEnd = getMonthEnd(today);
    const { data: monthData } = await supabase
      .from("outreach_daily_count")
      .select("dm_count, comment_count")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd);
    setMonthlyDms(monthData?.reduce((s, r) => s + r.dm_count, 0) ?? 0);
    setMonthlyComments(monthData?.reduce((s, r) => s + r.comment_count, 0) ?? 0);
  };

  const updateCount = async (type: "dm" | "comment", delta: number) => {
    if (!user) return;
    const newVal = type === "dm" ? Math.max(0, dmCount + delta) : Math.max(0, commentCount + delta);
    if (type === "dm") setDmCount(newVal);
    else setCommentCount(newVal);

    const updateObj = type === "dm" ? { dm_count: newVal } : { comment_count: newVal };
    await supabase.from("outreach_daily_count").upsert(
      { user_id: user.id, date: today, ...updateObj, ...(type === "dm" ? { comment_count: commentCount } : { dm_count: dmCount }) },
      { onConflict: "user_id,date" }
    );
    if (type === "dm") {
      setWeeklyDms((prev) => prev + delta);
      setMonthlyDms((prev) => prev + delta);
    } else {
      setWeeklyComments((prev) => prev + delta);
      setMonthlyComments((prev) => prev + delta);
    }
  };

  const loadProspects = async () => {
    if (!user) return;
    const { data: prospectData } = await supabase
      .from("outreach_prospects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!prospectData) return;

    // Load comment counts
    const withComments = await Promise.all(
      prospectData.map(async (p) => {
        const { data: comments } = await supabase
          .from("outreach_comments")
          .select("*")
          .eq("prospect_id", p.id)
          .order("created_at", { ascending: false });
        return { ...p, comments: comments || [], comment_count: comments?.length ?? 0 };
      })
    );
    setProspects(withComments);
  };

  const addProspect = async () => {
    if (!user || !newName) return;
    await supabase.from("outreach_prospects").insert({
      user_id: user.id,
      name: newName,
      linkedin_url: newUrl,
      status: "Warming",
    });
    setNewName("");
    setNewUrl("");
    setShowAdd(false);
    loadProspects();
  };

  const advanceStatus = async (prospect: Prospect, direction: 1 | -1) => {
    const idx = PROSPECT_STATUSES.indexOf(prospect.status as any);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= PROSPECT_STATUSES.length) return;
    const newStatus = PROSPECT_STATUSES[newIdx];

    setProspects((prev) =>
      prev.map((p) => (p.id === prospect.id ? { ...p, status: newStatus } : p))
    );

    await supabase
      .from("outreach_prospects")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", prospect.id);
  };

  const addComment = async (prospectId: string) => {
    if (!user || !newComment) return;
    await supabase.from("outreach_comments").insert({
      user_id: user.id,
      prospect_id: prospectId,
      note: newComment,
    });
    setNewComment("");
    loadProspects();
  };

  const deleteProspect = async (id: string) => {
    await supabase.from("outreach_comments").delete().eq("prospect_id", id);
    await supabase.from("outreach_prospects").delete().eq("id", id);
    loadProspects();
  };

  const filteredProspects = prospects.filter((p) => {
    if (filter !== "All" && p.status !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatusStyle = (status: string) => {
    const colorMap: Record<string, string> = {
      Warming: "#168080",
      "DM Sent": "#A87820",
      Replied: "#7A3880",
      "Call Booked": "#BF2222",
      "Proposal Sent": "#A87820",
      Closed: "#3A6840",
      Rejected: "var(--text-muted)",
    };
    return colorMap[status] || "var(--text-muted)";
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Outreach</h1>

      {/* DM Counter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-brutal p-6 text-center">
          <div className="label-caps mb-2">DMs SENT TODAY</div>
          <div className="font-display text-h1" style={{ color: dmCount >= 10 ? "var(--accent)" : "var(--text-primary)" }}>
            {dmCount}<span className="text-h3" style={{ color: "var(--text-muted)" }}>/10</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => updateCount("dm", -1)} className="btn-secondary py-2 px-4 text-lg">−</button>
            <button onClick={() => updateCount("dm", 1)} className="btn-primary py-3 px-6 text-lg">+</button>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <span className="label-caps text-[10px]">WEEKLY: <strong style={{ color: weeklyDms >= 50 ? "var(--accent)" : "var(--text-primary)" }}>{weeklyDms}</strong>/50</span>
            <span className="label-caps text-[10px]">MONTHLY: <strong style={{ color: "var(--text-primary)" }}>{monthlyDms}</strong></span>
          </div>
        </div>

        <div className="card-brutal p-6 text-center">
          <div className="label-caps mb-2">COMMENTS TODAY</div>
          <div className="font-display text-h1" style={{ color: commentCount >= 10 ? "var(--accent)" : "var(--text-primary)" }}>
            {commentCount}<span className="text-h3" style={{ color: "var(--text-muted)" }}>/10</span>
          </div>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => updateCount("comment", -1)} className="btn-secondary py-2 px-4 text-lg">−</button>
            <button onClick={() => updateCount("comment", 1)} className="btn-primary py-3 px-6 text-lg">+</button>
          </div>
          <div className="flex justify-center gap-4 mt-3">
            <span className="label-caps text-[10px]">WEEKLY: <strong style={{ color: weeklyComments >= 50 ? "var(--accent)" : "var(--text-primary)" }}>{weeklyComments}</strong>/50</span>
            <span className="label-caps text-[10px]">MONTHLY: <strong style={{ color: "var(--text-primary)" }}>{monthlyComments}</strong></span>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h3" style={{ color: "var(--text-primary)" }}>Prospect Pipeline</h2>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs py-2 px-3">
            + ADD
          </button>
        </div>

        {showAdd && (
          <div className="card-brutal p-4 mb-4 space-y-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-brutal"
              placeholder="Prospect name"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="input-brutal"
              placeholder="LinkedIn URL (optional)"
            />
            <div className="flex gap-2">
              <button onClick={addProspect} className="btn-primary text-xs">SAVE</button>
              <button onClick={() => setShowAdd(false)} className="btn-secondary text-xs">CANCEL</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          {["All", ...PROSPECT_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider transition-colors"
              style={{
                borderColor: filter === s ? "#C8F135" : "var(--border)",
                color: filter === s ? "#C8F135" : "var(--text-muted)",
                background: "transparent",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-brutal mb-4"
          placeholder="Search prospects..."
        />

        {/* Prospect cards */}
        <div className="space-y-3">
          {filteredProspects.length === 0 ? (
            <div className="card-brutal p-8 text-center">
              <p className="font-display text-h4" style={{ color: "var(--text-muted)" }}>
                No prospects yet. Start building your pipeline.
              </p>
              <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-xs">
                ADD FIRST PROSPECT
              </button>
            </div>
          ) : (
            filteredProspects.map((p) => {
              const readyToDM = p.status === "Warming" && (p.comment_count || 0) >= 3;
              const isExpanded = expandedId === p.id;

              return (
                <div
                  key={p.id}
                  className="card-brutal overflow-hidden"
                  style={{ borderLeft: readyToDM ? "4px solid #C8F135" : undefined }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                          {(p.comment_count || 0) > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold border-2" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                              {p.comment_count} comments
                            </span>
                          )}
                        </div>
                        {p.linkedin_url && (
                          <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs underline" style={{ color: "#168080" }}>
                            LinkedIn Profile
                          </a>
                        )}
                        {readyToDM && (
                          <div className="mt-1 text-xs font-bold" style={{ color: "#C8F135" }}>
                            READY TO DM
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button onClick={() => advanceStatus(p, -1)} className="w-8 h-8 border-2 flex items-center justify-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          ←
                        </button>
                        <span className="status-badge" style={{ borderColor: getStatusStyle(p.status), color: getStatusStyle(p.status) }}>
                          {p.status}
                        </span>
                        <button onClick={() => advanceStatus(p, 1)} className="w-8 h-8 border-2 flex items-center justify-center text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                          →
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {isExpanded ? "COLLAPSE" : "COMMENTS"}
                      </button>
                      <button
                        onClick={() => deleteProspect(p.id)}
                        className="text-xs font-bold uppercase tracking-wider text-crimson"
                      >
                        DELETE
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t-2 p-4 space-y-3" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                      {p.comments?.map((c) => (
                        <div key={c.id} className="text-sm">
                          <span style={{ color: "var(--text-muted)" }} className="text-[10px] label-caps">
                            {new Date(c.created_at).toLocaleDateString("en-PK")}
                          </span>
                          <p style={{ color: "var(--text-primary)" }}>{c.note}</p>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="input-brutal flex-1 text-sm py-2"
                          placeholder="What did you comment on?"
                          onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                        />
                        <button onClick={() => addComment(p.id)} className="btn-primary text-xs py-2 px-3">
                          ADD
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
