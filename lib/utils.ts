// Pakistan Standard Time offset
const PKT_OFFSET = 5 * 60; // minutes

export function getPKTDate(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const pkt = new Date(utc + PKT_OFFSET * 60000);
  return pkt.toISOString().split("T")[0];
}

export function getPKTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + PKT_OFFSET * 60000);
}

export function getPKTDayOfWeek(): number {
  return getPKTNow().getDay(); // 0=Sun, 1=Mon...
}

export function formatPKR(amount: number): string {
  if (amount === 0) return "PKR 0";
  const str = Math.abs(Math.round(amount)).toString();
  let result = "";
  const len = str.length;
  // Pakistani format: last 3 digits, then groups of 2
  if (len <= 3) {
    result = str;
  } else {
    result = str.slice(-3);
    let remaining = str.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + "," + result;
      remaining = remaining.slice(0, -2);
    }
    if (remaining.length > 0) {
      result = remaining + "," + result;
    }
  }
  return `PKR ${amount < 0 ? "-" : ""}${result}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PK", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PK", {
    month: "short",
    day: "numeric",
  });
}

export function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : getPKTNow();
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day;
  const sunday = new Date(d);
  sunday.setDate(diff);
  return sunday.toISOString().split("T")[0];
}

export function getWeekEnd(weekStartStr: string): string {
  const d = new Date(weekStartStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().split("T")[0];
}

export function getMonthStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : getPKTNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function getMonthEnd(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : getPKTNow();
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return lastDay.toISOString().split("T")[0];
}

export function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    days.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function detectCategory(itemName: string): string {
  const lower = itemName.toLowerCase();
  const foodWords = ["bread", "roti", "chai", "food", "lunch", "dinner", "breakfast", "paratha", "biryani", "burger", "pizza", "juice", "water", "grocery", "groceries", "sabzi", "daal", "fruit", "milk", "egg", "rice", "naan", "samosa", "tea", "coffee", "snack"];
  const toolWords = ["claude", "chatgpt", "notion", "figma", "tool", "app", "software", "subscription", "linkedin", "canva", "vercel", "supabase", "domain", "hosting"];
  const transportWords = ["careem", "uber", "fuel", "petrol", "rickshaw", "taxi", "bus", "metro", "ride", "fare"];
  const personalWords = ["clothes", "shirt", "shoes", "haircut", "barber", "phone", "mobile", "watch", "bag", "perfume"];

  if (foodWords.some((w) => lower.includes(w))) return "Food";
  if (toolWords.some((w) => lower.includes(w))) return "Tools";
  if (transportWords.some((w) => lower.includes(w))) return "Transport";
  if (personalWords.some((w) => lower.includes(w))) return "Personal";
  return "Other";
}

export function calculateDuration(start: string, end: string): number {
  // Parse "11:30 PM" format
  const parse = (t: string) => {
    const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  let startMins = parse(start);
  let endMins = parse(end);
  if (endMins <= startMins) endMins += 24 * 60; // crosses midnight
  return endMins - startMins;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export const HABIT_GROUPS = {
  prayers: {
    label: "PRAYERS",
    habits: [
      { key: "fajr", label: "Fajr on time" },
      { key: "zuhr", label: "Zuhr on time" },
      { key: "asr", label: "Asr on time" },
      { key: "maghrib", label: "Maghrib on time" },
      { key: "isha", label: "Isha on time" },
    ],
  },
  health: {
    label: "HEALTH",
    habits: [
      { key: "water_500ml", label: "500ml water on wake" },
      { key: "water_2l", label: "2L total water hit today" },
      { key: "movement", label: "Physical movement done" },
      { key: "phone_off", label: "Phone off by 10:30 PM" },
      { key: "no_doomscroll", label: "No doom scrolling over 30 minutes" },
      { key: "sleep_before_midnight", label: "Slept before midnight" },
    ],
  },
  business: {
    label: "BUSINESS",
    habits: [
      { key: "outreach_10", label: "10 outreach DMs sent" },
      { key: "comments_10", label: "10 LinkedIn comments done" },
      { key: "post_published", label: "LinkedIn post published today" },
      { key: "study_45", label: "A Level study done 45 minutes minimum" },
      { key: "weekly_review", label: "Weekly review done" },
    ],
  },
  finance: {
    label: "FINANCE",
    habits: [
      { key: "savings_target", label: "Monthly savings target hit" },
      { key: "logged_expenses", label: "Logged all expenses today" },
    ],
  },
};

export const ALL_HABITS = Object.values(HABIT_GROUPS).flatMap((g) =>
  g.habits.map((h) => h.key)
);

export const MOTIVATIONAL_LINES = [
  "Did I send my 10 outreach messages?",
  "One client at $600/month changes everything.",
  "You are not behind. You are rebuilding.",
  "The decisions start today.",
  "Distribution without conversion is the gap.",
  "Building brands that compound.",
];

export const STUDY_SUBJECTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Economics",
] as const;

export const STUDY_SCHEDULE: Record<number, string[]> = {
  0: ["Past papers — all subjects"], // Sunday
  1: ["Computer Science"], // Monday
  2: ["Mathematics"],
  3: ["Physics"],
  4: ["Economics"],
  5: ["Computer Science"],
  6: ["Mathematics", "Physics"], // Saturday
};

export const PROSPECT_STATUSES = [
  "Warming",
  "DM Sent",
  "Replied",
  "Call Booked",
  "Proposal Sent",
  "Closed",
  "Rejected",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  Warming: "teal",
  "DM Sent": "gold",
  Replied: "plum",
  "Call Booked": "crimson",
  "Proposal Sent": "gold",
  Closed: "sage",
  Rejected: "muted",
};

export const POST_FORMATS = ["Text", "Carousel", "Image", "Poll"] as const;

export const EXPENSE_CATEGORIES = [
  "Food",
  "Tools",
  "Transport",
  "Personal",
  "Other",
] as const;
