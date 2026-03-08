import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Validate token and get user_id
  const { data: tokenRow } = await supabase
    .from("calendar_tokens")
    .select("user_id")
    .eq("token", token)
    .single();

  if (!tokenRow) {
    return new NextResponse("Invalid token", { status: 403 });
  }

  // Fetch all time blocks for this user
  const { data: blocks } = await supabase
    .from("time_blocks")
    .select("*")
    .eq("user_id", tokenRow.user_id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  const toICalDate = (date: string, time: string) => {
    // date: "YYYY-MM-DD", time: "HH:MM:SS"
    const d = date.replace(/-/g, "");
    const t = time.replace(/:/g, "").slice(0, 6);
    return `${d}T${t}`;
  };

  const escapeIcal = (str: string) =>
    (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const now = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";

  const events = (blocks || [])
    .map((b) => {
      const lines = [
        "BEGIN:VEVENT",
        `UID:${b.id}@brutalledger`,
        `DTSTAMP:${now}`,
        `DTSTART;TZID=Asia/Karachi:${toICalDate(b.date, b.start_time)}`,
        `DTEND;TZID=Asia/Karachi:${toICalDate(b.date, b.end_time)}`,
        `SUMMARY:${escapeIcal(b.title)}`,
        b.notes ? `DESCRIPTION:${escapeIcal(b.notes)}` : null,
        `CATEGORIES:${escapeIcal(b.category)}`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
      return lines;
    })
    .join("\r\n");

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Brutal Ledger//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Brutal Ledger",
    "X-WR-TIMEZONE:Asia/Karachi",
    events,
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="brutalledger.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
