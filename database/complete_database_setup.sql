-- PLACEMENT-OS COMPLETE DATABASE SETUP
-- Single SQL file for Supabase - Run this entire script in Supabase SQL Editor
-- This will create all tables, policies, and triggers needed for the application

-- =============================================================================
-- STEP 1: CLEAN UP ANY EXISTING DATA (Optional - uncomment if needed)
-- =============================================================================

-- Uncomment these lines if you want to start completely fresh:
-- DROP TABLE IF EXISTS applications CASCADE;
-- DROP TABLE IF EXISTS opportunities CASCADE;
-- DROP TABLE IF EXISTS student_profiles CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================================================
-- STEP 2: CREATE UTILITY FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- STEP 3: CREATE ALL TABLES FIRST (Without RLS policies)
-- =============================================================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty', 'TPO', 'Recruiter')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STUDENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS student_profiles (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  full_name TEXT,
  department TEXT,
  graduation_year INTEGER,
  skills TEXT[],
  resume_url TEXT,
  cover_letter TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OPPORTUNITIES TABLE
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  stipend_range TEXT,
  location TEXT,
  required_skills TEXT[],
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  posted_by UUID REFERENCES profiles(id) NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'Pending Mentor Approval' CHECK (status IN ('Pending Mentor Approval', 'Approved', 'Rejected', 'Withdrawn', 'Interview Scheduled', 'Offer Extended')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mentor_comments TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, student_id) -- Prevent duplicate applications
);

-- =============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: DROP ANY EXISTING POLICIES TO AVOID CONFLICTS
-- =============================================================================

-- Drop profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_auth" ON profiles;

-- Drop student_profiles policies
DROP POLICY IF EXISTS "student_profiles_select_own" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_insert_own" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_update_own" ON student_profiles;
DROP POLICY IF EXISTS "student_profiles_select_faculty" ON student_profiles;

-- Drop opportunities policies
DROP POLICY IF EXISTS "opportunities_select_verified" ON opportunities;
DROP POLICY IF EXISTS "opportunities_select_tpo_all" ON opportunities;
DROP POLICY IF EXISTS "opportunities_select_own" ON opportunities;
DROP POLICY IF EXISTS "opportunities_insert_recruiters" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update_tpo" ON opportunities;
DROP POLICY IF EXISTS "opportunities_update_own" ON opportunities;

-- Drop applications policies
DROP POLICY IF EXISTS "applications_select_own" ON applications;
DROP POLICY IF EXISTS "applications_insert_students" ON applications;
DROP POLICY IF EXISTS "applications_update_withdraw" ON applications;
DROP POLICY IF EXISTS "applications_select_faculty" ON applications;
DROP POLICY IF EXISTS "applications_update_faculty" ON applications;
DROP POLICY IF EXISTS "applications_select_recruiters" ON applications;

-- =============================================================================
-- STEP 6: CREATE ALL RLS POLICIES (After all tables exist)
-- =============================================================================

-- PROFILES TABLE POLICIES
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_auth" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- STUDENT PROFILES TABLE POLICIES
CREATE POLICY "student_profiles_select_own" ON student_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "student_profiles_insert_own" ON student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_profiles_update_own" ON student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "student_profiles_select_faculty" ON student_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('Faculty', 'TPO')
    )
  );

-- OPPORTUNITIES TABLE POLICIES
CREATE POLICY "opportunities_select_verified" ON opportunities
  FOR SELECT USING (is_verified = true);

CREATE POLICY "opportunities_select_tpo_all" ON opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'TPO'
    )
  );

CREATE POLICY "opportunities_select_own" ON opportunities
  FOR SELECT USING (auth.uid() = posted_by);

CREATE POLICY "opportunities_insert_recruiters" ON opportunities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Recruiter')
    )
  );

CREATE POLICY "opportunities_update_tpo" ON opportunities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'TPO'
    )
  );

CREATE POLICY "opportunities_update_own" ON opportunities
  FOR UPDATE USING (auth.uid() = posted_by);

-- APPLICATIONS TABLE POLICIES
CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "applications_insert_students" ON applications
  FOR INSERT WITH CHECK (
    auth.uid() = student_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'Student'
    )
  );

CREATE POLICY "applications_update_withdraw" ON applications
  FOR UPDATE USING (
    auth.uid() = student_id 
    AND status = 'Pending Mentor Approval'
  ) WITH CHECK (
    status = 'Withdrawn'
  );

CREATE POLICY "applications_select_faculty" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Faculty')
    )
  );

CREATE POLICY "applications_update_faculty" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Faculty')
    )
  );

-- =============================================================================
-- STEP 7: CREATE FINAL CROSS-TABLE POLICIES
-- =============================================================================

-- This policy references both applications and opportunities tables
-- So it must be created after both tables are fully set up
CREATE POLICY "applications_select_recruiters" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_id 
      AND opportunities.posted_by = auth.uid()
    )
  );

-- =============================================================================
-- STEP 8: CREATE TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =============================================================================

-- Create updated_at trigger for student_profiles
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for opportunities
DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities;
CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create updated_at trigger for applications
DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 9: GRANT NECESSARY PERMISSIONS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON student_profiles TO authenticated;
GRANT ALL ON opportunities TO authenticated;
GRANT ALL ON applications TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- STEP 10: VERIFICATION QUERIES
-- =============================================================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'student_profiles', 'opportunities', 'applications')
ORDER BY table_name;

-- Verify all policies are active
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'student_profiles', 'opportunities', 'applications')
ORDER BY tablename, policyname;

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

-- Next steps:
-- 1. Create 'resumes' bucket in Supabase Storage (set as public)
-- 2. Run the storage policies below AFTER creating the bucket
-- 3. Test user registration in your application
-- 4. Verify all features work as expected

-- Your Placement-OS database is now ready! 🚀

-- =============================================================================
-- OPTIONAL: STORAGE BUCKET POLICIES (Run AFTER creating 'resumes' bucket)
-- =============================================================================
-- 
-- IMPORTANT: Only run these policies AFTER you have created the 'resumes' bucket
-- in Supabase Storage section. Copy and run these separately if needed:
--
-- DROP POLICY IF EXISTS "resumes_upload_own" ON storage.objects;
-- DROP POLICY IF EXISTS "resumes_select_own" ON storage.objects;
-- DROP POLICY IF EXISTS "resumes_update_own" ON storage.objects;
-- DROP POLICY IF EXISTS "resumes_delete_own" ON storage.objects;
-- DROP POLICY IF EXISTS "resumes_select_faculty" ON storage.objects;
-- 
-- CREATE POLICY "resumes_upload_own" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'resumes' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
-- 
-- CREATE POLICY "resumes_select_own" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'resumes' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
-- 
-- CREATE POLICY "resumes_update_own" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'resumes' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
-- 
-- CREATE POLICY "resumes_delete_own" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'resumes' 
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
-- 
-- CREATE POLICY "resumes_select_faculty" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'resumes' 
--     AND EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE profiles.id = auth.uid() 
--       AND profiles.role IN ('Faculty', 'TPO')
--     )
--   );