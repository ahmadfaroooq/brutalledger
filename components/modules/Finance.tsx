"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getPKTDate, getMonthStart, getMonthEnd, formatPKR, detectCategory, EXPENSE_CATEGORIES } from "@/lib/utils";

interface Expense {
  id: string;
  date: string;
  item_name: string;
  amount_pkr: number;
  category: string;
}

interface Income {
  id: string;
  date: string;
  source_name: string;
  amount_pkr: number;
  notes: string;
}

export default function Finance() {
  const { user } = useAuth();
  const today = getPKTDate();
  const monthStart = getMonthStart(today);
  const monthEnd = getMonthEnd(today);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [savingsUpdatedAt, setSavingsUpdatedAt] = useState("");
  const [newItem, setNewItem] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeAmount, setNewIncomeAmount] = useState("");
  const [newSavings, setNewSavings] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [tab, setTab] = useState<"expenses" | "income">("expenses");

  useEffect(() => {
    if (!user) return;
    loadExpenses();
    loadIncome();
    loadSavings();
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });
    setExpenses(data || []);
  };

  const loadIncome = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("income_log")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false });
    setIncomes(data || []);
  };

  const loadSavings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("savings_balance")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();
    if (data) {
      setSavingsBalance(Number(data.balance_pkr));
      setSavingsUpdatedAt(new Date(data.updated_at).toLocaleDateString("en-PK"));
    }
  };

  const addExpense = async () => {
    if (!user || !newItem || !newAmount) return;
    const category = detectCategory(newItem);
    await supabase.from("expenses").insert({
      user_id: user.id,
      date: today,
      item_name: newItem,
      amount_pkr: parseFloat(newAmount),
      category,
    });
    setNewItem("");
    setNewAmount("");
    loadExpenses();
  };

  const updateCategory = async (id: string, category: string) => {
    await supabase.from("expenses").update({ category }).eq("id", id);
    setEditingExpenseId(null);
    loadExpenses();
  };

  const deleteExpense = async (id: string) => {
    await supabase.from("expenses").delete().eq("id", id);
    loadExpenses();
  };

  const addIncome = async () => {
    if (!user || !newIncomeName || !newIncomeAmount) return;
    await supabase.from("income_log").insert({
      user_id: user.id,
      date: today,
      source_name: newIncomeName,
      amount_pkr: parseFloat(newIncomeAmount),
    });
    setNewIncomeName("");
    setNewIncomeAmount("");
    loadIncome();
  };

  const updateSavings = async () => {
    if (!user || !newSavings) return;
    await supabase.from("savings_balance").insert({
      user_id: user.id,
      balance_pkr: parseFloat(newSavings),
    });
    setNewSavings("");
    loadSavings();
  };

  const deleteIncome = async (id: string) => {
    await supabase.from("income_log").delete().eq("id", id);
    loadIncome();
  };

  const todayExpenses = expenses.filter((e) => e.date === today);
  const dailyTotal = todayExpenses.reduce((s, e) => s + Number(e.amount_pkr), 0);
  const monthlyTotal = expenses.reduce((s, e) => s + Number(e.amount_pkr), 0);
  const monthlyIncome = incomes.reduce((s, i) => s + Number(i.amount_pkr), 0);
  const netPosition = monthlyIncome - monthlyTotal;

  // Category breakdown
  const categoryTotals = EXPENSE_CATEGORIES.map((c) => ({
    category: c,
    total: expenses.filter((e) => e.category === c).reduce((s, e) => s + Number(e.amount_pkr), 0),
  })).filter((c) => c.total > 0);
  const maxCatTotal = Math.max(...categoryTotals.map((c) => c.total), 1);

  const catColors: Record<string, string> = {
    Food: "#C8F135",
    Tools: "#168080",
    Transport: "#A87820",
    Personal: "#7A3880",
    Other: "#888880",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-h2 md:text-h1" style={{ color: "var(--text-primary)" }}>Finance</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card" style={{ borderLeft: "4px solid #A87820" }}>
          <div className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{formatPKR(dailyTotal)}</div>
          <div className="label-caps">SPENT TODAY</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #BF2222" }}>
          <div className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{formatPKR(monthlyTotal)}</div>
          <div className="label-caps">MONTHLY EXPENSES</div>
        </div>
        <div className="stat-card" style={{ borderLeft: "4px solid #3A6840" }}>
          <div className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{formatPKR(monthlyIncome)}</div>
          <div className="label-caps">MONTHLY INCOME</div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${netPosition >= 0 ? "#C8F135" : "#BF2222"}` }}>
          <div className="font-display text-h4" style={{ color: netPosition >= 0 ? "#C8F135" : "#BF2222" }}>{formatPKR(netPosition)}</div>
          <div className="label-caps">NET POSITION</div>
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("expenses")}
          className="px-4 py-2 border-2 text-xs font-bold uppercase tracking-wider"
          style={{ borderColor: tab === "expenses" ? "#C8F135" : "var(--border)", color: tab === "expenses" ? "#C8F135" : "var(--text-muted)", background: "transparent" }}
        >
          EXPENSES
        </button>
        <button
          onClick={() => setTab("income")}
          className="px-4 py-2 border-2 text-xs font-bold uppercase tracking-wider"
          style={{ borderColor: tab === "income" ? "#C8F135" : "var(--border)", color: tab === "income" ? "#C8F135" : "var(--text-muted)", background: "transparent" }}
        >
          INCOME & SAVINGS
        </button>
      </div>

      {tab === "expenses" && (
        <>
          {/* Add expense */}
          <div className="card-brutal p-4">
            <h3 className="label-caps mb-3">ADD EXPENSE</h3>
            <div className="flex gap-2">
              <input value={newItem} onChange={(e) => setNewItem(e.target.value)} className="input-brutal flex-1" placeholder="Item name" onKeyDown={(e) => e.key === "Enter" && addExpense()} />
              <input value={newAmount} onChange={(e) => setNewAmount(e.target.value)} type="number" className="input-brutal w-32" placeholder="PKR" onKeyDown={(e) => e.key === "Enter" && addExpense()} />
              <button onClick={addExpense} className="btn-primary text-xs px-3">ADD</button>
            </div>
            {newItem && (
              <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                Auto-category: {detectCategory(newItem)}
              </p>
            )}
          </div>

          {/* Today's expenses */}
          <div className="card-brutal p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="label-caps">TODAY&apos;S EXPENSES</h3>
              <span className="font-display text-h4" style={{ color: "var(--text-primary)" }}>{formatPKR(dailyTotal)}</span>
            </div>
            {todayExpenses.length === 0 ? (
              <p className="font-display text-lg" style={{ color: "var(--text-muted)" }}>Nothing spent today. Keep it up.</p>
            ) : (
              <div className="space-y-2">
                {todayExpenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center gap-3">
                      <span style={{ color: "var(--text-primary)" }}>{e.item_name}</span>
                      {editingExpenseId === e.id ? (
                        <select
                          value={editCategory}
                          onChange={(c) => { setEditCategory(c.target.value); updateCategory(e.id, c.target.value); }}
                          className="input-brutal text-xs py-1 px-2 w-28"
                        >
                          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : (
                        <button
                          onClick={() => { setEditingExpenseId(e.id); setEditCategory(e.category); }}
                          className="status-badge text-[10px]"
                          style={{ borderColor: catColors[e.category] || "var(--border)", color: catColors[e.category] || "var(--text-muted)" }}
                        >
                          {e.category}
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatPKR(Number(e.amount_pkr))}</span>
                      <button onClick={() => deleteExpense(e.id)} className="text-crimson text-xs font-bold">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category chart */}
          {categoryTotals.length > 0 && (
            <div className="card-brutal p-5">
              <h3 className="label-caps mb-4">MONTHLY BY CATEGORY</h3>
              <div className="space-y-3">
                {categoryTotals.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-bold uppercase" style={{ color: catColors[c.category] }}>{c.category}</span>
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{formatPKR(c.total)}</span>
                    </div>
                    <div className="w-full h-6 border-2" style={{ borderColor: "var(--border)" }}>
                      <div className="h-full" style={{ width: `${(c.total / maxCatTotal) * 100}%`, background: catColors[c.category] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "income" && (
        <>
          {/* Add income */}
          <div className="card-brutal p-4">
            <h3 className="label-caps mb-3">LOG CONSULTING INCOME</h3>
            <div className="flex gap-2">
              <input value={newIncomeName} onChange={(e) => setNewIncomeName(e.target.value)} className="input-brutal flex-1" placeholder="Client name" />
              <input value={newIncomeAmount} onChange={(e) => setNewIncomeAmount(e.target.value)} type="number" className="input-brutal w-32" placeholder="PKR" />
              <button onClick={addIncome} className="btn-primary text-xs px-3">ADD</button>
            </div>
          </div>

          {/* Income list */}
          <div className="card-brutal p-4">
            <h3 className="label-caps mb-3">THIS MONTH&apos;S INCOME</h3>
            {incomes.length === 0 ? (
              <p className="font-display text-lg" style={{ color: "var(--text-muted)" }}>No income logged this month yet. Close that deal.</p>
            ) : (
              <div className="space-y-2">
                {incomes.map((i) => (
                  <div key={i.id} className="flex justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--text-primary)" }}>{i.source_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: "#3A6840" }}>{formatPKR(Number(i.amount_pkr))}</span>
                      <button onClick={() => deleteIncome(i.id)} className="text-crimson text-xs font-bold">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Savings */}
          <div className="card-brutal p-4">
            <h3 className="label-caps mb-3">SAVINGS BALANCE</h3>
            <div className="font-display text-h2 mb-1" style={{ color: "#C8F135" }}>{formatPKR(savingsBalance)}</div>
            {savingsUpdatedAt && <p className="label-caps text-[10px] mb-4">Last updated: {savingsUpdatedAt}</p>}
            <div className="flex gap-2">
              <input value={newSavings} onChange={(e) => setNewSavings(e.target.value)} type="number" className="input-brutal flex-1" placeholder="New balance in PKR" />
              <button onClick={updateSavings} className="btn-primary text-xs px-3">UPDATE</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
