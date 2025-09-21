import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Trip {
  id: string
  title: string
  description?: string
  admin_user_id: string
  trip_data: Record<string, unknown>
  collaborator_ids: string[]
  is_public: boolean
  created_at: string
  updated_at: string
}

// Database helper functions
export const dbHelpers = {
  // Get current user profile
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (error) throw error
    return data as User
  },

  // Get user trips (created or collaborating)
  async getUserTrips(userId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .or(`admin_user_id.eq.${userId},collaborator_ids.cs.{${userId}}`)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data as Trip[]
  },

  // Get trip by ID
  async getTripById(tripId: string) {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single()
    
    if (error) throw error
    return data as Trip
  },

  // Create new trip
  async createTrip(trip: Omit<Trip, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('trips')
      .insert(trip)
      .select()
      .single()
    
    if (error) throw error
    return data as Trip
  },

  // Update trip
  async updateTrip(tripId: string, updates: Partial<Trip>) {
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', tripId)
      .select()
      .single()
    
    if (error) throw error
    return data as Trip
  },

  // Add collaborator to trip
  async addCollaboratorToTrip(tripId: string, userId: string) {
    const { data, error } = await supabase
      .rpc('add_collaborator_to_trip', {
        trip_id: tripId,
        user_id: userId
      })
    
    if (error) throw error
    return data
  },

  // Remove collaborator from trip
  async removeCollaboratorFromTrip(tripId: string, userId: string) {
    const { data, error } = await supabase
      .rpc('remove_collaborator_from_trip', {
        trip_id: tripId,
        user_id: userId
      })
    
    if (error) throw error
    return data
  }
}
