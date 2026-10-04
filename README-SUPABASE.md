# Good Pasta — Supabase Gemini setup

## 1. Supabase Auth
Enable Anonymous Sign-Ins in Supabase Dashboard > Authentication > Providers > Anonymous.

## 2. Database
Run the migration:
supabase/migrations/202610040001_ai_usage_daily.sql

## 3. Edge Function secrets
Set these secrets in Supabase Edge Functions:

GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

Supabase automatically provides SUPABASE_URL and the server key environment variables to Edge Functions.

## 4. Deploy the function
supabase functions deploy chat

## 5. Netlify environment variables
Set:

VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

Do NOT put GEMINI_API_KEY in Netlify or any VITE_* variable.

## 6. Install and build
npm install
npm run build

## 7. Files removed
The old Netlify Gemini function is no longer used:
netlify/functions/chat.ts

The Netlify configuration is now at the project root:
netlify.toml
