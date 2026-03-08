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
import Scorecard from "@/components/modules/Scorecard";

const TABS = [
  { key: "dashboard", label: "DASHBOARD", icon: "◧" },
  { key: "habits", label: "HABITS", icon: "☑" },
  { key: "sleep", label: "SLEEP", icon: "☾" },
  { key: "outreach", label: "OUTREACH", icon: "→" },
  { key: "content", label: "CONTENT", icon: "◇" },
  { key: "finance", label: "FINANCE", icon: "₨" },
  { key: "study", label: "STUDY", icon: "▤" },
  { key: "scorecard", label: "SCORECARD", icon: "★" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const renderModule = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard onNavigate={setActiveTab} />;
      case "habits": return <Habits />;
      case "sleep": return <Sleep />;
      case "outreach": return <Outreach />;
      case "content": return <Content />;
      case "finance": return <Finance />;
      case "study": return <Study />;
      case "scorecard": return <Scorecard />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="flex items-center gap-8">
          <h1 className="font-display text-xl tracking-wide" style={{ color: "var(--text-primary)" }}>
            BRUTAL LEDGER
          </h1>
          <div className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-3 py-2 text-xs font-bold uppercase tracking-label transition-colors"
                style={{
                  fontFamily: "var(--font-inter)",
                  color: activeTab === tab.key ? "#C8F135" : "var(--text-muted)",
                  borderBottom: activeTab === tab.key ? "2px solid #C8F135" : "2px solid transparent",
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
            className="w-10 h-10 border-2 flex items-center justify-center text-lg transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button onClick={signOut} className="btn-secondary text-xs py-2 px-3">
            SIGN OUT
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b-2" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <h1 className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
          BRUTAL LEDGER
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 border-2 flex items-center justify-center"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "var(--surface)" }}
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t-2 flex overflow-x-auto" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex-1 min-w-[60px] py-3 flex flex-col items-center gap-1"
            style={{
              color: activeTab === tab.key ? "#C8F135" : "var(--text-muted)",
            }}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
