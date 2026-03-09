"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import Dashboard from "@/components/modules/Dashboard";
import Habits from "@/components/modules/Habits";
import Sleep from "@/components/modules/Sleep";
import Outreach from "@/components/modules/Outreach";
import Content from "@/components/modules/Content";
import Finance from "@/components/modules/Finance";
import Study from "@/components/modules/Study";
import Tasks from "@/components/modules/Tasks";
import Scorecard from "@/components/modules/Scorecard";
import Calendar from "@/components/modules/Calendar";

const TABS = [
  { key: "dashboard", label: "DASHBOARD", icon: "◧" },
  { key: "habits", label: "HABITS", icon: "☑" },
  { key: "tasks", label: "TASKS", icon: "⊞" },
  { key: "calendar", label: "CALENDAR", icon: "▦" },
  { key: "sleep", label: "SLEEP", icon: "☾" },
  { key: "outreach", label: "OUTREACH", icon: "→" },
  { key: "content", label: "CONTENT", icon: "◇" },
  { key: "finance", label: "FINANCE", icon: "₨" },
  { key: "study", label: "STUDY", icon: "▤" },
  { key: "scorecard", label: "SCORECARD", icon: "★" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Monogram() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32" className="flex-shrink-0">
      <rect width="100" height="100" fill="#f36f21"/>
      <rect x="2" y="2" width="96" height="96" fill="none" stroke="black" strokeWidth="4"/>
      <rect x="25" y="25" width="50" height="50" fill="#2ecc40" stroke="black" strokeWidth="4" transform="rotate(45 50 50)"/>
      <circle cx="50" cy="50" r="12" fill="black"/>
    </svg>
  );
}

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const renderModule = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard onNavigate={(tab: string) => setActiveTab(tab as TabKey)} />;
      case "habits": return <Habits />;
      case "tasks": return <Tasks />;
      case "calendar": return <Calendar />;
      case "sleep": return <Sleep />;
      case "outreach": return <Outreach />;
      case "content": return <Content />;
      case "finance": return <Finance />;
      case "study": return <Study />;
      case "scorecard": return <Scorecard />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Desktop Nav */}
      <nav
        className="hidden md:flex items-center justify-between px-6 py-3 sticky top-0 z-40 border-b glass"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Monogram />
            <h1 className="font-display text-xl tracking-wide" style={{ color: "var(--text-primary)" }}>
              BRUTAL LEDGER
            </h1>
          </div>
          <div className="flex gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-2.5 py-2 text-[11px] font-bold uppercase tracking-label transition-colors"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
                  borderBottom: activeTab === tab.key ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center text-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--text-primary)" }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button onClick={signOut} className="btn-secondary text-xs py-1.5 px-3">
            SIGN OUT
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40 border-b glass"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Monogram />
          <h1 className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            BRUTAL LEDGER
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center"
            style={{ color: "var(--text-primary)" }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button onClick={signOut} className="btn-secondary text-[10px] py-1 px-2">
            OUT
          </button>
        </div>
      </div>

      {/* Main content */}
      <main className="pb-24 md:pb-8 px-4 md:px-6 py-6 max-w-6xl mx-auto">
        {renderModule()}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t glass flex overflow-x-auto z-40"
        style={{ borderColor: "var(--border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 min-w-[50px] py-3 flex flex-col items-center gap-1"
            style={{
              color: activeTab === tab.key ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
