# Mkulima Farm Manager (Vercel + Supabase)

1. Create a free project at supabase.com. In **SQL Editor**, run `supabase/schema.sql`.
2. In Supabase **Authentication > Providers**, keep Email enabled (turn off "Confirm email" if you want instant sign-up).
3. In Vercel, import this repo (branch `vercel-supabase`) and add the variables from `.env.example`
   (Supabase **Project Settings > API** has the URL, anon key and service_role key).
4. Deploy. Email reminders need `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; they run daily at 9:00 AM Nairobi time.

Local dev: copy `.env.example` to `.env`, then `npm install && npm run dev`.
Deploy test
