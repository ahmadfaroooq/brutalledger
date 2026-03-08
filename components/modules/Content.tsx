"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, POST_FORMATS } from "@/lib/utils";

interface Post {
  id: string;
  topic: string;
  format: string;
  content_text: string | null;
  image_url: string | null;
  date_posted: string;
  impressions_d1: number;
  impressions_d7: number;
  impressions_d30: number;
  comments_received: number;
  new_followers: number;
  notes: string;
}

export default function Content() {
  const { user } = useAuth();
  const today = getPKTDate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    topic: "",
    format: "Text" as string,
    content_text: "",
    image_url: "",
    date_posted: today,
    impressions_d1: 0,
    impressions_d7: 0,
    impressions_d30: 0,
    comments_received: 0,
    new_followers: 0,
    notes: "",
  });

  useEffect(() => {
    if (!user) return;
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
    if (!user) return;
    const { data } = await supabase.from("linkedin_posts").select("*").eq("user_id", user.id).order("date_posted", { ascending: false });
    setPosts(data || []);
  };

  const savePost = async () => {
    if (!user || !form.topic.trim()) return;
    const payload = {
      ...form,
      topic: form.topic.trim(),
      content_text: form.content_text.trim() || null,
      image_url: form.image_url.trim() || null,
      notes: form.notes.trim(),
    };
    if (editingId) {
      await supabase.from("linkedin_posts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("linkedin_posts").insert({ ...payload, user_id: user.id });
    }
    resetForm();
    loadPosts();
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image_url: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const editPost = (post: Post) => {
    setForm({
      topic: post.topic,
      format: post.format,
      content_text: post.content_text || "",
      image_url: post.image_url || "",
      date_posted: post.date_posted,
      impressions_d1: post.impressions_d1,
      impressions_d7: post.impressions_d7,
      impressions_d30: post.impressions_d30,
      comments_received: post.comments_received,
      new_followers: post.new_followers,
      notes: post.notes || "",
    });
    setEditingId(post.id);
    setShowForm(true);
  };

  const deletePost = async (id: string) => {
    if (!confirm("Are you sure you want to delete this content entry?")) return;
    await supabase.from("linkedin_posts").delete().eq("id", id);
    loadPosts();
  };

  const resetForm = () => {
    setForm({ topic: "", format: "Text", content_text: "", image_url: "", date_posted: today, impressions_d1: 0, impressions_d7: 0, impressions_d30: 0, comments_received: 0, new_followers: 0, notes: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const avgD7Impressions = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.impressions_d7, 0) / posts.length) : 0;
  const avgD30Impressions = posts.length > 0 ? Math.round(posts.reduce((s, p) => s + p.impressions_d30, 0) / posts.length) : 0;
  const totalD7Impressions = posts.reduce((s, p) => s + p.impressions_d7, 0);

  const formatCounts = POST_FORMATS.map((f) => ({
    format: f,
    count: posts.filter((p) => p.format === f).length,
    avgD7: posts.filter((p) => p.format === f).length > 0
      ? Math.round(posts.filter((p) => p.format === f).reduce((s, p) => s + p.impressions_d7, 0) / posts.filter((p) => p.format === f).length)
      : 0,
  }));
  const bestFormat = formatCounts.sort((a, b) => b.avgD7 - a.avgD7)[0];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Content</h1>
          <p className="text-text-muted text-body mt-1">LinkedIn post performance</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs">+ LOG POST</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="stat-card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{posts.length}</div>
          <div className="label-caps">TOTAL POSTS</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #A87820" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{avgD7Impressions.toLocaleString()}</div>
          <div className="label-caps">AVG D7 IMPRESSIONS</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #168080" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{totalD7Impressions.toLocaleString()}</div>
          <div className="label-caps">DAY 7 IMPRESSIONS</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #7A3880" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{avgD30Impressions.toLocaleString()}</div>
          <div className="label-caps">AVG 30 DAY IMPRESSIONS</div>
        </div>
        {bestFormat && bestFormat.count > 0 && (
          <div className="stat-card" style={{ borderLeft: "4px solid var(--accent)" }}>
            <div className="font-display text-h4" style={{ color: "var(--accent)" }}>{bestFormat.format}</div>
            <div className="label-caps">BEST FORMAT</div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="card-brutal p-5 space-y-4">
          <h3 className="label-caps">{editingId ? "EDIT POST" : "LOG NEW POST"}</h3>
          <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input-brutal" placeholder="What was the topic?" />

          <div>
            <label className="label-caps block mb-2 text-[10px]">FORMAT</label>
            <div className="flex gap-2">
              {POST_FORMATS.map((f) => (
                <button key={f} onClick={() => setForm({ ...form, format: f })} className="px-3 py-2 border-2 text-xs font-bold uppercase" style={{ borderColor: form.format === f ? "var(--accent)" : "var(--border)", background: form.format === f ? "var(--accent)" : "transparent", color: form.format === f ? "#0D0D0D" : "var(--text-muted)" }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label-caps block mb-2 text-[10px]">TEXT CONTENT</label>
              <textarea value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} className="input-brutal" rows={4} placeholder="Write your post content..." />
            </div>
            <div className="space-y-2">
              <label className="label-caps block text-[10px]">IMAGE</label>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="input-brutal" />
              <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-brutal" placeholder="Or paste image URL / data URL" />
              {form.image_url && <img src={form.image_url} alt="Content preview" className="border-2" style={{ borderColor: "var(--border)", maxHeight: 180, objectFit: "cover" }} />}
            </div>
          </div>

          <div>
            <label className="label-caps block mb-2 text-[10px]">DATE POSTED</label>
            <input type="date" value={form.date_posted} onChange={(e) => setForm({ ...form, date_posted: e.target.value })} className="input-brutal" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><label className="label-caps block mb-1 text-[10px]">DAY 1</label><input type="number" value={form.impressions_d1 || ""} onChange={(e) => setForm({ ...form, impressions_d1: parseInt(e.target.value, 10) || 0 })} className="input-brutal" placeholder="0" /></div>
            <div><label className="label-caps block mb-1 text-[10px]">DAY 7</label><input type="number" value={form.impressions_d7 || ""} onChange={(e) => setForm({ ...form, impressions_d7: parseInt(e.target.value, 10) || 0 })} className="input-brutal" placeholder="0" /></div>
            <div><label className="label-caps block mb-1 text-[10px]">DAY 30</label><input type="number" value={form.impressions_d30 || ""} onChange={(e) => setForm({ ...form, impressions_d30: parseInt(e.target.value, 10) || 0 })} className="input-brutal" placeholder="0" /></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="label-caps block mb-1 text-[10px]">COMMENTS</label><input type="number" value={form.comments_received || ""} onChange={(e) => setForm({ ...form, comments_received: parseInt(e.target.value, 10) || 0 })} className="input-brutal" placeholder="0" /></div>
            <div><label className="label-caps block mb-1 text-[10px]">NEW FOLLOWERS</label><input type="number" value={form.new_followers || ""} onChange={(e) => setForm({ ...form, new_followers: parseInt(e.target.value, 10) || 0 })} className="input-brutal" placeholder="0" /></div>
          </div>

          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-brutal" rows={2} placeholder="Notes (optional)" />

          <div className="flex gap-2">
            <button onClick={savePost} className="btn-primary text-xs">{editingId ? "UPDATE" : "SAVE"}</button>
            <button onClick={resetForm} className="btn-secondary text-xs">CANCEL</button>
          </div>
        </div>
      )}

      <div className="card-brutal overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)" }}>
              <th className="label-caps text-left p-3 text-[10px]">TOPIC</th>
              <th className="label-caps text-left p-3 text-[10px]">CONTENT ENTRY</th>
              <th className="label-caps text-left p-3 text-[10px]">FORMAT</th>
              <th className="label-caps text-left p-3 text-[10px]">DATE</th>
              <th className="label-caps text-right p-3 text-[10px]">D7</th>
              <th className="label-caps text-right p-3 text-[10px]">D30</th>
              <th className="label-caps text-right p-3 text-[10px]">CMTS</th>
              <th className="label-caps p-3 text-[10px]"></th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center"><p className="font-display text-h4" style={{ color: "var(--text-muted)" }}>No posts logged yet. Start publishing.</p></td></tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-b" style={{ borderColor: "var(--border)" }}>
                  <td className="p-3 font-bold" style={{ color: "var(--text-primary)" }}>{p.topic}</td>
                  <td className="p-3" style={{ color: "var(--text-muted)", maxWidth: 260 }}>
                    <div className="space-y-2">
                      {p.content_text && <p className="text-xs">{p.content_text}</p>}
                      {p.image_url && <img src={p.image_url} alt="entry" className="border-2" style={{ borderColor: "var(--border)", width: 96, height: 64, objectFit: "cover" }} />}
                    </div>
                  </td>
                  <td className="p-3"><span className="status-badge" style={{ borderColor: "#168080", color: "#168080" }}>{p.format}</span></td>
                  <td className="p-3" style={{ color: "var(--text-muted)" }}>{p.date_posted}</td>
                  <td className="p-3 text-right font-bold" style={{ color: "var(--text-primary)" }}>{p.impressions_d7.toLocaleString()}</td>
                  <td className="p-3 text-right" style={{ color: "var(--text-muted)" }}>{p.impressions_d30.toLocaleString()}</td>
                  <td className="p-3 text-right" style={{ color: "var(--text-muted)" }}>{p.comments_received}</td>
                  <td className="p-3"><div className="flex gap-1"><button onClick={() => editPost(p)} className="text-[10px] font-bold uppercase" style={{ color: "#168080" }}>EDIT</button><button onClick={() => deletePost(p.id)} className="text-[10px] font-bold uppercase text-crimson">DEL</button></div></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
