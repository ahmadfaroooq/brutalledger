"use client";

import { useAuth } from "@/lib/auth-context";
import LoginPage from "@/components/modules/LoginPage";
import AppShell from "@/components/AppShell";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <h1 className="font-display text-h2 text-text-primary">BRUTAL LEDGER</h1>
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <AppShell />;
}
