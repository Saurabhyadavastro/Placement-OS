# Supabase Database Setup Guide

This guide will help you set up the required database tables and storage buckets for the Placement OS application.

## Prerequisites

1. Create a new project at [supabase.com](https://supabase.com)
2. Note down your Project URL and anon key from Settings > API
3. Update your `.env` file with these credentials

## Database Tables

### 1. Profiles Table (Already exists from Prompt 1)

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Student', 'Faculty', 'TPO', 'Recruiter'))
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 2. Student Profiles Table (New for Prompt 2)

```sql
CREATE TABLE student_profiles (
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

-- Enable Row Level Security
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for student profiles
CREATE POLICY "Students can view their own profile" ON student_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own profile" ON student_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own profile" ON student_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Faculty and TPO can view all student profiles
CREATE POLICY "Faculty can view student profiles" ON student_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('Faculty', 'TPO')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3. Opportunities Table (New for Prompt 3)

```sql
CREATE TABLE opportunities (
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

-- Enable Row Level Security
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- Create policies for opportunities
CREATE POLICY "Users can view verified opportunities" ON opportunities
  FOR SELECT USING (is_verified = true);

-- TPO can view all opportunities (verified and unverified)
CREATE POLICY "TPO can view all opportunities" ON opportunities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'TPO'
    )
  );

-- Users can view their own posted opportunities
CREATE POLICY "Users can view their own opportunities" ON opportunities
  FOR SELECT USING (auth.uid() = posted_by);

-- TPO and Recruiters can insert opportunities
CREATE POLICY "TPO and Recruiters can post opportunities" ON opportunities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Recruiter')
    )
  );

-- TPO can update any opportunity (for verification)
CREATE POLICY "TPO can update any opportunity" ON opportunities
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'TPO'
    )
  );

-- Users can update their own opportunities
CREATE POLICY "Users can update their own opportunities" ON opportunities
  FOR UPDATE USING (auth.uid() = posted_by);

-- Create updated_at trigger for opportunities
CREATE TRIGGER update_opportunities_updated_at
    BEFORE UPDATE ON opportunities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. Applications Table (New for Prompt 4)

```sql
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'Pending Mentor Approval' CHECK (status IN ('Pending Mentor Approval', 'Approved', 'Rejected', 'Withdrawn')),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mentor_comments TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, student_id) -- Prevent duplicate applications
);

-- Enable Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies for applications
-- Students can view their own applications
CREATE POLICY "Students can view their own applications" ON applications
  FOR SELECT USING (auth.uid() = student_id);

-- Students can insert their own applications
CREATE POLICY "Students can apply to opportunities" ON applications
  FOR INSERT WITH CHECK (
    auth.uid() = student_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'Student'
    )
  );

-- Students can withdraw their own applications
CREATE POLICY "Students can withdraw applications" ON applications
  FOR UPDATE USING (
    auth.uid() = student_id 
    AND status = 'Pending Mentor Approval'
  ) WITH CHECK (
    status = 'Withdrawn'
  );

-- TPO and Faculty can view all applications
CREATE POLICY "TPO and Faculty can view all applications" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Faculty')
    )
  );

-- TPO and Faculty can update application status
CREATE POLICY "TPO and Faculty can manage applications" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('TPO', 'Faculty')
    )
  );

-- Recruiters can view applications for their opportunities
CREATE POLICY "Recruiters can view applications for their opportunities" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM opportunities 
      WHERE opportunities.id = opportunity_id 
      AND opportunities.posted_by = auth.uid()
    )
  );

-- Create updated_at trigger for applications
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Storage Buckets

### Create Resume Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Click "Create bucket"
3. Name: `resumes`
4. Set as Public bucket: `true`
5. Click "Create bucket"

### Set Storage Policies

After creating the bucket, set up the following policies:

```sql
-- Allow users to upload their own resumes
CREATE POLICY "Users can upload their own resumes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to view their own resumes
CREATE POLICY "Users can view their own resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own resumes
CREATE POLICY "Users can update their own resumes" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own resumes
CREATE POLICY "Users can delete their own resumes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow Faculty and TPO to view all resumes
CREATE POLICY "Faculty and TPO can view all resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('Faculty', 'TPO')
    )
  );
```

## Verification Steps

### 1. Test Database Tables

Run this query to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'student_profiles');
```

### 2. Test Storage Bucket

1. Go to Storage > resumes bucket
2. Verify the bucket exists and is public
3. Check that policies are properly set

### 3. Test Application Features

1. Register as a Student
2. Login and navigate to Profile section
3. Fill out the profile form
4. Upload a resume file
5. Verify data is saved in `student_profiles` table
6. Verify file is uploaded to `resumes` bucket

## Common Issues and Solutions

### Issue: "relation 'student_profiles' does not exist"
**Solution**: Run the student_profiles table creation SQL in your Supabase SQL editor.

### Issue: "Failed to upload file"
**Solution**: 
1. Ensure the `resumes` bucket exists
2. Check that storage policies are correctly set
3. Verify the bucket is set as public

### Issue: "Row Level Security violation"
**Solution**: 
1. Ensure all RLS policies are created
2. Check that users are properly authenticated
3. Verify profile roles are correctly set

### Issue: "Skills array not saving properly"
**Solution**: Ensure the skills column is defined as `TEXT[]` (array type).

## Additional Notes

- Resume files are stored with naming convention: `{user_id}-{timestamp}.{extension}`
- Supported resume formats: PDF, DOC, DOCX
- Maximum file size: 50MB (Supabase default)
- Skills are stored as PostgreSQL arrays
- All timestamps use UTC timezone

## Next Steps

After completing this setup:
1. Test the student registration and profile creation flow
2. Verify file uploads work correctly
3. Test role-based dashboard navigation
4. Prepare for the next development phase (job postings, applications, etc.)