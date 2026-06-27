# 🚀 Setup Guide — School Majors System

Follow these steps in order. Takes about 15 minutes total.

---

## Step 1 — Create your free Supabase database

1. Go to **https://supabase.com** and click **Start your project** (sign up free)
2. Click **New Project**
3. Pick a name (e.g. `school-majors`) and a database password (save it somewhere)
4. Click **Create new project** and wait ~1 minute for it to set up

---

## Step 2 — Create the students table

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `database.sql` from this folder
4. Copy all the text and paste it into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned" — that means it worked ✅

---

## Step 3 — Get your API keys

1. In your Supabase dashboard, click **Project Settings** (gear icon, bottom left)
2. Click **API**
3. Copy two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`

---

## Step 4 — Add your keys to the project

1. In the project folder, rename `.env.example` to `.env`
2. Open `.env` and fill in your values:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-long-key-here
```

---

## Step 5 — Change the admin password

Open `src/App.tsx` and find this line near the top:

```javascript
const ADMIN_PASSWORD = "school2024";
```

Change `"school2024"` to a password only you know.

---

## Step 6 — Deploy to Vercel (free hosting)

1. Create a free account at **https://github.com** and upload this project as a repository
2. Go to **https://vercel.com**, sign in with GitHub, and click **Add New Project**
3. Select your repository and click **Deploy**
4. **Important:** In Vercel, go to your project → **Settings → Environment Variables**
   and add the same two variables from your `.env` file:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Then go to **Deployments** and click **Redeploy**

Your site will be live at `your-project.vercel.app` 🎉

---

## How it works now (with database)

| Action | What happens |
|--------|-------------|
| Admin loads student data | Saved to Supabase — visible from any device |
| Student logs in | Fetched from Supabase in real time |
| Student picks a major | Saved to Supabase instantly |
| Admin views results | Live data from Supabase, refresh button available |
| Admin exports CSV | Downloads all choices as Excel-compatible file |

---

## Viewing data directly in Supabase

You can also see all student choices directly in your Supabase dashboard:
- Click **Table Editor** in the left sidebar
- Click the `students` table
- All data is visible and editable here too!
