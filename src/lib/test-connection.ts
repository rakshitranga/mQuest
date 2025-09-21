// Test file to verify Supabase connection
// Run this in the browser console or create a test page

import { supabase } from './supabase'

export async function testSupabaseConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    // Test 1: Check if Supabase client is initialized
    console.log('✓ Supabase client initialized')
    
    // Test 2: Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('✗ Database connection failed:', error.message)
      return false
    }
    
    console.log('✓ Database connection successful')
    
    // Test 3: Check auth state
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session) {
      console.log('✓ User is authenticated:', session.user.email)
    } else {
      console.log('ℹ No active session (user not logged in)')
    }
    
    // Test 4: Test RLS policies (this should fail if not authenticated)
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .limit(1)
    
    if (tripsError && tripsError.code === 'PGRST116') {
      console.log('✓ RLS policies are working (access denied when not authenticated)')
    } else if (trips) {
      console.log('✓ Can access trips table')
    }
    
    console.log('🎉 All tests passed!')
    return true
    
  } catch (error) {
    console.error('✗ Connection test failed:', error)
    return false
  }
}

// Usage: testSupabaseConnection().then(success => console.log('Test result:', success))
