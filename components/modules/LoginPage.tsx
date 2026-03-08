"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg)" }}>
      <div className="card-brutal w-full max-w-md p-8">
        <h1 className="font-display text-h2 text-text-primary mb-2">
          BRUTAL LEDGER
        </h1>
        <p className="text-text-muted text-body mb-8">
          Your personal operating system.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-caps block mb-2">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-brutal"
              placeholder="ahmad@example.com"
              required
            />
          </div>

          <div>
            <label className="label-caps block mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-brutal"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="border-2 border-crimson p-3 text-crimson text-sm font-body">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "SIGNING IN..." : "SIGN IN"}
          </button>
        </form>
      </div>
    </div>
  );
}
