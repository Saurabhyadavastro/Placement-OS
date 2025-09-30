import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import DashboardLayout from '../DashboardLayout'

// Job Listings Component with AI Recommendations
function JobListings() {
  const [opportunities, setOpportunities] = useState([])
  const [studentProfile, setStudentProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [applications, setApplications] = useState([])
  const [applying, setApplying] = useState({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch student profile with skills
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        setStudentProfile(profile)

        // Fetch verified opportunities
        const { data: opps, error: oppsError } = await supabase
          .from('opportunities')
          .select(`
            *,
            poster:profiles!opportunities_posted_by_fkey(email, role)
          `)
          .eq('is_verified', true)
          .order('created_at', { ascending: false })

        if (oppsError) {
          console.error('Error fetching opportunities:', oppsError)
        } else {
          // Calculate match scores and sort by relevance
          const opportunitiesWithScores = calculateMatchScores(opps || [], profile?.skills || [])
          setOpportunities(opportunitiesWithScores)
        }

        // Fetch student's applications
        const { data: apps } = await supabase
          .from('applications')
          .select('opportunity_id, status')
          .eq('student_id', user.id)
        
        setApplications(apps || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMatchScores = (opportunities, studentSkills) => {
    return opportunities.map(opp => {
      const jobSkills = opp.required_skills || []
      
      if (jobSkills.length === 0 || studentSkills.length === 0) {
        return { ...opp, match_score: 0, matching_skills: [] }
      }

      // Find matching skills (case-insensitive)
      const matchingSkills = jobSkills.filter(jobSkill => 
        studentSkills.some(studentSkill => 
          studentSkill.toLowerCase() === jobSkill.toLowerCase()
        )
      )

      // Calculate match score
      const match_score = matchingSkills.length / jobSkills.length

      return {
        ...opp,
        match_score,
        matching_skills: matchingSkills
      }
    }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0)) // Sort by highest match score first
  }

  const handleApply = async (opportunityId) => {
    try {
      setApplying(prev => ({ ...prev, [opportunityId]: true }))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log('Applying for opportunity:', opportunityId, 'Student ID:', user.id)

      const { data, error } = await supabase
        .from('applications')
        .insert([{
          opportunity_id: opportunityId,
          student_id: user.id,
          status: 'Pending Mentor Approval'
        }])
        .select()

      console.log('Application result:', { data, error })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          alert('You have already applied for this opportunity!')
        } else {
          console.error('Error applying:', error)
          alert('Error submitting application: ' + error.message)
        }
      } else {
        console.log('Application submitted successfully:', data)
        alert('Application submitted successfully! Status: Pending Mentor Approval')
        // Refresh applications
        fetchData()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error submitting application. Please try again.')
    } finally {
      setApplying(prev => ({ ...prev, [opportunityId]: false }))
    }
  }

  const getApplicationStatus = (opportunityId) => {
    const application = applications.find(app => app.opportunity_id === opportunityId)
    return application?.status
  }

  const filteredOpportunities = opportunities.filter(opp => {
    const matchesTitle = opp.title.toLowerCase().includes(filter.toLowerCase()) ||
                        opp.company_name.toLowerCase().includes(filter.toLowerCase()) ||
                        opp.description.toLowerCase().includes(filter.toLowerCase())
    const matchesLocation = locationFilter === '' || 
                           (opp.location && opp.location.toLowerCase().includes(locationFilter.toLowerCase()))
    return matchesTitle && matchesLocation
  })

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Group opportunities by match score for better display
  const bestMatches = filteredOpportunities.filter(opp => (opp.match_score || 0) >= 0.5)
  const goodMatches = filteredOpportunities.filter(opp => (opp.match_score || 0) >= 0.2 && (opp.match_score || 0) < 0.5)
  const otherOpportunities = filteredOpportunities.filter(opp => (opp.match_score || 0) < 0.2)

  return (
    <div>
      {/* Profile Completion Alert */}
      {!studentProfile?.skills || studentProfile.skills.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Complete your profile for better recommendations
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Add your skills in the profile section to get personalized job recommendations based on your expertise.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-blue-400 text-xl">🎯</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                AI-Powered Recommendations Active
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Jobs are ranked by relevance based on your skills: {studentProfile.skills.join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Jobs
            </label>
            <input
              type="text"
              placeholder="Search by title, company, or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              placeholder="Filter by location..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredOpportunities.length} of {opportunities.length} opportunities
        </div>
      </div>

      {/* Job Listings */}
      {filteredOpportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">💼</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {opportunities.length === 0 ? 'No Job Opportunities Available' : 'No Jobs Match Your Search'}
          </h3>
          <p className="text-gray-500">
            {opportunities.length === 0 
              ? 'Job opportunities will appear here once they are posted and verified by the TPO.'
              : 'Try adjusting your search criteria to find more opportunities.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Best Matches Section */}
          {bestMatches.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🌟</span>
                <h2 className="text-2xl font-bold text-gray-900">Best Matches</h2>
                <span className="ml-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {bestMatches.length} opportunity{bestMatches.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {bestMatches.map((opportunity) => (
                  <OpportunityCard 
                    key={opportunity.id} 
                    opportunity={opportunity} 
                    onApply={handleApply}
                    applicationStatus={getApplicationStatus(opportunity.id)}
                    applying={applying[opportunity.id]}
                    isTopMatch={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Good Matches Section */}
          {goodMatches.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">✨</span>
                <h2 className="text-2xl font-bold text-gray-900">Good Matches</h2>
                <span className="ml-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {goodMatches.length} opportunity{goodMatches.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {goodMatches.map((opportunity) => (
                  <OpportunityCard 
                    key={opportunity.id} 
                    opportunity={opportunity} 
                    onApply={handleApply}
                    applicationStatus={getApplicationStatus(opportunity.id)}
                    applying={applying[opportunity.id]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Opportunities Section */}
          {otherOpportunities.length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">📋</span>
                <h2 className="text-2xl font-bold text-gray-900">Other Opportunities</h2>
                <span className="ml-2 bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                  {otherOpportunities.length} opportunity{otherOpportunities.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-4">
                {otherOpportunities.map((opportunity) => (
                  <OpportunityCard 
                    key={opportunity.id} 
                    opportunity={opportunity} 
                    onApply={handleApply}
                    applicationStatus={getApplicationStatus(opportunity.id)}
                    applying={applying[opportunity.id]}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Individual Opportunity Card Component
function OpportunityCard({ opportunity, onApply, applicationStatus, applying, isTopMatch = false }) {
  const matchPercentage = Math.round((opportunity.match_score || 0) * 100)
  
  const getStatusButton = () => {
    if (applicationStatus) {
      const statusConfig = {
        'Pending Mentor Approval': { color: 'bg-yellow-500', text: 'Pending Approval' },
        'Approved': { color: 'bg-green-500', text: 'Application Approved' },
        'Rejected': { color: 'bg-red-500', text: 'Application Rejected' },
        'Withdrawn': { color: 'bg-gray-500', text: 'Application Withdrawn' }
      }
      const config = statusConfig[applicationStatus] || { color: 'bg-gray-500', text: applicationStatus }
      
      return (
        <button className={`px-6 py-2 ${config.color} text-white rounded-md font-medium cursor-not-allowed`} disabled>
          {config.text}
        </button>
      )
    }

    return (
      <button 
        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => onApply(opportunity.id)}
        disabled={applying}
      >
        {applying ? 'Applying...' : 'Apply Now'}
      </button>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${isTopMatch ? 'border-l-4 border-green-500' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-xl font-bold text-gray-900">{opportunity.title}</h3>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              ✅ Verified
            </span>
            {(opportunity.match_score || 0) > 0 && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                matchPercentage >= 50 
                  ? 'bg-green-100 text-green-800' 
                  : matchPercentage >= 20 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {matchPercentage}% Match
              </span>
            )}
          </div>
          <p className="text-lg text-gray-700 mb-2">{opportunity.company_name}</p>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            {opportunity.stipend_range && (
              <span className="flex items-center">
                💰 {opportunity.stipend_range}
              </span>
            )}
            {opportunity.location && (
              <span className="flex items-center">
                📍 {opportunity.location}
              </span>
            )}
            {opportunity.deadline && (
              <span className="flex items-center">
                📅 Apply by: {new Date(opportunity.deadline).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-gray-600 mb-3">{opportunity.description}</p>
          
          {/* Skills Section */}
          {opportunity.required_skills && opportunity.required_skills.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
              <div className="flex flex-wrap gap-2">
                {opportunity.required_skills?.map((skill, index) => {
                  const isMatching = opportunity.matching_skills?.includes(skill)
                  return (
                    <span 
                      key={index} 
                      className={`px-2 py-1 rounded text-sm ${
                        isMatching 
                          ? 'bg-green-100 text-green-800 font-medium' 
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isMatching && '✓ '}{skill}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-500">
            Posted by: {opportunity.poster?.role || 'Unknown'}
            <br />
            Posted: {new Date(opportunity.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="ml-4">
          {getStatusButton()}
        </div>
      </div>
      {opportunity.deadline && new Date(opportunity.deadline) < new Date() && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mt-4">
          <p className="text-red-700 text-sm font-medium">
            ⚠️ Application deadline has passed
          </p>
        </div>
      )}
    </div>
  )
}

function StudentDashboard({ session, profile }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [studentProfile, setStudentProfile] = useState({
    full_name: '',
    department: '',
    graduation_year: new Date().getFullYear(),
    skills: [],
    resume_url: '',
    cover_letter: ''
  })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [myApplications, setMyApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)

  useEffect(() => {
    fetchStudentProfile()
    if (activeTab === 'applications') {
      fetchMyApplications()
    }
  }, [session, activeTab])

  const fetchMyApplications = async () => {
    try {
      setApplicationsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          opportunity:opportunities!applications_opportunity_id_fkey(
            id, title, company_name, stipend_range, location, required_skills, description, deadline, 
            poster:profiles!opportunities_posted_by_fkey(email, role)
          )
        `)
        .eq('student_id', user.id)
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
      } else {
        setMyApplications(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setApplicationsLoading(false)
    }
  }

  const withdrawApplication = async (applicationId) => {
    try {
      const confirmWithdraw = window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')
      if (!confirmWithdraw) return

      const { error } = await supabase
        .from('applications')
        .update({ status: 'Withdrawn', updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .eq('status', 'Pending Mentor Approval') // Only allow withdrawal of pending applications

      if (error) {
        console.error('Error withdrawing application:', error)
        alert('Error withdrawing application. Please try again.')
      } else {
        alert('Application withdrawn successfully.')
        fetchMyApplications() // Refresh the list
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error withdrawing application. Please try again.')
    }
  }

  const fetchStudentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching student profile:', error)
      } else if (data) {
        setStudentProfile(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .upsert({
          user_id: session.user.id,
          full_name: studentProfile.full_name,
          department: studentProfile.department,
          graduation_year: studentProfile.graduation_year,
          skills: studentProfile.skills,
          resume_url: studentProfile.resume_url,
          cover_letter: studentProfile.cover_letter
        })

      if (error) {
        setMessage('Error saving profile: ' + error.message)
      } else {
        setMessage('Profile saved successfully!')
      }
    } catch (error) {
      setMessage('Error saving profile: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResumeUpload = async (event) => {
    try {
      setUploading(true)
      const file = event.target.files[0]
      
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('resumes')
        .upload(fileName, file)

      if (error) {
        setMessage('Error uploading file: ' + error.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName)

      setStudentProfile({
        ...studentProfile,
        resume_url: urlData.publicUrl
      })

      setMessage('Resume uploaded successfully!')
    } catch (error) {
      setMessage('Error uploading file: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !studentProfile.skills.includes(skillInput.trim())) {
      setStudentProfile({
        ...studentProfile,
        skills: [...studentProfile.skills, skillInput.trim()]
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setStudentProfile({
      ...studentProfile,
      skills: studentProfile.skills.filter(skill => skill !== skillToRemove)
    })
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'profile', label: 'My Profile', icon: '👤' },
    { id: 'applications', label: 'Applications', icon: '📄' },
    { id: 'interviews', label: 'Interviews', icon: '🗣️' },
    { id: 'jobs', label: 'Job Listings', icon: '💼' }
  ]

  return (
    <DashboardLayout session={session} profile={profile} title="Student Dashboard">
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Student Portal</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {activeTab === 'overview' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Applications</h3>
                    <p className="text-3xl font-bold text-blue-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Interviews</h3>
                    <p className="text-3xl font-bold text-green-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Job Matches</h3>
                    <p className="text-3xl font-bold text-purple-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Profile Strength</h3>
                    <p className="text-3xl font-bold text-orange-600">
                      {studentProfile.full_name ? '75%' : '25%'}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <h3 className="font-semibold text-blue-700">Complete Profile</h3>
                      <p className="text-sm text-blue-600">Add your details and skills</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <h3 className="font-semibold text-green-700">Browse Jobs</h3>
                      <p className="text-sm text-green-600">Find opportunities</p>
                    </button>
                    <button
                      onClick={() => setActiveTab('applications')}
                      className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <h3 className="font-semibold text-purple-700">Track Progress</h3>
                      <p className="text-sm text-purple-600">Monitor applications</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
                {message && (
                  <div className={`mb-4 p-4 rounded-lg ${
                    message.includes('Error') 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : 'bg-green-100 text-green-700 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={studentProfile.full_name}
                        onChange={(e) => setStudentProfile({
                          ...studentProfile,
                          full_name: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department *
                      </label>
                      <select
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={studentProfile.department}
                        onChange={(e) => setStudentProfile({
                          ...studentProfile,
                          department: e.target.value
                        })}
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Chemical">Chemical</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Graduation Year *
                      </label>
                      <input
                        type="number"
                        required
                        min="2020"
                        max="2030"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={studentProfile.graduation_year}
                        onChange={(e) => setStudentProfile({
                          ...studentProfile,
                          graduation_year: parseInt(e.target.value)
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resume Upload
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleResumeUpload}
                        disabled={uploading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {uploading && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
                      {studentProfile.resume_url && (
                        <a
                          href={studentProfile.resume_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 block"
                        >
                          View Current Resume
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Skills
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add a skill"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {studentProfile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cover Letter
                    </label>
                    <textarea
                      rows="6"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Write a brief cover letter or personal statement..."
                      value={studentProfile.cover_letter}
                      onChange={(e) => setStudentProfile({
                        ...studentProfile,
                        cover_letter: e.target.value
                      })}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Applications</h1>
                
                {/* Application Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Applications</h3>
                    <p className="text-3xl font-bold text-blue-600">{myApplications.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Review</h3>
                    <p className="text-3xl font-bold text-yellow-600">
                      {myApplications.filter(app => app.status === 'Pending Mentor Approval').length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Approved</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {myApplications.filter(app => app.status === 'Approved').length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Success Rate</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {myApplications.length > 0 
                        ? Math.round((myApplications.filter(app => app.status === 'Approved').length / myApplications.length) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Applications List */}
                {applicationsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                  </div>
                ) : myApplications.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">📄</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500 mb-6">Start applying to jobs to see your applications here.</p>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Browse Jobs
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myApplications.map((application) => {
                      const statusConfig = {
                        'Pending Mentor Approval': { 
                          color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                          icon: '⏳', 
                          text: 'Pending Review' 
                        },
                        'Approved': { 
                          color: 'bg-green-100 text-green-800 border-green-300', 
                          icon: '✅', 
                          text: 'Approved' 
                        },
                        'Rejected': { 
                          color: 'bg-red-100 text-red-800 border-red-300', 
                          icon: '❌', 
                          text: 'Rejected' 
                        },
                        'Withdrawn': { 
                          color: 'bg-gray-100 text-gray-800 border-gray-300', 
                          icon: '🚫', 
                          text: 'Withdrawn' 
                        }
                      }
                      
                      const config = statusConfig[application.status] || statusConfig['Pending Mentor Approval']
                      const canWithdraw = application.status === 'Pending Mentor Approval'
                      const appliedDate = new Date(application.applied_at)
                      const deadline = application.opportunity?.deadline ? new Date(application.opportunity.deadline) : null
                      const isDeadlinePassed = deadline && deadline < new Date()

                      return (
                        <div key={application.id} className="bg-white rounded-lg shadow p-6">
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                  {application.opportunity?.title}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
                                  {config.icon} {config.text}
                                </span>
                                {isDeadlinePassed && application.status === 'Pending Mentor Approval' && (
                                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium border border-red-300">
                                    ⚠️ Deadline Passed
                                  </span>
                                )}
                              </div>
                              <p className="text-lg text-gray-700 mb-2">{application.opportunity?.company_name}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                <span>Applied: {appliedDate.toLocaleDateString()} at {appliedDate.toLocaleTimeString()}</span>
                                {application.opportunity?.stipend_range && (
                                  <span>💰 {application.opportunity.stipend_range}</span>
                                )}
                                {application.opportunity?.location && (
                                  <span>📍 {application.opportunity.location}</span>
                                )}
                                {deadline && (
                                  <span className={isDeadlinePassed ? 'text-red-600 font-medium' : ''}>
                                    📅 Deadline: {deadline.toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {canWithdraw && (
                              <button
                                onClick={() => withdrawApplication(application.id)}
                                className="ml-4 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50 text-sm font-medium"
                              >
                                Withdraw
                              </button>
                            )}
                          </div>

                          {/* Opportunity Details */}
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-800 mb-2">Opportunity Details</h4>
                            {application.opportunity?.description && (
                              <p className="text-gray-600 mb-3">{application.opportunity.description}</p>
                            )}
                            {application.opportunity?.required_skills && application.opportunity.required_skills.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Required Skills:</p>
                                <div className="flex flex-wrap gap-2">
                                  {application.opportunity?.required_skills?.map((skill, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Status Timeline */}
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Application Timeline</h4>
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                <span className="text-sm text-gray-600">
                                  Application submitted on {appliedDate.toLocaleDateString()} at {appliedDate.toLocaleTimeString()}
                                </span>
                              </div>
                              {application.updated_at && application.updated_at !== application.applied_at && (
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full mr-3 ${
                                    application.status === 'Approved' ? 'bg-green-500' :
                                    application.status === 'Rejected' ? 'bg-red-500' :
                                    'bg-gray-500'
                                  }`}></div>
                                  <span className="text-sm text-gray-600">
                                    Status updated to "{application.status}" on {new Date(application.updated_at).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {application.mentor_comments && (
                                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                                  <p className="text-sm font-medium text-blue-800 mb-1">Mentor Comments:</p>
                                  <p className="text-sm text-blue-700">{application.mentor_comments}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Next Steps */}
                          {application.status === 'Approved' && (
                            <div className="mt-4 p-4 bg-green-50 rounded border border-green-200">
                              <p className="text-sm font-medium text-green-800 mb-1">🎉 Congratulations! Your application has been approved.</p>
                              <p className="text-sm text-green-700">
                                Next steps: Wait for the company to contact you for the interview process. 
                                Check your email regularly and be prepared!
                              </p>
                            </div>
                          )}

                          {application.status === 'Rejected' && (
                            <div className="mt-4 p-4 bg-red-50 rounded border border-red-200">
                              <p className="text-sm font-medium text-red-800 mb-1">Application not selected</p>
                              <p className="text-sm text-red-700">
                                Don't give up! Keep applying to other opportunities and consider improving your profile based on feedback.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'interviews' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Interview Schedule</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">🗣️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Interviews Scheduled</h3>
                    <p className="text-gray-500">Your interview schedule will appear here once you start the application process.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Job Listings</h1>
                
                <JobListings />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard