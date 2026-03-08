# BRUTAL LEDGER

Personal operating system for Ahmad Farooq — Neo-brutalist life tracker.

## Setup

### 1. Supabase Database
Run the `supabase-schema.sql` file in your Supabase SQL Editor to create all tables with Row Level Security.

### 2. Create Your Account
In Supabase Dashboard → Authentication → Users → Add User with your email and password.

### 3. Environment Variables
Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://moqiwbyhukvrcvrcqpsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install & Run
```bash
npm install
npm run dev
```

### 5. Deploy to Vercel
Push to GitHub, connect to Vercel, add environment variables, deploy.

## Modules
- **Dashboard** — Today's snapshot with habits, outreach, sleep, spending
- **Habits** — Daily discipline tracker with streaks across 4 groups
- **Sleep** — Multi-slot sleep logging with weekly chart and warnings
- **Outreach** — DM counter + prospect pipeline with comment logs
- **Content** — LinkedIn post performance tracking
- **Finance** — Expense logging, income, savings, category charts
- **Study** — A Level subject tracker with progress toward 160h targets
- **Scorecard** — Weekly auto-populated review with CSV export

## Stack
Next.js 14 · TypeScript · Tailwind CSS · Supabase
