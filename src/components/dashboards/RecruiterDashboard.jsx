import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import DashboardLayout from '../DashboardLayout'

function RecruiterDashboard({ session, profile }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [opportunities, setOpportunities] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [opportunityForm, setOpportunityForm] = useState({
    title: '',
    company_name: '',
    stipend_range: '',
    location: '',
    required_skills: [],
    description: '',
    deadline: ''
  })
  const [skillInput, setSkillInput] = useState('')
  
  // Student Search States
  const [students, setStudents] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [searchFilters, setSearchFilters] = useState({
    name: '',
    skills: '',
    department: '',
    graduation_year: ''
  })
  const [searchResults, setSearchResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'applications') {
      fetchMyOpportunities()
    } else if (activeTab === 'candidates') {
      // Load all students when candidates tab is opened for the first time
      if (students.length === 0) {
        fetchAllStudents()
      }
    }
  }, [activeTab])

  const fetchAllStudents = async () => {
    try {
      setSearchLoading(true)
      const { data, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          profile:profiles!student_profiles_user_id_fkey(id, email)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching students:', error)
        setMessage('Error loading students')
      } else {
        setStudents(data || [])
        setSearchResults(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error loading students')
    } finally {
      setSearchLoading(false)
    }
  }

  const performSearch = async () => {
    try {
      setSearchLoading(true)
      setHasSearched(true)
      
      let query = supabase
        .from('student_profiles')
        .select(`
          *,
          profile:profiles!student_profiles_user_id_fkey(id, email)
        `)

      // Apply filters
      if (searchFilters.name.trim()) {
        query = query.ilike('full_name', `%${searchFilters.name.trim()}%`)
      }

      if (searchFilters.department.trim()) {
        query = query.ilike('department', `%${searchFilters.department.trim()}%`)
      }

      if (searchFilters.graduation_year.trim()) {
        query = query.eq('graduation_year', parseInt(searchFilters.graduation_year.trim()))
      }

      // For skills, we need to use contains operator for array matching
      if (searchFilters.skills.trim()) {
        const skillsArray = searchFilters.skills.split(',').map(skill => skill.trim()).filter(skill => skill)
        query = query.contains('skills', skillsArray)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Error searching students:', error)
        setMessage('Error searching students')
        setSearchResults([])
      } else {
        setSearchResults(data || [])
        setMessage(`Found ${data?.length || 0} student(s) matching your criteria`)
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error searching students')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchFilters({
      name: '',
      skills: '',
      department: '',
      graduation_year: ''
    })
    setSearchResults(students)
    setHasSearched(false)
    setMessage('')
  }

  const downloadResume = async (resumeUrl, studentName) => {
    try {
      if (!resumeUrl) {
        alert('No resume available for this student')
        return
      }

      // Get the signed URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resumeUrl.replace('/storage/v1/object/public/resumes/', ''), 60) // 1-minute expiry

      if (error) {
        console.error('Error creating signed URL:', error)
        alert('Error accessing resume. Please try again.')
        return
      }

      // Open the resume in a new tab
      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Error downloading resume:', error)
      alert('Error downloading resume. Please try again.')
    }
  }

  const fetchMyOpportunities = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('posted_by', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching opportunities:', error)
        setMessage('Error loading opportunities')
      } else {
        setOpportunities(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error loading opportunities')
    } finally {
      setLoading(false)
    }
  }

  const handleOpportunitySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase
        .from('opportunities')
        .insert([{
          ...opportunityForm,
          posted_by: session.user.id,
          is_verified: false, // Recruiter posts need verification
          deadline: opportunityForm.deadline ? new Date(opportunityForm.deadline).toISOString() : null
        }])

      if (error) {
        setMessage('Error posting opportunity: ' + error.message)
      } else {
        setMessage('Opportunity posted successfully! It will be visible to students after TPO verification.')
        setOpportunityForm({
          title: '',
          company_name: '',
          stipend_range: '',
          location: '',
          required_skills: [],
          description: '',
          deadline: ''
        })
        fetchMyOpportunities()
      }
    } catch (error) {
      setMessage('Error posting opportunity: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !opportunityForm.required_skills.includes(skillInput.trim())) {
      setOpportunityForm({
        ...opportunityForm,
        required_skills: [...opportunityForm.required_skills, skillInput.trim()]
      })
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setOpportunityForm({
      ...opportunityForm,
      required_skills: opportunityForm.required_skills.filter(skill => skill !== skillToRemove)
    })
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'jobs', label: 'Post Job', icon: '💼' },
    { id: 'applications', label: 'My Postings', icon: '📄' },
    { id: 'candidates', label: 'Student Search', icon: '�' },
    { id: 'interviews', label: 'Interviews', icon: '🗣️' },
    { id: 'company', label: 'Company Profile', icon: '🏢' }
  ]

  const verifiedCount = opportunities.filter(opp => opp.is_verified).length
  const pendingCount = opportunities.filter(opp => !opp.is_verified).length

  return (
    <DashboardLayout session={session} profile={profile} title="Recruiter Dashboard">
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recruiter Portal</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-orange-100 text-orange-700 border-r-4 border-orange-500'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                  {item.id === 'applications' && pendingCount > 0 && (
                    <span className="ml-auto bg-orange-500 text-white text-xs rounded-full px-2 py-1">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            {message && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.includes('Error') 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : 'bg-green-100 text-green-700 border border-green-200'
              }`}>
                {message}
              </div>
            )}

            {activeTab === 'overview' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Recruiter Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Jobs</h3>
                    <p className="text-3xl font-bold text-blue-600">{verifiedCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Verification</h3>
                    <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Applications</h3>
                    <p className="text-3xl font-bold text-green-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Hires</h3>
                    <p className="text-3xl font-bold text-purple-600">0</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('jobs')}
                        className="w-full p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                      >
                        <h3 className="font-semibold text-orange-700">Post New Job</h3>
                        <p className="text-sm text-orange-600">Create a new job posting</p>
                      </button>
                      <button
                        onClick={() => setActiveTab('applications')}
                        className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                      >
                        <h3 className="font-semibold text-blue-700">
                          View My Postings
                          {pendingCount > 0 && (
                            <span className="ml-2 bg-orange-500 text-white text-xs rounded-full px-2 py-1">
                              {pendingCount} pending
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-blue-600">Manage job postings</p>
                      </button>
                      <button
                        onClick={() => setActiveTab('candidates')}
                        className="w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                      >
                        <h3 className="font-semibold text-green-700">Search Students</h3>
                        <p className="text-sm text-green-600">Find candidates by skills, department, or year</p>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="text-gray-500">No recent activities</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Post New Job Opportunity</h1>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <span className="text-blue-500 mr-2">ℹ️</span>
                    <p className="text-blue-700">
                      Job postings by recruiters require TPO verification before being visible to students.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleOpportunitySubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={opportunityForm.title}
                        onChange={(e) => setOpportunityForm({
                          ...opportunityForm,
                          title: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={opportunityForm.company_name}
                        onChange={(e) => setOpportunityForm({
                          ...opportunityForm,
                          company_name: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stipend/Salary Range
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., ₹5-8 LPA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={opportunityForm.stipend_range}
                        onChange={(e) => setOpportunityForm({
                          ...opportunityForm,
                          stipend_range: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Bangalore, Remote"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={opportunityForm.location}
                        onChange={(e) => setOpportunityForm({
                          ...opportunityForm,
                          location: e.target.value
                        })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Application Deadline
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={opportunityForm.deadline}
                        onChange={(e) => setOpportunityForm({
                          ...opportunityForm,
                          deadline: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Skills
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add a required skill"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opportunityForm.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-orange-600 hover:text-orange-800"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Description *
                    </label>
                    <textarea
                      rows="6"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Detailed job description, requirements, and responsibilities..."
                      value={opportunityForm.description}
                      onChange={(e) => setOpportunityForm({
                        ...opportunityForm,
                        description: e.target.value
                      })}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {loading ? 'Posting...' : 'Post Job (Pending Verification)'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Job Postings</h1>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">💼</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Job Postings Yet</h3>
                    <p className="text-gray-500 mb-6">Start posting job opportunities to attract candidates.</p>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      Post Your First Job
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Summary */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Total:</span>
                          <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                            {opportunities.length}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Verified:</span>
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                            {verifiedCount}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Pending:</span>
                          <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                            {pendingCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Opportunities List */}
                    <div className="space-y-4">
                      {opportunities.map((opportunity) => (
                        <div key={opportunity.id} className="bg-white rounded-lg shadow p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">{opportunity.title}</h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  opportunity.is_verified
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {opportunity.is_verified ? '✅ Verified & Live' : '⏳ Pending Verification'}
                                </span>
                              </div>
                              <p className="text-lg text-gray-700 mb-2">{opportunity.company_name}</p>
                              <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                                {opportunity.stipend_range && (
                                  <span>💰 {opportunity.stipend_range}</span>
                                )}
                                {opportunity.location && (
                                  <span>📍 {opportunity.location}</span>
                                )}
                                {opportunity.deadline && (
                                  <span>📅 Deadline: {new Date(opportunity.deadline).toLocaleDateString()}</span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-3">{opportunity.description}</p>
                              {opportunity.required_skills && opportunity.required_skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {opportunity.required_skills.map((skill, index) => (
                                    <span key={index} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="text-sm text-gray-500">
                                Created: {new Date(opportunity.created_at).toLocaleString()}
                                {opportunity.updated_at !== opportunity.created_at && (
                                  <><br />Updated: {new Date(opportunity.updated_at).toLocaleString()}</>
                                )}
                              </div>
                            </div>
                          </div>
                          {!opportunity.is_verified && (
                            <div className="bg-orange-50 border border-orange-200 rounded p-3 mt-4">
                              <p className="text-orange-700 text-sm">
                                This job posting is pending TPO verification and is not yet visible to students.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'candidates' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Search</h1>
                
                {/* Search Interface */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Search & Filter Students</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Name
                      </label>
                      <input
                        type="text"
                        placeholder="Search by name..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={searchFilters.name}
                        onChange={(e) => setSearchFilters({
                          ...searchFilters,
                          name: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skills
                      </label>
                      <input
                        type="text"
                        placeholder="React, Python, etc. (comma-separated)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={searchFilters.skills}
                        onChange={(e) => setSearchFilters({
                          ...searchFilters,
                          skills: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        placeholder="Computer Science, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={searchFilters.department}
                        onChange={(e) => setSearchFilters({
                          ...searchFilters,
                          department: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Graduation Year
                      </label>
                      <input
                        type="number"
                        placeholder="2024, 2025, etc."
                        min="2020"
                        max="2030"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                        value={searchFilters.graduation_year}
                        onChange={(e) => setSearchFilters({
                          ...searchFilters,
                          graduation_year: e.target.value
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={performSearch}
                      disabled={searchLoading}
                      className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {searchLoading ? 'Searching...' : 'Search Students'}
                    </button>
                    <button
                      onClick={clearSearch}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Clear Filters
                    </button>
                  </div>

                  {hasSearched && (
                    <div className="mt-4 text-sm text-gray-600">
                      {searchResults.length > 0 
                        ? `Found ${searchResults.length} student(s) matching your criteria`
                        : 'No students found matching your search criteria'
                      }
                    </div>
                  )}
                </div>

                {/* Student Profile Modal */}
                {selectedStudent && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
                      <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
                        <button
                          onClick={() => setSelectedStudent(null)}
                          className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                          ×
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Personal Information</h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Full Name</p>
                              <p className="font-medium">{selectedStudent.full_name || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium">{selectedStudent.profile?.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Department</p>
                              <p className="font-medium">{selectedStudent.department || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Graduation Year</p>
                              <p className="font-medium">{selectedStudent.graduation_year || 'Not provided'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Skills & Resume */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Skills & Documents</h3>
                          
                          {selectedStudent.skills && selectedStudent.skills.length > 0 ? (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 mb-2">Technical Skills</p>
                              <div className="flex flex-wrap gap-2">
                                {selectedStudent.skills.map((skill, index) => (
                                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500 mb-4">No skills listed</p>
                          )}

                          {selectedStudent.resume_url ? (
                            <div>
                              <p className="text-sm text-gray-600 mb-2">Resume</p>
                              <button
                                onClick={() => downloadResume(selectedStudent.resume_url, selectedStudent.full_name)}
                                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                              >
                                <span className="mr-2">📄</span>
                                Download Resume
                              </button>
                            </div>
                          ) : (
                            <p className="text-gray-500">No resume uploaded</p>
                          )}
                        </div>
                      </div>

                      {/* Cover Letter */}
                      {selectedStudent.cover_letter && (
                        <div className="mt-6 bg-green-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Cover Letter / Personal Statement</h3>
                          <p className="text-gray-700 whitespace-pre-wrap">{selectedStudent.cover_letter}</p>
                        </div>
                      )}

                      {/* Profile Statistics */}
                      <div className="mt-6 bg-purple-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Profile Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Profile Created</p>
                            <p className="font-medium">{new Date(selectedStudent.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Last Updated</p>
                            <p className="font-medium">{new Date(selectedStudent.updated_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-4">
                        <button
                          onClick={() => setSelectedStudent(null)}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            // Future: Add to shortlist or contact functionality
                            alert('Contact feature coming soon!')
                          }}
                          className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                        >
                          Contact Student
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {searchLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
                  </div>
                ) : searchResults.length === 0 && hasSearched ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">�</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Students Found</h3>
                    <p className="text-gray-500 mb-6">Try adjusting your search criteria to find more candidates.</p>
                    <button
                      onClick={clearSearch}
                      className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">👥</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Students Available</h3>
                    <p className="text-gray-500">No student profiles are currently available in the system.</p>
                  </div>
                ) : (
                  <div>
                    {/* Results Summary */}
                    <div className="bg-white rounded-lg shadow p-4 mb-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">
                          Search Results ({searchResults.length} students)
                        </h2>
                        <div className="text-sm text-gray-600">
                          Showing profiles of students who have completed their registration
                        </div>
                      </div>
                    </div>

                    {/* Student Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {searchResults.map((student) => (
                        <div key={student.user_id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {student.full_name || 'Student Profile'}
                            </h3>
                            <p className="text-gray-600">{student.profile?.email}</p>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div>
                              <p className="text-sm text-gray-600">Department</p>
                              <p className="font-medium">{student.department || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Graduation Year</p>
                              <p className="font-medium">{student.graduation_year || 'Not specified'}</p>
                            </div>
                          </div>

                          {/* Skills Preview */}
                          {student.skills && student.skills.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm text-gray-600 mb-2">Skills</p>
                              <div className="flex flex-wrap gap-1">
                                {student.skills.slice(0, 3).map((skill, index) => (
                                  <span key={index} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                                    {skill}
                                  </span>
                                ))}
                                {student.skills.length > 3 && (
                                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                    +{student.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm"
                            >
                              View Profile
                            </button>
                            {student.resume_url && (
                              <button
                                onClick={() => downloadResume(student.resume_url, student.full_name)}
                                className="px-4 py-2 border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50 text-sm"
                                title="Download Resume"
                              >
                                📄
                              </button>
                            )}
                          </div>

                          {/* Profile Indicators */}
                          <div className="flex justify-between items-center mt-3 pt-3 border-t text-xs text-gray-500">
                            <span>Profile: {student.updated_at ? 'Updated' : 'Created'}</span>
                            <span>{new Date(student.updated_at || student.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'interviews' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Interview Management</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🗣️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Schedule Interviews</h3>
                  <p className="text-gray-500">Coordinate interview sessions with selected candidates.</p>
                </div>
              </div>
            )}

            {activeTab === 'company' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Company Profile</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Manage Company Information</h3>
                  <p className="text-gray-500">Update your company profile and recruitment preferences.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default RecruiterDashboard