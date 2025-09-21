# MQuest Setup Guide

This guide will walk you through setting up MQuest from scratch.

## 1. Initial Setup

### Clone and Install
```bash
git clone <your-repo-url>
cd mquest
npm install
```

### Environment Variables
```bash
cp env.example .env.local
```

## 2. Supabase Project Setup

### Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project name: "mquest"
5. Enter database password (save this!)
6. Select region closest to your users
7. Click "Create new project"

### Get Project Credentials
1. Go to Settings > API
2. Copy your project URL and anon key
3. Add them to your `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Database Setup

### Run Migration
1. Go to SQL Editor in your Supabase dashboard
2. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Paste it into the SQL editor
4. Click "Run" to execute

This will create:
- `users` table with RLS policies
- `trips` table with RLS policies
- Triggers for automatic user creation
- Helper functions for collaboration

## 4. Google OAuth Setup

### Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API:
   - APIs & Services > Library
   - Search "Google+ API"
   - Click "Enable"

### Create OAuth Credentials
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Application type: "Web application"
4. Name: "MQuest"
5. Authorized redirect URIs:
   - `https://your-project-ref.supabase.co/auth/v1/callback`
6. Click "Create"
7. Copy Client ID and Client Secret

### Configure Supabase Auth
1. In Supabase dashboard, go to Authentication > Providers
2. Find "Google" and click to configure
3. Enable Google provider
4. Enter your Client ID and Client Secret
5. Click "Save"

## 5. Test the Setup

### Start Development Server
```bash
npm run dev
```

### Test Authentication
1. Open http://localhost:3000
2. Click "Continue with Google"
3. Complete Google OAuth flow
4. You should be redirected to the trips dashboard

### Test Trip Creation
1. Click "Create New Trip"
2. You should see a new trip page
3. Try editing the title and description
4. Copy the share link and test it in an incognito window

## 6. Deployment (Optional)

### Vercel Deployment
1. Connect your GitHub repo to Vercel
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Update Google OAuth redirect URI:
   - Add `https://your-domain.vercel.app/auth/callback`
4. Deploy!

## Troubleshooting

### Common Issues

**"Invalid login credentials"**
- Check your Supabase URL and anon key
- Make sure they're in `.env.local` (not `.env`)

**Google OAuth not working**
- Verify redirect URI matches exactly
- Check that Google+ API is enabled
- Ensure Client ID/Secret are correct in Supabase

**Database errors**
- Make sure the migration ran successfully
- Check RLS policies are enabled
- Verify user creation trigger exists

**TypeScript errors**
- Run `npm install` to ensure all dependencies are installed
- Check that all files are in the correct `src/` directories

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Check Supabase logs in the dashboard
3. Verify all environment variables are set correctly
4. Make sure the database migration completed successfully

## Next Steps

Once everything is working:
1. Customize the UI to match your design preferences
2. Add more trip planning features (itinerary, budget, etc.)
3. Implement real-time collaboration features
4. Add push notifications for trip updates
5. Integrate with mapping services for location planning
