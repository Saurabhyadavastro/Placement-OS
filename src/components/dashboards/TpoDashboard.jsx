import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import DashboardLayout from '../DashboardLayout'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

function TpoDashboard({ session, profile }) {
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
  
  // Analytics States
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalRecruiters: 0,
    totalApplications: 0,
    verifiedOpportunities: 0,
    pendingOpportunities: 0,
    applicationsByStatus: [],
    placementRate: 0,
    topCompanies: [],
    monthlyApplications: []
  })
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  
  // Application Management States
  const [allApplications, setAllApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [statusUpdateLoading, setStatusUpdateLoading] = useState({})

  useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'verification') {
      fetchOpportunities()
    } else if (activeTab === 'overview') {
      fetchAnalytics()
    } else if (activeTab === 'applications') {
      fetchAllApplications()
    }
  }, [activeTab])

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true)

      // Fetch total students
      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Student')

      // Fetch total recruiters
      const { count: recruitersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Recruiter')

      // Fetch total applications
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })

      // Fetch verified opportunities
      const { count: verifiedCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true)

      // Fetch pending opportunities
      const { count: pendingCount } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false)

      // Fetch applications by status for chart
      const { data: applicationsData } = await supabase
        .from('applications')
        .select('status')

      // Process applications by status
      const statusCounts = applicationsData?.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      }, {}) || {}

      const applicationsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: applicationsCount > 0 ? Math.round((count / applicationsCount) * 100) : 0
      }))

      // Calculate placement rate (Approved applications / Total applications)
      const approvedCount = statusCounts['Approved'] || 0
      const placementRate = applicationsCount > 0 ? Math.round((approvedCount / applicationsCount) * 100) : 0

      // Fetch top companies by application count
      const { data: companyData } = await supabase
        .from('applications')
        .select(`
          opportunity:opportunities!applications_opportunity_id_fkey(company_name)
        `)

      const companyCounts = companyData?.reduce((acc, app) => {
        const company = app.opportunity?.company_name
        if (company) {
          acc[company] = (acc[company] || 0) + 1
        }
        return acc
      }, {}) || {}

      const topCompanies = Object.entries(companyCounts)
        .map(([company, count]) => ({ company, applications: count }))
        .sort((a, b) => b.applications - a.applications)
        .slice(0, 5)

      // Fetch monthly applications data (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: monthlyData } = await supabase
        .from('applications')
        .select('applied_at')
        .gte('applied_at', sixMonthsAgo.toISOString())

      const monthlyApplications = monthlyData?.reduce((acc, app) => {
        const month = new Date(app.applied_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        acc[month] = (acc[month] || 0) + 1
        return acc
      }, {}) || {}

      const monthlyApplicationsArray = Object.entries(monthlyApplications)
        .map(([month, count]) => ({ month, applications: count }))
        .sort((a, b) => new Date(a.month) - new Date(b.month))

      setAnalytics({
        totalStudents: studentsCount || 0,
        totalRecruiters: recruitersCount || 0,
        totalApplications: applicationsCount || 0,
        verifiedOpportunities: verifiedCount || 0,
        pendingOpportunities: pendingCount || 0,
        applicationsByStatus,
        placementRate,
        topCompanies,
        monthlyApplications: monthlyApplicationsArray
      })

    } catch (error) {
      console.error('Error fetching analytics:', error)
      setMessage('Error loading analytics data')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const fetchAllApplications = async () => {
    try {
      setApplicationsLoading(true)
      console.log('Fetching applications...')
      
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          student:profiles!applications_student_id_fkey(id, email, role),
          opportunity:opportunities!applications_opportunity_id_fkey(
            id, title, company_name, stipend_range, location, required_skills, description, deadline,
            poster:profiles!opportunities_posted_by_fkey(email, role)
          )
        `)
        .order('applied_at', { ascending: false })

      console.log('Applications query result:', { data, error })

      if (error) {
        console.error('Error fetching applications:', error)
        setMessage('Error loading applications: ' + error.message)
      } else {
        console.log('Successfully fetched applications:', data?.length || 0)
        
        // Now fetch student profiles separately and merge them
        if (data && data.length > 0) {
          const studentIds = data.map(app => app.student_id).filter(Boolean)
          
          if (studentIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabase
              .from('student_profiles')
              .select('user_id, full_name, department, graduation_year, skills')
              .in('user_id', studentIds)
            
            console.log('Student profiles:', profiles)
            
            // Merge student profiles with applications
            const enrichedApplications = data.map(app => ({
              ...app,
              student_profile: profiles?.find(profile => profile.user_id === app.student_id) || null
            }))
            
            setAllApplications(enrichedApplications)
          } else {
            setAllApplications(data)
          }
        } else {
          setAllApplications(data || [])
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error loading applications: ' + error.message)
    } finally {
      setApplicationsLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId, newStatus, comments = '') => {
    try {
      setStatusUpdateLoading(prev => ({ ...prev, [applicationId]: true }))

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (comments) {
        updateData.mentor_comments = comments
      }

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', applicationId)

      if (error) {
        console.error('Error updating application:', error)
        setMessage('Error updating application status. Please try again.')
      } else {
        setMessage(`Application status updated to "${newStatus}" successfully!`)
        fetchAllApplications() // Refresh the applications list
        fetchAnalytics() // Refresh analytics
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error updating application status. Please try again.')
    } finally {
      setStatusUpdateLoading(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  const fetchOpportunities = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('opportunities')
        .select(`
          *,
          poster:profiles!opportunities_posted_by_fkey(email, role)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching opportunities:', error)
        setMessage('Error loading opportunities: ' + error.message)
      } else {
        setOpportunities(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('Error loading opportunities: ' + error.message)
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
          is_verified: true, // TPO posts are automatically verified
          deadline: opportunityForm.deadline ? new Date(opportunityForm.deadline).toISOString() : null
        }])

      if (error) {
        setMessage('Error posting opportunity: ' + error.message)
      } else {
        setMessage('Opportunity posted successfully!')
        setOpportunityForm({
          title: '',
          company_name: '',
          stipend_range: '',
          location: '',
          required_skills: [],
          description: '',
          deadline: ''
        })
        fetchOpportunities()
      }
    } catch (error) {
      setMessage('Error posting opportunity: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleVerification = async (opportunityId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ is_verified: !currentStatus })
        .eq('id', opportunityId)

      if (error) {
        setMessage('Error updating verification status: ' + error.message)
      } else {
        setMessage(`Opportunity ${!currentStatus ? 'verified' : 'unverified'} successfully!`)
        fetchOpportunities()
      }
    } catch (error) {
      setMessage('Error updating verification: ' + error.message)
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
    { id: 'overview', label: 'Analytics Dashboard', icon: '📊' },
    { id: 'applications', label: 'Application Tracking', icon: '📋' },
    { id: 'verification', label: 'Verify Opportunities', icon: '✅' },
    { id: 'jobs', label: 'Post Opportunity', icon: '💼' },
    { id: 'companies', label: 'Company Relations', icon: '🏢' },
    { id: 'students', label: 'Student Management', icon: '👥' },
    { id: 'schedule', label: 'Interview Schedule', icon: '📅' },
    { id: 'reports', label: 'Placement Reports', icon: '📈' }
  ]

  const verifiedCount = opportunities.filter(opp => opp.is_verified).length
  const unverifiedCount = opportunities.filter(opp => !opp.is_verified).length

  return (
    <DashboardLayout session={session} profile={profile} title="TPO Dashboard">
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">TPO Portal</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-purple-100 text-purple-700 border-r-4 border-purple-500'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                  {item.id === 'verification' && unverifiedCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {unverifiedCount}
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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">TPO Analytics Dashboard</h1>
                
                {analyticsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
                  </div>
                ) : (
                  <>
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Students</h3>
                        <p className="text-3xl font-bold text-blue-600">{analytics?.totalStudents || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">Registered users</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Recruiters</h3>
                        <p className="text-3xl font-bold text-green-600">{analytics?.totalRecruiters || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">Partner companies</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Applications</h3>
                        <p className="text-3xl font-bold text-purple-600">{analytics?.totalApplications || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">Student submissions</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Verified Jobs</h3>
                        <p className="text-3xl font-bold text-indigo-600">{analytics?.verifiedOpportunities || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">Active opportunities</p>
                      </div>
                      <div className="bg-white p-6 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Placement Rate</h3>
                        <p className="text-3xl font-bold text-orange-600">{analytics?.placementRate || 0}%</p>
                        <p className="text-sm text-gray-500 mt-1">Success rate</p>
                      </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                      {/* Applications by Status Pie Chart */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Applications by Status</h2>
                        {analytics.applicationsByStatus && analytics.applicationsByStatus.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={analytics.applicationsByStatus}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ status, percentage }) => `${status || 'Unknown'}: ${percentage || 0}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analytics.applicationsByStatus.map((entry, index) => {
                                  const colors = {
                                    'Pending Mentor Approval': '#f59e0b',
                                    'Approved': '#10b981',
                                    'Rejected': '#ef4444',
                                    'Withdrawn': '#6b7280',
                                    'Interview Scheduled': '#3b82f6',
                                    'Offer Extended': '#8b5cf6'
                                  }
                                  return <Cell key={`cell-${index}`} fill={colors[entry?.status] || '#8884d8'} />
                                })}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center py-8 text-gray-500">No application data available</div>
                        )}
                      </div>

                      {/* Monthly Applications Trend */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Application Trends (Last 6 Months)</h2>
                        {analytics.monthlyApplications && analytics.monthlyApplications.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.monthlyApplications}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="applications" stroke="#8b5cf6" strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="text-center py-8 text-gray-500">No trend data available</div>
                        )}
                      </div>
                    </div>

                    {/* Top Companies and Quick Actions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Top Companies */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Top Companies by Applications</h2>
                        {analytics.topCompanies && analytics.topCompanies.length > 0 ? (
                          <div className="space-y-3">
                            {analytics.topCompanies.map((company, index) => (
                              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <span className="font-medium text-gray-900">{company?.company || 'Unknown Company'}</span>
                                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                  {company?.applications || 0} applications
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">No company data available</div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                        <div className="space-y-3">
                          <button
                            onClick={() => setActiveTab('applications')}
                            className="w-full p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                          >
                            <h3 className="font-semibold text-purple-700">Track Applications</h3>
                            <p className="text-sm text-purple-600">Monitor and update application statuses</p>
                          </button>
                          <button
                            onClick={() => setActiveTab('verification')}
                            className="w-full p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                          >
                            <h3 className="font-semibold text-orange-700">
                              Verify Opportunities 
                              {(analytics?.pendingOpportunities || 0) > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                  {analytics.pendingOpportunities}
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-orange-600">Review pending job postings</p>
                          </button>
                          <button
                            onClick={() => setActiveTab('jobs')}
                            className="w-full p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                          >
                            <h3 className="font-semibold text-green-700">Post New Opportunity</h3>
                            <p className="text-sm text-green-600">Create verified job postings</p>
                          </button>
                          <button
                            onClick={() => fetchAnalytics()}
                            className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                          >
                            <h3 className="font-semibold text-blue-700">Refresh Analytics</h3>
                            <p className="text-sm text-blue-600">Update dashboard with latest data</p>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Application Tracking Center</h1>
                
                {/* Debug Section */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-yellow-800 mb-2">🐛 Debug Information</h3>
                  <div className="text-sm text-yellow-700">
                    <p>Loading: {applicationsLoading ? 'Yes' : 'No'}</p>
                    <p>Applications Count: {allApplications.length}</p>
                    <p>Session User ID: {session?.user?.id}</p>
                    <p>Profile Role: {profile?.role}</p>
                    <button 
                      onClick={fetchAllApplications}
                      className="mt-2 bg-yellow-200 hover:bg-yellow-300 px-3 py-1 rounded text-yellow-800"
                    >
                      🔄 Refresh Applications
                    </button>
                  </div>
                </div>
                
                {/* Application Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Applications</h3>
                    <p className="text-3xl font-bold text-blue-600">{allApplications.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Review</h3>
                    <p className="text-3xl font-bold text-yellow-600">
                      {allApplications.filter(app => app.status === 'Pending Mentor Approval').length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Approved</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {allApplications.filter(app => app.status === 'Approved').length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">In Progress</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {allApplications.filter(app => ['Interview Scheduled', 'Offer Extended'].includes(app.status)).length}
                    </p>
                  </div>
                </div>

                {/* Application Detail Modal */}
                {selectedApplication && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto w-full mx-4">
                      <div className="flex justify-between items-start mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
                        <button
                          onClick={() => setSelectedApplication(null)}
                          className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                          ×
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Student Information */}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Student Information</h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Name</p>
                              <p className="font-medium">{selectedApplication.student_profile?.full_name || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Email</p>
                              <p className="font-medium">{selectedApplication.student?.email}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Department</p>
                              <p className="font-medium">{selectedApplication.student_profile?.department || 'Not provided'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Graduation Year</p>
                              <p className="font-medium">{selectedApplication.student_profile?.graduation_year || 'Not provided'}</p>
                            </div>
                            {selectedApplication.student_profile?.skills && (
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedApplication.student_profile?.skills?.map((skill, index) => (
                                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Opportunity Information */}
                        <div className="bg-green-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-800 mb-3">Opportunity Details</h3>
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm text-gray-600">Position</p>
                              <p className="font-medium">{selectedApplication.opportunity?.title}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Company</p>
                              <p className="font-medium">{selectedApplication.opportunity?.company_name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Stipend/Salary</p>
                              <p className="font-medium">{selectedApplication.opportunity?.stipend_range || 'Not specified'}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Location</p>
                              <p className="font-medium">{selectedApplication.opportunity?.location || 'Not specified'}</p>
                            </div>
                            {selectedApplication.opportunity?.required_skills && (
                              <div>
                                <p className="text-sm text-gray-600 mb-2">Required Skills</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedApplication.opportunity?.required_skills?.map((skill, index) => (
                                    <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Application Timeline */}
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-gray-800 mb-3">Application Timeline</h3>
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            <span className="text-sm">
                              Applied on {new Date(selectedApplication.applied_at).toLocaleDateString()} at {new Date(selectedApplication.applied_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {selectedApplication.updated_at && selectedApplication.updated_at !== selectedApplication.applied_at && (
                            <div className="flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                              <span className="text-sm">
                                Status updated to "{selectedApplication.status}" on {new Date(selectedApplication.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        {selectedApplication.mentor_comments && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border">
                            <p className="text-sm font-medium text-blue-800 mb-1">Previous Comments:</p>
                            <p className="text-sm text-blue-700">{selectedApplication.mentor_comments}</p>
                          </div>
                        )}
                      </div>

                      {/* Status Update Actions */}
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-800 mb-3">Update Application Status</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {['Pending Mentor Approval', 'Approved', 'Rejected', 'Interview Scheduled', 'Offer Extended', 'Withdrawn'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                const comments = status === 'Rejected' ? prompt('Add rejection reason (optional):') : 
                                                status === 'Interview Scheduled' ? prompt('Add interview details (optional):') :
                                                status === 'Offer Extended' ? prompt('Add offer details (optional):') : ''
                                updateApplicationStatus(selectedApplication.id, status, comments || '')
                                setSelectedApplication(null)
                              }}
                              disabled={statusUpdateLoading[selectedApplication.id] || selectedApplication.status === status}
                              className={`px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 ${
                                selectedApplication.status === status
                                  ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                                  : status === 'Approved' || status === 'Interview Scheduled' || status === 'Offer Extended'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                    : status === 'Rejected' || status === 'Withdrawn'
                                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                      : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              }`}
                            >
                              {selectedApplication.status === status ? '✓ Current' : status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Applications List */}
                {applicationsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
                  </div>
                ) : allApplications.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Applications Yet</h3>
                    <p className="text-gray-500">Applications will appear here as students apply to opportunities.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b">
                      <h2 className="text-lg font-semibold text-gray-800">All Applications ({allApplications.length})</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opportunity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allApplications.map((application) => {
                            const statusColors = {
                              'Pending Mentor Approval': 'bg-yellow-100 text-yellow-800',
                              'Approved': 'bg-green-100 text-green-800',
                              'Rejected': 'bg-red-100 text-red-800',
                              'Withdrawn': 'bg-gray-100 text-gray-800',
                              'Interview Scheduled': 'bg-blue-100 text-blue-800',
                              'Offer Extended': 'bg-purple-100 text-purple-800'
                            }

                            return (
                              <tr key={application.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {application.student_profile?.full_name || 'Student'}
                                    </div>
                                    <div className="text-sm text-gray-500">{application.student?.email}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-gray-900">{application.opportunity?.title}</div>
                                  <div className="text-sm text-gray-500">{application.opportunity?.location}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {application.opportunity?.company_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    statusColors[application.status] || 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {application.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(application.applied_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                  <button
                                    onClick={() => setSelectedApplication(application)}
                                    className="text-purple-600 hover:text-purple-900"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Post New Opportunity</h1>
                
                <form onSubmit={handleOpportunitySubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Job Title *
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      />
                      <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opportunityForm.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-2 text-purple-600 hover:text-purple-800"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
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
                      className="px-6 py-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:opacity-50"
                    >
                      {loading ? 'Posting...' : 'Post Opportunity (Auto-Verified)'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'verification' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Opportunity Verification</h1>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">💼</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Opportunities Posted</h3>
                    <p className="text-gray-500">Job opportunities will appear here for verification.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Filter Tabs */}
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
                            {unverifiedCount}
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
                                  {opportunity.is_verified ? '✅ Verified' : '⏳ Pending'}
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
                                    <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="text-sm text-gray-500">
                                Posted by: {opportunity.poster?.email || 'Unknown'} ({opportunity.poster?.role || 'Unknown'})
                                <br />
                                Created: {new Date(opportunity.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="ml-4">
                              <button
                                onClick={() => toggleVerification(opportunity.id, opportunity.is_verified)}
                                className={`px-4 py-2 rounded-md font-medium ${
                                  opportunity.is_verified
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {opportunity.is_verified ? 'Unverify' : 'Verify'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'companies' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Company Relations</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🏢</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Manage Company Relationships</h3>
                  <p className="text-gray-500">Build and maintain relationships with recruiting companies.</p>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Management</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Manage Student Records</h3>
                  <p className="text-gray-500">Oversee student profiles, applications, and placement progress.</p>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Interview Schedule</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Coordinate Interviews</h3>
                  <p className="text-gray-500">Schedule and manage interview sessions between students and companies.</p>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Placement Reports</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Generate Comprehensive Reports</h3>
                  <p className="text-gray-500">Create detailed placement statistics and analytics.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default TpoDashboard