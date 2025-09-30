# Database Setup Guide

This folder contains the complete database setup for the Placement-OS application.

## 📁 File Structure

```
database/
├── README.md                    # This file - setup instructions  
└── complete_database_setup.sql  # Single SQL file with everything
```

## 🚀 Quick Setup (One Command)

### Step 1: Access Your Supabase Dashboard
- Go to: `https://supabase.com/dashboard/project/cigbmzeehgfquognuiet`
- Login with your account

### Step 2: Run Complete Setup
1. Open **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `complete_database_setup.sql`
3. Paste into the SQL Editor
4. Click **"Run"** to execute everything at once

### Step 3: Create Storage Bucket
1. Go to **Storage** section in Supabase
2. Click **"Create bucket"**
3. Name: `resumes`
4. Set as **Public**: `true`
5. Click **"Create bucket"**

## ✅ What This Setup Includes

### Tables Created:
- **profiles** - User roles & authentication
- **student_profiles** - Detailed student information & skills
- **opportunities** - Job/internship postings
- **applications** - Student applications with status tracking

### Security Features:
- **Row Level Security (RLS)** enabled on all tables
- **Role-based access control** (Student/Faculty/TPO/Recruiter)
- **File upload security** for resume storage
- **Data isolation** between users

### Advanced Features:
- **Automatic timestamps** with triggers
- **Duplicate prevention** for applications
- **Status workflow** for application tracking
- **Skills array storage** for students
- **File storage policies** for resumes

## 🎯 Verification

After running the setup, you should see:
- 4 tables created successfully
- Multiple policies created for each table
- All RLS policies active and working
- Storage bucket ready for file uploads

## 🧪 Test Your Setup

1. **Register a new user** in your application at `http://localhost:3002/`
2. **Try different roles** (Student, Faculty, TPO, Recruiter)
3. **Test profile creation** and data access
4. **Upload resume files** (students only)
5. **Post job opportunities** (recruiters/TPO only)

## 🆘 Troubleshooting

### If you get errors during setup:
1. **Check Supabase logs** in Dashboard > Logs
2. **Verify project credentials** in your `.env` file
3. **Ensure you have proper permissions** in Supabase
4. **Try running sections individually** if needed

### Common Issues:
- **"relation already exists"** → Tables already created, safe to ignore
- **"policy already exists"** → Policies already created, safe to ignore  
- **"permission denied"** → Check your Supabase project access
- **Storage errors** → Make sure to create the 'resumes' bucket manually

## 🚀 Ready to Use!

Once this setup is complete, your Placement-OS application will have:
- ✅ Full user authentication with roles
- ✅ Student profile management
- ✅ Job opportunity posting
- ✅ Application tracking system
- ✅ File upload capabilities
- ✅ Analytics and reporting
- ✅ Complete security implementation

Your application is production-ready! 🎉