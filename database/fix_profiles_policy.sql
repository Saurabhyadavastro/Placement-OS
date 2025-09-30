-- QUICK FIX FOR PROFILES INSERT POLICY
-- Run this in Supabase SQL Editor to fix the RLS policy issue

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "profiles_insert_auth" ON profiles;

-- Create the correct policy that allows users to insert their own profile
CREATE POLICY "profiles_insert_auth" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Verify the fix
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'profiles_insert_auth';