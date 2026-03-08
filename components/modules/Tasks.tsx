"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  color: string;
  archived: boolean;
}

interface Task {
  id: string;
  project_id: string;
  title: string;
  completed: boolean;
  date: string;
  time_spent_minutes: number;
  timer_started_at: string | null;
  priority: string;
  notes: string | null;
  completed_at: string | null;
}

const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
const PRIORITY_COLORS: Record<string, string> = {
  Low: "var(--text-muted)",
  Medium: "#A87820",
  High: "#BF2222",
  Urgent: "#BF2222",
};
const PROJECT_COLORS = ["var(--accent)", "#168080", "#A87820", "#7A3880", "#BF2222", "#3A6840", "#F36F21"];

function fmtTime(mins: number): string {
  if (mins === 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function parseDurationToMinutes(input: string): number {
  const t = input.trim().toLowerCase();
  if (!t) return 0;
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  let mins = 0;
  const h = t.match(/(\d+)\s*h/);
  const m = t.match(/(\d+)\s*m/);
  if (h) mins += parseInt(h[1], 10) * 60;
  if (m) mins += parseInt(m[1], 10);
  return mins;
}

function getTrackedMinutes(task: Task): number {
  if (!task.timer_started_at) return task.time_spent_minutes;
  const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 60000);
  return task.time_spent_minutes + Math.max(1, elapsed);
}

export default function Tasks() {
  const { user } = useAuth();
  const today = getPKTDate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProject, setSelectedProject] = useState("all");
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerDisplay, setTimerDisplay] = useState("0:00");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [filter, setFilter] = useState<"today" | "active" | "completed">("today");
  const [manualMinutes, setManualMinutes] = useState("");
  const [showManualFor, setShowManualFor] = useState<string | null>(null);
  const [showCompleteFor, setShowCompleteFor] = useState<string | null>(null);
  const [completionDuration, setCompletionDuration] = useState("");

  useEffect(() => {
    if (!user) return;
    loadProjects();
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("created_at");
    setProjects(data || []);

    if (data && data.length > 0) {
      const selectedStillExists = data.some((p: Project) => p.id === selectedProject);
      if (!selectedStillExists && selectedProject !== "all") setSelectedProject("all");
      setNewTaskProject((prev) => prev || data[0].id);
    } else {
      setNewTaskProject("");
    }
  };

  const loadTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTasks(data || []);
    const running = data?.find((t: Task) => t.timer_started_at && !t.completed);
    if (running) {
      setActiveTimer(running.id);
      startTimerDisplay(running.timer_started_at!, running.time_spent_minutes);
    }
  };

  const startTimerDisplay = useCallback((startedAt: string, existingMinutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const totalSecs = existingMinutes * 60 + elapsed;
      const m = Math.floor(totalSecs / 60);
      const s = totalSecs % 60;
      setTimerDisplay(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);
  }, []);

  const addProject = async () => {
    if (!user || !newProjectName.trim()) return;
    const { data } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: newProjectName.trim(), color: newProjectColor })
      .select("id")
      .single();
    setNewProjectName("");
    setShowAddProject(false);
    if (data?.id) {
      setNewTaskProject(data.id);
      setSelectedProject(data.id);
    }
    loadProjects();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project and all tasks?")) return;
    await supabase.from("tasks").delete().eq("project_id", id);
    await supabase.from("projects").delete().eq("id", id);
    if (selectedProject === id) setSelectedProject("all");
    loadProjects();
    loadTasks();
  };

  const openAddTaskForProject = (projectId: string) => {
    setNewTaskProject(projectId);
    setShowAddTask(true);
    setShowAddProject(false);
  };

  const addTask = async () => {
    if (!user || !newTaskTitle.trim()) return;
    if (!newTaskProject) return;
    await supabase.from("tasks").insert({
      user_id: user.id,
      project_id: newTaskProject,
      title: newTaskTitle.trim(),
      date: today,
      priority: newTaskPriority,
      notes: newTaskNotes.trim() || null,
    });
    setNewTaskTitle("");
    setNewTaskNotes("");
    setShowAddTask(false);
    loadTasks();
  };

  const completeTask = async (task: Task, manualTimeInput?: string) => {
    const manualMinutes = parseDurationToMinutes(manualTimeInput || "");
    const trackedMinutes = getTrackedMinutes(task);
    const newTotal = trackedMinutes > 0 ? trackedMinutes : manualMinutes;

    if (task.timer_started_at) {
      if (timerRef.current) clearInterval(timerRef.current);
      setActiveTimer(null);
      setTimerDisplay("0:00");
    }

    await supabase
      .from("tasks")
      .update({ completed: true, completed_at: new Date().toISOString(), time_spent_minutes: newTotal, timer_started_at: null })
      .eq("id", task.id);

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: true, time_spent_minutes: newTotal, timer_started_at: null } : t)));
    setShowCompleteFor(null);
    setCompletionDuration("");
  };

  const toggleTask = async (task: Task) => {
    if (!task.completed) {
      const trackedMinutes = getTrackedMinutes(task);
      if (trackedMinutes > 0) {
        await completeTask(task);
        return;
      }
      setShowCompleteFor(task.id);
      return;
    }
    await supabase.from("tasks").update({ completed: false, completed_at: null }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: false, completed_at: null } : t)));
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    if (activeTimer === id) {
      if (timerRef.current) clearInterval(timerRef.current);
      setActiveTimer(null);
    }
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteTaskDetails = async (task: Task) => {
    if (!task.notes) return;
    if (!confirm("Are you sure you want to delete this task specification/details?")) return;
    await supabase.from("tasks").update({ notes: null }).eq("id", task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, notes: null } : t)));
  };

  const startTimer = async (task: Task) => {
    if (activeTimer) {
      const rt = tasks.find((t) => t.id === activeTimer);
      if (rt) await stopTimer(rt);
    }
    const now = new Date().toISOString();
    setActiveTimer(task.id);
    startTimerDisplay(now, task.time_spent_minutes);
    await supabase.from("tasks").update({ timer_started_at: now }).eq("id", task.id);
  };

  const stopTimer = async (task: Task) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveTimer(null);
    setTimerDisplay("0:00");
    if (task.timer_started_at) {
      const elapsed = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 60000);
      const newTotal = task.time_spent_minutes + Math.max(1, elapsed);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, time_spent_minutes: newTotal, timer_started_at: null } : t)));
      await supabase.from("tasks").update({ time_spent_minutes: newTotal, timer_started_at: null }).eq("id", task.id);
    }
  };

  const addManualTime = async (taskId: string) => {
    const mins = parseInt(manualMinutes, 10);
    if (!mins || mins <= 0) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newTotal = task.time_spent_minutes + mins;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, time_spent_minutes: newTotal } : t)));
    await supabase.from("tasks").update({ time_spent_minutes: newTotal }).eq("id", taskId);
    setManualMinutes("");
    setShowManualFor(null);
  };

  const getProject = (id: string) => projects.find((p) => p.id === id);

  const filteredTasks = tasks.filter((t) => {
    if (selectedProject !== "all" && t.project_id !== selectedProject) return false;
    if (filter === "today" && t.date !== today) return false;
    if (filter === "completed" && !t.completed) return false;
    if (filter === "active" && t.completed) return false;
    return true;
  });

  const todayTasks = tasks.filter((t) => t.date === today);
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const todayTimeSpent = todayTasks.reduce((s, t) => s + t.time_spent_minutes, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Tasks</h1>
          <p className="text-body" style={{ color: "var(--text-muted)" }}>Projects and daily task management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAddProject(!showAddProject); setShowAddTask(false); }} className="btn-secondary text-xs py-2 px-3">+ PROJECT</button>
          <button onClick={() => { setShowAddTask(!showAddTask); setShowAddProject(false); }} className="btn-primary text-xs py-2 px-3" disabled={projects.length === 0}>+ TASK</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card" style={{ borderLeft: "4px solid var(--accent-bg)" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{todayCompleted}/{todayTasks.length}</div>
          <div className="label-caps">TASKS TODAY</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #168080" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{fmtTime(todayTimeSpent)}</div>
          <div className="label-caps">TIME TRACKED</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #A87820" }}>
          <div className="font-display text-h3" style={{ color: "var(--text-primary)" }}>{projects.length}</div>
          <div className="label-caps">PROJECTS</div>
        </div>
      </div>

      {showAddProject && (
        <div className="card-brutal p-4 space-y-3">
          <h3 className="label-caps">NEW PROJECT</h3>
          <input value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} className="input-brutal" placeholder="Project name (e.g. Solo Dev Project)" onKeyDown={(e) => e.key === "Enter" && addProject()} />
          <div>
            <label className="label-caps block mb-2 text-[10px]">COLOR</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setNewProjectColor(c)} className="w-8 h-8 border-2" style={{ background: c, borderColor: newProjectColor === c ? "var(--text-primary)" : "var(--border)" }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addProject} className="btn-primary text-xs">CREATE</button>
            <button onClick={() => setShowAddProject(false)} className="btn-secondary text-xs">CANCEL</button>
          </div>
        </div>
      )}

      {showAddTask && (
        <div className="card-brutal p-4 space-y-3">
          <h3 className="label-caps">NEW TASK</h3>
          {projects.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Create a project first before adding tasks.</p>
          ) : (
            <>
              <input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="input-brutal" placeholder="Task title" onKeyDown={(e) => e.key === "Enter" && addTask()} />
              <div>
                <label className="label-caps block mb-2 text-[10px]">PROJECT</label>
                <div className="flex gap-2 flex-wrap">
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => setNewTaskProject(p.id)} className="px-3 py-2 border-2 text-xs font-bold uppercase flex items-center gap-2" style={{ borderColor: newTaskProject === p.id ? p.color : "var(--border)", color: newTaskProject === p.id ? p.color : "var(--text-muted)" }}>
                      <span className="w-2 h-2 inline-block" style={{ background: p.color }} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-caps block mb-2 text-[10px]">PRIORITY</label>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button key={p} onClick={() => setNewTaskPriority(p)} className="px-3 py-2 border-2 text-xs font-bold uppercase" style={{ borderColor: newTaskPriority === p ? PRIORITY_COLORS[p] : "var(--border)", color: newTaskPriority === p ? PRIORITY_COLORS[p] : "var(--text-muted)" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <textarea value={newTaskNotes} onChange={(e) => setNewTaskNotes(e.target.value)} className="input-brutal" rows={2} placeholder="Task specification/details (optional)" />
              <div className="flex gap-2">
                <button onClick={addTask} className="btn-primary text-xs">ADD TASK</button>
                <button onClick={() => setShowAddTask(false)} className="btn-secondary text-xs">CANCEL</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedProject("all")} className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider" style={{ borderColor: selectedProject === "all" ? "var(--accent)" : "var(--border)", color: selectedProject === "all" ? "var(--accent)" : "var(--text-muted)" }}>
          ALL
        </button>
        {projects.map((p) => (
          <button key={p.id} onClick={() => setSelectedProject(p.id)} className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ borderColor: selectedProject === p.id ? p.color : "var(--border)", color: selectedProject === p.id ? p.color : "var(--text-muted)" }}>
            <span className="w-2 h-2 inline-block" style={{ background: p.color }} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        {(["today", "active", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="px-3 py-1 border-2 text-xs font-bold uppercase tracking-wider" style={{ borderColor: filter === f ? "var(--accent)" : "var(--border)", color: filter === f ? "var(--accent)" : "var(--text-muted)" }}>
            {f}
          </button>
        ))}
      </div>

      {projects.length > 0 && selectedProject !== "all" && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{getProject(selectedProject)?.name}</span>
          <span className="label-caps text-[10px]">{tasks.filter((t) => t.project_id === selectedProject).length} tasks · {fmtTime(tasks.filter((t) => t.project_id === selectedProject).reduce((s, t) => s + t.time_spent_minutes, 0))} tracked</span>
          <button onClick={() => openAddTaskForProject(selectedProject)} className="btn-primary text-[10px] py-1 px-2">+ ADD TASK</button>
          <button onClick={() => deleteProject(selectedProject)} className="text-crimson text-[10px] font-bold uppercase tracking-wider">DELETE PROJECT</button>
        </div>
      )}

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="card-brutal p-8 text-center">
            <p className="font-display text-h4" style={{ color: "var(--text-muted)" }}>{filter === "today" ? "No tasks for today. Add one and get moving." : filter === "completed" ? "Nothing completed yet." : "No active tasks."}</p>
            {projects.length > 0 ? (
              <button onClick={() => setShowAddTask(true)} className="btn-primary mt-4 text-xs">ADD A TASK</button>
            ) : (
              <p className="text-sm mt-4" style={{ color: "var(--text-muted)" }}>Create a project first to unlock task creation.</p>
            )}
          </div>
        ) : (
          filteredTasks.map((task) => {
            const proj = getProject(task.project_id);
            const isTimerRunning = activeTimer === task.id;
            return (
              <div key={task.id} className="card-brutal p-4" style={{ borderLeft: `4px solid ${proj?.color || "var(--border)"}`, opacity: task.completed ? 0.6 : 1 }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button onClick={() => toggleTask(task)} className="mt-0.5 flex-shrink-0">
                      <div className="w-5 h-5 border-2 flex items-center justify-center" style={{ borderColor: task.completed ? "#0D0D0D" : "var(--border)", background: task.completed ? "var(--accent-bg)" : "var(--surface)" }}>
                        {task.completed && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#0D0D0D" strokeWidth="2" strokeLinecap="square" /></svg>
                        )}
                      </div>
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm" style={{ color: "var(--text-primary)", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                        <span className="status-badge text-[9px] py-0 px-1.5" style={{ borderColor: PRIORITY_COLORS[task.priority], color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                        {proj && <span className="text-[10px] font-bold" style={{ color: proj.color }}>{proj.name}</span>}
                      </div>
                      {task.notes && (
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{task.notes}</p>
                          <button onClick={() => deleteTaskDetails(task)} className="text-crimson text-[10px] font-bold uppercase">DEL DETAILS</button>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs font-bold" style={{ color: task.time_spent_minutes > 0 ? "var(--accent)" : "var(--text-muted)" }}>{isTimerRunning ? timerDisplay : fmtTime(task.time_spent_minutes)}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{task.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!task.completed && (
                      <>
                        {isTimerRunning ? (
                          <button onClick={() => stopTimer(task)} className="px-2 py-1 border-2 text-[10px] font-bold uppercase" style={{ borderColor: "#BF2222", color: "#BF2222" }}>STOP</button>
                        ) : (
                          <button onClick={() => startTimer(task)} className="px-2 py-1 border-2 text-[10px] font-bold uppercase" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>START</button>
                        )}
                        <button onClick={() => setShowManualFor(showManualFor === task.id ? null : task.id)} className="px-2 py-1 border-2 text-[10px] font-bold" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>+⏱</button>
                      </>
                    )}
                    <button onClick={() => deleteTask(task.id)} className="px-2 py-1 border-2 text-[10px] font-bold text-crimson" style={{ borderColor: "var(--border)" }}>✕</button>
                  </div>
                </div>
                {showManualFor === task.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                    <input value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} type="number" className="input-brutal w-24 text-sm py-1" placeholder="Minutes" />
                    <button onClick={() => addManualTime(task.id)} className="btn-primary text-[10px] py-1 px-2">ADD TIME</button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showCompleteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="card-brutal p-5 w-full max-w-md space-y-3">
            <h3 className="font-display text-h4" style={{ color: "var(--text-primary)" }}>Complete Task</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No tracked time found. How much time did it take to complete this task?</p>
            <input value={completionDuration} onChange={(e) => setCompletionDuration(e.target.value)} className="input-brutal" placeholder="e.g. 1h 20m" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCompleteFor(null); setCompletionDuration(""); }} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => {
                const t = tasks.find((task) => task.id === showCompleteFor);
                if (t) completeTask(t, completionDuration);
              }} className="btn-primary text-xs">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
