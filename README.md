# Placement OS

A comprehensive placement management system built with React, Vite, Tailwind CSS, and Supabase.

## 📊 System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React Application] --> B[React Router]
        B --> C[Role-based Dashboards]
        C --> D[Student Dashboard]
        C --> E[Faculty Dashboard]
        C --> F[TPO Dashboard]
        C --> G[Recruiter Dashboard]
    end
    
    subgraph "Authentication & State"
        H[Supabase Auth] --> I[Protected Routes]
        I --> J[User Session Management]
    end
    
    subgraph "Backend Services"
        K[Supabase Database] --> L[PostgreSQL]
        M[Supabase Storage] --> N[File Management]
        O[Real-time Updates] --> P[Live Data Sync]
    end
    
    subgraph "Database Tables"
        Q[profiles]
        R[student_profiles]
        S[job_postings]
        T[applications]
    end
    
    A --> H
    A --> K
    A --> M
    K --> Q
    K --> R
    K --> S
    K --> T
    
    style A fill:#e1f5fe
    style K fill:#f3e5f5
    style H fill:#e8f5e8
```

## 🔄 User Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant SA as Supabase Auth
    participant DB as Database
    
    U->>F: Visit Application
    F->>SA: Check Session
    SA-->>F: No Session
    F->>U: Show Landing Page
    
    U->>F: Click Sign Up/Login
    F->>U: Show Auth Form
    U->>F: Submit Credentials + Role
    F->>SA: Create Account/Login
    SA->>DB: Store User in auth.users
    SA-->>F: Return Session
    F->>DB: Create Profile Record
    DB-->>F: Confirm Profile Creation
    F->>U: Redirect to Role Dashboard
```

## 🎯 Role-Based Dashboard Flow

```mermaid
flowchart TD
    A[User Login] --> B{Check User Role}
    
    B -->|Student| C[Student Dashboard]
    B -->|Faculty| D[Faculty Dashboard]
    B -->|TPO| E[TPO Dashboard]
    B -->|Recruiter| F[Recruiter Dashboard]
    
    C --> C1[View Profile]
    C --> C2[Job Applications]
    C --> C3[Interview Schedule]
    C --> C4[Application Status]
    
    D --> D1[Student Progress]
    D --> D2[Mentorship Tools]
    D --> D3[Reports & Analytics]
    D --> D4[Guidance System]
    
    E --> E1[Student Management]
    E --> E2[Company Relations]
    E --> E3[Placement Drives]
    E --> E4[File Management]
    E --> E5[Bulk Student Upload]
    
    F --> F1[Job Postings]
    F --> F2[Candidate Pipeline]
    F --> F3[Interview Management]
    F --> F4[Application Reviews]
    
    style C fill:#bbdefb
    style D fill:#c8e6c9
    style E fill:#ffcdd2
    style F fill:#fff3e0
```

## 🏗️ Database Entity Relationship

```mermaid
erDiagram
    auth_users ||--|| profiles : "has"
    profiles ||--o| student_profiles : "extends"
    profiles ||--o| faculty_profiles : "extends"
    profiles ||--o| recruiter_profiles : "extends"
    
    profiles {
        uuid id PK
        text email
        text role
        timestamp created_at
    }
    
    student_profiles {
        uuid user_id PK,FK
        text full_name
        text department
        integer graduation_year
        text_array skills
        text resume_url
        text cover_letter
        timestamp created_at
        timestamp updated_at
    }
    
    job_postings {
        uuid id PK
        uuid recruiter_id FK
        text title
        text description
        text requirements
        text location
        integer salary_range
        timestamp deadline
        text status
    }
    
    applications {
        uuid id PK
        uuid student_id FK
        uuid job_id FK
        text status
        timestamp applied_at
        text cover_letter
    }
    
    interviews {
        uuid id PK
        uuid application_id FK
        timestamp scheduled_at
        text type
        text status
        text feedback
    }
    
    profiles ||--o{ job_postings : "recruiter creates"
    student_profiles ||--o{ applications : "applies to"
    job_postings ||--o{ applications : "receives"
    applications ||--o{ interviews : "leads to"
```

## 🔄 Student Management Workflow (TPO Dashboard)

```mermaid
flowchart LR
    A[TPO Login] --> B[Student Management]
    
    B --> C{Add Students}
    C -->|Individual| D[Single Student Form]
    C -->|Bulk| E[CSV Upload]
    
    D --> D1[Enter Details]
    D1 --> D2[Validate Form]
    D2 --> D3[Generate UUID]
    D3 --> D4[Create Profile]
    D4 --> D5[Create Student Record]
    D5 --> D6[Success Message]
    
    E --> E1[Select CSV File]
    E1 --> E2[Validate Headers]
    E2 --> E3[Parse Data]
    E3 --> E4[Process Each Row]
    E4 --> E5[Validate Email]
    E5 --> E6[Check Duplicates]
    E6 --> E7[Create Records]
    E7 --> E8[Progress Report]
    
    B --> F[View All Students]
    F --> G[Student List Table]
    G --> H[Filter & Search]
    
    style D fill:#e3f2fd
    style E fill:#f3e5f5
    style F fill:#e8f5e8
```

## 📁 File Upload Process

```mermaid
sequenceDiagram
    participant U as User (TPO)
    participant F as Frontend
    participant V as Validation
    participant S as Supabase Storage
    participant DB as Database
    
    U->>F: Select File
    F->>V: Validate File Type
    V-->>F: File Valid
    F->>F: Show Progress Bar
    F->>S: Upload to Bucket
    S-->>F: Upload Complete
    F->>DB: Save File Metadata
    DB-->>F: Metadata Saved
    F->>U: Show Success Message
    
    Note over F,S: Supported: PDF, DOC, DOCX
    Note over F,DB: Store: filename, size, category
```

## ⚡ Real-time Data Flow

```mermaid
graph LR
    subgraph "Client Side"
        A[React Components] --> B[Supabase Client]
    end
    
    subgraph "Supabase Backend"
        C[PostgreSQL Database] --> D[Real-time Engine]
        D --> E[WebSocket Connection]
    end
    
    subgraph "Real-time Features"
        F[Live Student Updates]
        G[Application Status Changes]
        H[Interview Notifications]
        I[File Upload Progress]
    end
    
    B <--> E
    E --> F
    E --> G
    E --> H
    E --> I
    
    style A fill:#e1f5fe
    style C fill:#f3e5f5
    style F fill:#e8f5e8
```

## 🔐 Security & Access Control

```mermaid
flowchart TD
    A[User Request] --> B{Authenticated?}
    B -->|No| C[Redirect to Login]
    B -->|Yes| D{Check Role}
    
    D -->|Student| E[Student Access Rules]
    D -->|Faculty| F[Faculty Access Rules]
    D -->|TPO| G[TPO Access Rules]
    D -->|Recruiter| H[Recruiter Access Rules]
    
    E --> E1[Own Profile Only]
    E --> E2[Job Applications]
    E --> E3[Public Job Listings]
    
    F --> F1[Student Profiles View]
    F --> F2[Mentorship Data]
    F --> F3[Progress Reports]
    
    G --> G1[All Student Data]
    G --> G2[Company Management]
    G --> G3[System Administration]
    G --> G4[Bulk Operations]
    
    H --> H1[Own Job Postings]
    H --> H2[Candidate Profiles]
    H --> H3[Interview Management]
    
    style B fill:#ffcdd2
    style D fill:#fff3e0
    style G1 fill:#ffebee
```

## Features
  - Students: Apply for jobs and track appl## 🚀 Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        A[Local Development] --> B[Git Repository]
        B --> C[GitHub Actions]
    end
    
    subgraph "Build Process"
        C --> D[Vite Build]
        D --> E[Static Assets]
        E --> F[Optimized Bundle]
    end
    
    subgraph "Production Deployment"
        F --> G[Render/Vercel/Netlify]
        G --> H[CDN Distribution]
    end
    
    subgraph "Backend Services"
        I[Supabase Cloud]
        J[PostgreSQL Database]
        K[Auth Service]
        L[Storage Buckets]
    end
    
    G --> I
    I --> J
    I --> K
    I --> L
    
    style A fill:#e3f2fd
    style G fill:#e8f5e8
    style I fill:#f3e5f5
```

## 🔄 Application Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Landing
    Landing --> Authentication
    
    Authentication --> Student_Dashboard : Student Role
    Authentication --> Faculty_Dashboard : Faculty Role
    Authentication --> TPO_Dashboard : TPO Role
    Authentication --> Recruiter_Dashboard : Recruiter Role
    
    Student_Dashboard --> Profile_Management
    Student_Dashboard --> Job_Search
    Student_Dashboard --> Application_Tracking
    
    Faculty_Dashboard --> Student_Monitoring
    Faculty_Dashboard --> Progress_Reports
    Faculty_Dashboard --> Mentorship_Tools
    
    TPO_Dashboard --> Student_Management
    TPO_Dashboard --> Company_Relations
    TPO_Dashboard --> File_Management
    TPO_Dashboard --> Bulk_Operations
    
    Recruiter_Dashboard --> Job_Posting
    Recruiter_Dashboard --> Candidate_Review
    Recruiter_Dashboard --> Interview_Scheduling
    
    Profile_Management --> [*] : Logout
    Job_Search --> [*] : Logout
    Application_Tracking --> [*] : Logout
    Student_Monitoring --> [*] : Logout
    Student_Management --> [*] : Logout
    Job_Posting --> [*] : Logout
```

- **Multi-Role Authentication**: Support for 4 user types:

## 📊 TPO Dashboard Feature Map

```mermaid
mindmap
  root((TPO Dashboard))
    Student Management
      Add Individual Student
        Form Validation
        UUID Generation
        Database Creation
      Bulk Upload
        CSV Processing
        Error Handling
        Progress Tracking
      View Students
        Searchable Table
        Filter Options
        Export Data
    File Management
      Upload Files
        Category Selection
        Progress Tracking
        File Validation
      Browse Files
        Organized Display
        Download Options
        File Metadata
    Analytics
      Placement Statistics
      Student Progress
      Company Relations
      Success Metrics
    System Administration
      User Management
      Role Assignment
      System Settings
      Backup & Restore
```

## 🔧 Technical Implementation Flow

```mermaid
flowchart TD
    A[User Action] --> B[React Component]
    B --> C[State Management]
    C --> D[Supabase Client]
    
    D --> E{Action Type}
    E -->|Create| F[INSERT Query]
    E -->|Read| G[SELECT Query]
    E -->|Update| H[UPDATE Query]
    E -->|Delete| I[DELETE Query]
    E -->|Upload| J[Storage API]
    
    F --> K[Database]
    G --> K
    H --> K
    I --> K
    J --> L[Storage Bucket]
    
    K --> M[Real-time Trigger]
    L --> N[File Event]
    
    M --> O[WebSocket Update]
    N --> O
    
    O --> P[Component Re-render]
    P --> Q[UI Update]
    
    style A fill:#e3f2fd
    style K fill:#f3e5f5
    style Q fill:#e8f5e8
```

### Database Schema
- `id` (uuid, primary key, foreign key to auth.users.id)
- `email` (text, user's email address)
- `role` (text, one of: Student, Faculty, TPO, Recruiter)

#### student_profiles table
- `user_id` (uuid, primary key, foreign key to profiles.id)
- `full_name` (text, student's full name)
- `department` (text, academic department)
- `graduation_year` (integer, year of graduation)
- `skills` (text[], array of skills)
- `resume_url` (text, URL to uploaded resume)
- `cover_letter` (text, personal statement/cover letter)
- `created_at` (timestamp, record creation time)
- `updated_at` (timestamp, last update time)

#### Storage Buckets
- `resumes` - Public bucket for storing student resume filesns
  - Faculty: Monitor student progress and provide guidance
  - TPO (Placement Cell): Coordinate placements and manage the process
  - Recruiters: Post jobs and find candidates

- **Role-Based Dashboards**: Unique dashboard layouts for each role:
  - Student Dashboard: Profile management, job applications, interview tracking
  - Faculty Dashboard: Student progress monitoring, guidance tools
  - TPO Dashboard: Comprehensive placement management and coordination
  - Recruiter Dashboard: Job posting, candidate management, interview scheduling

- **Student Profile Management**: Complete profile system with:
  - Personal information (name, department, graduation year)
  - Skills management with tag-based interface
  - Resume upload with Supabase Storage integration
  - Cover letter and personal statement
  - Real-time profile strength indicator

- **Secure Authentication**: Powered by Supabase Auth
- **File Upload**: Resume storage with Supabase Storage
- **Responsive Design**: Built with Tailwind CSS
- **Protected Routes**: Role-based access control
- **Real-time Data**: Supabase real-time database integration

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd placement-os
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your Project URL and anon key
3. In the Supabase Table Editor, create the required tables:

#### Profiles Table
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

#### Student Profiles Table
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

-- Enable Row Level Security and create policies
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage their own profile" ON student_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Faculty and TPO can view student profiles" ON student_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('Faculty', 'TPO')
    )
  );
```

#### Storage Bucket Setup
1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `resumes`
3. Set it as a public bucket
4. Configure storage policies for file access

For detailed database setup instructions, see `SUPABASE_SETUP.md`.

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```mermaid
graph TD
    A[Placement-OS] --> B[src/]
    A --> C[public/]
    A --> D[dist/]
    A --> E[Config Files]
    
    B --> B1[components/]
    B --> B2[supabase.js]
    B --> B3[App.jsx]
    B --> B4[main.jsx]
    B --> B5[index.css]
    
    B1 --> B1a[dashboards/]
    B1 --> B1b[HomePage.jsx]
    B1 --> B1c[LoginPage.jsx]
    B1 --> B1d[RegisterPage.jsx]
    B1 --> B1e[Dashboard.jsx]
    B1 --> B1f[ProtectedRoute.jsx]
    B1 --> B1g[DashboardLayout.jsx]
    
    B1a --> B1a1[StudentDashboard.jsx]
    B1a --> B1a2[FacultyDashboard.jsx]
    B1a --> B1a3[TpoDashboard.jsx]
    B1a --> B1a4[RecruiterDashboard.jsx]
    
    C --> C1[index.html]
    C --> C2[test.html]
    C --> C3[favicon.ico]
    
    D --> D1[assets/]
    D --> D2[index.html]
    
    E --> E1[package.json]
    E --> E2[vite.config.js]
    E --> E3[tailwind.config.js]
    E --> E4[.env]
    E --> E5[README.md]
    
    style B1a3 fill:#ffcdd2
    style B2 fill:#e1f5fe
    style E4 fill:#fff3e0
```

```
src/
├── components/
│   ├── dashboards/
│   │   ├── StudentDashboard.jsx    # Student portal with profile management
│   │   ├── FacultyDashboard.jsx    # Faculty monitoring tools
│   │   ├── TpoDashboard.jsx        # TPO coordination interface
│   │   └── RecruiterDashboard.jsx  # Recruiter management portal
│   ├── DashboardLayout.jsx         # Shared dashboard layout
│   ├── HomePage.jsx                # Landing page
│   ├── LoginPage.jsx               # User login
│   ├── RegisterPage.jsx            # User registration with role selection
│   ├── Dashboard.jsx               # Main dashboard router
│   └── ProtectedRoute.jsx          # Route protection component
├── supabase.js                     # Supabase client configuration
├── App.jsx                         # Main app component with routing
├── main.jsx                        # App entry point
└── index.css                       # Global styles with Tailwind
```

## 📋 Feature Matrix by Role

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ff0000"}}}%%
gitgraph
    commit id: "Project Init"
    branch student-features
    checkout student-features
    commit id: "Profile Management"
    commit id: "Job Applications"
    commit id: "Interview Tracking"
    
    checkout main
    branch faculty-features
    checkout faculty-features
    commit id: "Student Monitoring"
    commit id: "Progress Reports"
    commit id: "Mentorship Tools"
    
    checkout main
    branch tpo-features
    checkout tpo-features
    commit id: "Student Management"
    commit id: "Bulk Upload System"
    commit id: "File Management"
    commit id: "Company Relations"
    
    checkout main
    branch recruiter-features
    checkout recruiter-features
    commit id: "Job Posting"
    commit id: "Candidate Pipeline"
    commit id: "Interview Scheduling"
    
    checkout main
    merge student-features
    merge faculty-features
    merge tpo-features
    merge recruiter-features
    commit id: "Production Release"
```

## 🎯 User Journey Mapping

```mermaid
journey
    title Student User Journey
    section Registration
      Visit Homepage        : 5: Student
      Click Sign Up         : 4: Student
      Fill Registration     : 3: Student
      Select Student Role   : 4: Student
      Verify Email         : 3: Student
    section Profile Setup
      Login to Dashboard   : 5: Student
      Complete Profile     : 4: Student
      Upload Resume        : 3: Student
      Add Skills          : 4: Student
    section Job Application
      Browse Jobs         : 5: Student
      Apply for Position  : 4: Student
      Track Status        : 3: Student
      Attend Interview    : 4: Student
    section Success
      Receive Offer       : 5: Student
      Accept Position     : 5: Student
```

```mermaid
journey
    title TPO User Journey
    section Management Setup
      Login as TPO         : 5: TPO
      Access Dashboard     : 5: TPO
      Review System Status : 4: TPO
    section Student Management
      Add Individual Student: 4: TPO
      Bulk Upload Students : 3: TPO
      Monitor Progress     : 4: TPO
    section Company Relations
      Upload Documents     : 3: TPO
      Organize Files       : 4: TPO
      Generate Reports     : 5: TPO
    section Placement Drive
      Coordinate Events    : 4: TPO
      Track Applications   : 5: TPO
      Ensure Success       : 5: TPO
```

## User Roles & Features

### Student
- View and apply for job openings
- Track application status
- Manage personal profile
- Schedule and view interviews

### Faculty
- Monitor student progress
- View placement statistics
- Generate reports
- Provide guidance to students

### TPO (Training & Placement Officer)
- Manage company relationships
- Coordinate placement drives
- Oversee entire placement process
- Generate comprehensive reports

### Recruiter
- Post job openings
- Review student applications
- Schedule interviews
- Manage candidate pipeline

## Testing the Authentication System

### Checkpoint Verification:

#### From Prompt 1:
1. **User Registration**: 
   - Navigate to `/register`
   - Fill in email, password, and select a role
   - Submit the form
   - Check Supabase Auth dashboard for new user in `auth.users`
   - Check `profiles` table for corresponding profile record

2. **User Login**:
   - Navigate to `/login`
   - Use registered credentials to sign in
   - Verify redirection to appropriate role-based dashboard

3. **Role-based Dashboard**:
   - Confirm dashboard shows role-specific content and layout
   - Verify user profile information displays correctly

#### From Prompt 2:
1. **Role-Specific Dashboards**:
   - Login with different roles (Student, Faculty, TPO, Recruiter)
   - Verify each role sees a unique dashboard layout with proper sidebar navigation
   - Confirm role-appropriate features and content are displayed

2. **Student Profile Management**:
   - Login as a Student
   - Navigate to Profile section in the dashboard
   - Fill out personal information (name, department, graduation year)
   - Add skills using the tag-based interface
   - Upload a resume file (PDF, DOC, or DOCX)
   - Add a cover letter/personal statement
   - Submit the form

3. **Data Persistence**:
   - Check `student_profiles` table in Supabase for new/updated record
   - Verify resume file appears in `resumes` storage bucket
   - Confirm all form data is correctly saved and retrievable
   - Test profile strength indicator updates based on completion

4. **File Upload Functionality**:
   - Verify resume upload progress indicator
   - Check file size and format validation
   - Confirm "View Current Resume" link works after upload
   - Test file replacement functionality

## Database Schema

### profiles table
- `id` (uuid, primary key, foreign key to auth.users.id)
- `email` (text, user's email address)
- `role` (text, one of: Student, Faculty, TPO, Recruiter)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔧 Development Workflow

```mermaid
gitgraph
    commit id: "Initial Setup"
    commit id: "Auth System"
    branch feature-student-dashboard
    checkout feature-student-dashboard
    commit id: "Student Profile"
    commit id: "Resume Upload"
    checkout main
    merge feature-student-dashboard
    branch feature-tpo-dashboard
    checkout feature-tpo-dashboard
    commit id: "Student Management"
    commit id: "Bulk Upload"
    commit id: "File Management"
    commit id: "UUID Fixes"
    checkout main
    merge feature-tpo-dashboard
    commit id: "Production Ready"
    commit id: "GitHub Deploy"
```

## 🌟 System Capabilities Overview

```mermaid
quadrantChart
    title System Feature Priority Matrix
    x-axis Low Complexity --> High Complexity
    y-axis Low Impact --> High Impact
    
    quadrant-1 High Impact, Low Complexity
    quadrant-2 High Impact, High Complexity
    quadrant-3 Low Impact, Low Complexity  
    quadrant-4 Low Impact, High Complexity

    Authentication: [0.2, 0.9]
    Student Profiles: [0.3, 0.8]
    Role-based Access: [0.4, 0.9]
    File Upload: [0.6, 0.7]
    Bulk Operations: [0.8, 0.8]
    Real-time Updates: [0.9, 0.6]
    Analytics: [0.7, 0.5]
    Mobile Responsive: [0.3, 0.6]
```

## Technologies Used

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Real-time)
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## Next Steps

After completing this foundation, you can extend the application with:
- Role-specific features and workflows
- Job posting and application management
- Interview scheduling system
- Notification system
- File upload capabilities
- Advanced reporting and analytics

## Troubleshooting

1. **Authentication errors**: Verify Supabase URL and keys in `.env`
2. **Database errors**: Ensure `profiles` table exists with correct schema
3. **Build errors**: Check that all dependencies are installed
4. **Routing issues**: Verify React Router is properly configured

## Support

For issues and questions, please check the documentation or create an issue in the project repository.