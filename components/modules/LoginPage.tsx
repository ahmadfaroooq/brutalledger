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
        <div className="flex items-center gap-3 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40">
            <rect width="100" height="100" fill="#f36f21"/>
            <rect x="2" y="2" width="96" height="96" fill="none" stroke="black" strokeWidth="4"/>
            <rect x="25" y="25" width="50" height="50" fill="#2ecc40" stroke="black" strokeWidth="4" transform="rotate(45 50 50)"/>
            <circle cx="50" cy="50" r="12" fill="black"/>
          </svg>
          <h1 className="font-display text-h2 text-text-primary">
            BRUTAL LEDGER
          </h1>
        </div>
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
