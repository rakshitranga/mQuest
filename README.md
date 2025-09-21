# MQuest

MQuest is a collaborative trip planning application built with Next.js and Supabase.

## Features

- **User Authentication**: Secure Google OAuth integration
- **Trip Management**: Create, edit, and manage trips
- **Collaboration**: Invite friends to collaborate on trips
- **Real-time Updates**: Changes sync across all collaborators
- **Shareable Links**: Easy trip sharing via URL

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Google OAuth via Supabase Auth
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account
- A Google Cloud Console project (for OAuth)

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd mquest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env.local
   ```

4. Configure your environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Run the database migration:
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the SQL

3. Configure Google OAuth:
   - Go to Authentication > Providers in your Supabase dashboard
   - Enable Google provider
   - Add your Google OAuth credentials (see Google OAuth Setup below)

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project or select an existing one

3. Enable the Google+ API:
   - Go to APIs & Services > Library
   - Search for "Google+ API" and enable it

4. Create OAuth 2.0 credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `https://your-project-ref.supabase.co/auth/v1/callback`
     - For production: `https://your-domain.com/auth/callback`

5. Copy the Client ID and Client Secret to your Supabase Auth settings

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## Database Schema

### Users Table
- `id`: UUID (references auth.users)
- `email`: Text (unique)
- `name`: Text
- `avatar_url`: Text (optional)
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Trips Table
- `id`: UUID (primary key)
- `title`: Text
- `description`: Text (optional)
- `admin_user_id`: UUID (references users.id)
- `trip_data`: JSONB (stores trip planning data)
- `collaborator_ids`: UUID[] (array of user IDs)
- `is_public`: Boolean
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Key Features

### Authentication Flow
1. Users sign in with Google OAuth
2. User profile is automatically created in the `users` table
3. JWT tokens manage session state

### Trip Collaboration
1. Trip creators can share trip URLs
2. Users can join trips by clicking shared links
3. Collaborators can view and edit trip details (if admin allows)

### Security
- Row Level Security (RLS) policies protect user data
- Users can only access trips they created or were invited to
- Admin users have full control over their trips

## API Routes

The application uses Supabase's built-in API with the following helper functions:

- `dbHelpers.getCurrentUser()` - Get current user profile
- `dbHelpers.getUserTrips(userId)` - Get user's trips
- `dbHelpers.getTripById(tripId)` - Get specific trip
- `dbHelpers.createTrip(trip)` - Create new trip
- `dbHelpers.updateTrip(tripId, updates)` - Update trip
- `dbHelpers.addCollaboratorToTrip(tripId, userId)` - Add collaborator
- `dbHelpers.removeCollaboratorFromTrip(tripId, userId)` - Remove collaborator

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Update Google OAuth redirect URIs for production domain
4. Deploy!

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
