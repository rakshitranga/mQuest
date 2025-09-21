-- Enable Row Level Security

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    admin_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    trip_data JSONB DEFAULT '{}',
    collaborator_ids UUID[] DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create RLS policies for trips table
CREATE POLICY "Users can view trips they created or are collaborators on" ON public.trips
    FOR SELECT USING (
        auth.uid() = admin_user_id OR 
        auth.uid() = ANY(collaborator_ids) OR
        is_public = true
    );

CREATE POLICY "Users can insert their own trips" ON public.trips
    FOR INSERT WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Trip admins can update their trips" ON public.trips
    FOR UPDATE USING (auth.uid() = admin_user_id);

CREATE POLICY "Trip admins can delete their trips" ON public.trips
    FOR DELETE USING (auth.uid() = admin_user_id);

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to add collaborator to trip
CREATE OR REPLACE FUNCTION public.add_collaborator_to_trip(trip_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trips
    SET collaborator_ids = array_append(collaborator_ids, user_id)
    WHERE id = trip_id 
    AND NOT (user_id = ANY(collaborator_ids))
    AND user_id != admin_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to remove collaborator from trip
CREATE OR REPLACE FUNCTION public.remove_collaborator_from_trip(trip_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.trips
    SET collaborator_ids = array_remove(collaborator_ids, user_id)
    WHERE id = trip_id 
    AND (auth.uid() = admin_user_id OR auth.uid() = user_id);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
