import { useState, useEffect } from 'react'
import { supabase } from '../../supabase'
import DashboardLayout from '../DashboardLayout'

function FacultyDashboard({ session, profile }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [pendingApplications, setPendingApplications] = useState([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState({})

  // Fetch pending applications
  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPendingApplications()
    }
  }, [activeTab])

  const fetchPendingApplications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          student:profiles!applications_student_id_fkey(id, email),
          student_profile:student_profiles!applications_student_id_fkey(full_name, department, graduation_year, skills),
          opportunity:opportunities!applications_opportunity_id_fkey(
            id, title, company_name, stipend_range, location, required_skills, description, deadline
          )
        `)
        .eq('status', 'Pending Mentor Approval')
        .order('applied_at', { ascending: false })

      if (error) {
        console.error('Error fetching applications:', error)
      } else {
        setPendingApplications(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationAction = async (applicationId, newStatus, comments = '') => {
    try {
      setProcessing(prev => ({ ...prev, [applicationId]: true }))

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
        alert('Error updating application status. Please try again.')
      } else {
        alert(`Application ${newStatus.toLowerCase()} successfully!`)
        // Refresh the applications list
        fetchPendingApplications()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error updating application status. Please try again.')
    } finally {
      setProcessing(prev => ({ ...prev, [applicationId]: false }))
    }
  }

  const calculateSkillMatch = (studentSkills, requiredSkills) => {
    if (!studentSkills || !requiredSkills || requiredSkills.length === 0) {
      return { matchCount: 0, matchPercentage: 0, matchingSkills: [] }
    }

    const matchingSkills = requiredSkills.filter(reqSkill =>
      studentSkills.some(studentSkill =>
        studentSkill.toLowerCase() === reqSkill.toLowerCase()
      )
    )

    return {
      matchCount: matchingSkills.length,
      matchPercentage: Math.round((matchingSkills.length / requiredSkills.length) * 100),
      matchingSkills
    }
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'approvals', label: 'Application Approvals', icon: '✅' },
    { id: 'students', label: 'My Students', icon: '👥' },
    { id: 'progress', label: 'Progress Tracking', icon: '📈' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'guidance', label: 'Guidance', icon: '🎯' }
  ]

  return (
    <DashboardLayout session={session} profile={profile} title="Faculty Dashboard">
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Faculty Portal</h2>
            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-green-100 text-green-700 border-r-4 border-green-500'
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
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Faculty Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Students</h3>
                    <p className="text-3xl font-bold text-blue-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Placed Students</h3>
                    <p className="text-3xl font-bold text-green-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Active Applications</h3>
                    <p className="text-3xl font-bold text-purple-600">0</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Placement Rate</h3>
                    <p className="text-3xl font-bold text-orange-600">0%</p>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h2>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <p className="text-gray-500">No recent activities to display</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'approvals' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Application Approvals</h1>
                
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Applications</h3>
                    <p className="text-3xl font-bold text-yellow-600">{pendingApplications.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">High Match Applications</h3>
                    <p className="text-3xl font-bold text-green-600">
                      {pendingApplications.filter(app => {
                        const match = calculateSkillMatch(app.student_profile?.skills, app.opportunity?.required_skills)
                        return match.matchPercentage >= 70
                      }).length}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Urgent Reviews</h3>
                    <p className="text-3xl font-bold text-red-600">
                      {pendingApplications.filter(app => {
                        const deadline = new Date(app.opportunity?.deadline)
                        const today = new Date()
                        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
                        return daysLeft <= 3 && daysLeft > 0
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Applications List */}
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
                  </div>
                ) : pendingApplications.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <span className="text-2xl">✅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Pending Applications</h3>
                    <p className="text-gray-500">All applications have been reviewed. New applications will appear here when students apply for opportunities.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingApplications.map((application) => {
                      const skillMatch = calculateSkillMatch(
                        application.student_profile?.skills,
                        application.opportunity?.required_skills
                      )
                      const deadline = new Date(application.opportunity?.deadline)
                      const today = new Date()
                      const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
                      const isUrgent = daysLeft <= 3 && daysLeft > 0

                      return (
                        <div key={application.id} className={`bg-white rounded-lg shadow p-6 ${isUrgent ? 'border-l-4 border-red-500' : ''}`}>
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                  {application.opportunity?.title}
                                </h3>
                                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                                  Pending Review
                                </span>
                                {skillMatch.matchPercentage >= 70 && (
                                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                    {skillMatch.matchPercentage}% Match
                                  </span>
                                )}
                                {isUrgent && (
                                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ⚠️ Urgent ({daysLeft} days left)
                                  </span>
                                )}
                              </div>
                              <p className="text-lg text-gray-700 mb-1">{application.opportunity?.company_name}</p>
                              <p className="text-sm text-gray-500">
                                Applied: {new Date(application.applied_at).toLocaleDateString()} at {new Date(application.applied_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>

                          {/* Student Information */}
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Student Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Name</p>
                                <p className="font-medium">{application.student_profile?.full_name || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Email</p>
                                <p className="font-medium">{application.student?.email}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Department</p>
                                <p className="font-medium">{application.student_profile?.department || 'Not provided'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Graduation Year</p>
                                <p className="font-medium">{application.student_profile?.graduation_year || 'Not provided'}</p>
                              </div>
                            </div>
                            
                            {/* Skills Comparison */}
                            {application.student_profile?.skills && application.opportunity?.required_skills && (
                              <div className="mt-4">
                                <p className="text-sm text-gray-600 mb-2">Skills Assessment</p>
                                <div className="space-y-2">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Student Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {application.student_profile.skills.map((skill, index) => (
                                        <span
                                          key={index}
                                          className={`px-2 py-1 rounded text-xs ${
                                            skillMatch.matchingSkills.includes(skill)
                                              ? 'bg-green-100 text-green-800 font-medium'
                                              : 'bg-blue-100 text-blue-800'
                                          }`}
                                        >
                                          {skillMatch.matchingSkills.includes(skill) && '✓ '}{skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Required Skills:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {application.opportunity.required_skills.map((skill, index) => (
                                        <span
                                          key={index}
                                          className={`px-2 py-1 rounded text-xs ${
                                            skillMatch.matchingSkills.includes(skill)
                                              ? 'bg-green-100 text-green-800 font-medium'
                                              : 'bg-gray-100 text-gray-800'
                                          }`}
                                        >
                                          {skillMatch.matchingSkills.includes(skill) && '✓ '}{skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-gray-700">
                                    Match Score: {skillMatch.matchCount}/{application.opportunity.required_skills.length} skills ({skillMatch.matchPercentage}%)
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Opportunity Details */}
                          <div className="bg-blue-50 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-800 mb-3">Opportunity Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Stipend Range</p>
                                <p className="font-medium">{application.opportunity?.stipend_range || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Location</p>
                                <p className="font-medium">{application.opportunity?.location || 'Not specified'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 mb-1">Application Deadline</p>
                                <p className="font-medium">
                                  {application.opportunity?.deadline 
                                    ? new Date(application.opportunity.deadline).toLocaleDateString()
                                    : 'Not specified'
                                  }
                                </p>
                              </div>
                            </div>
                            {application.opportunity?.description && (
                              <div className="mt-3">
                                <p className="text-sm text-gray-600 mb-1">Description</p>
                                <p className="text-sm">{application.opportunity.description}</p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex space-x-4">
                            <button
                              onClick={() => handleApplicationAction(application.id, 'Approved')}
                              disabled={processing[application.id]}
                              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {processing[application.id] ? 'Processing...' : '✅ Approve Application'}
                            </button>
                            <button
                              onClick={() => {
                                const comments = prompt('Optional: Add comments for rejection (visible to student):')
                                handleApplicationAction(application.id, 'Rejected', comments || '')
                              }}
                              disabled={processing[application.id]}
                              className="flex-1 bg-red-500 text-white px-6 py-3 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {processing[application.id] ? 'Processing...' : '❌ Reject Application'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">My Students</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Students Assigned</h3>
                  <p className="text-gray-500">Student assignments will appear here once configured by the TPO.</p>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Progress Tracking</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">📈</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Progress Monitoring</h3>
                  <p className="text-gray-500">Track student placement progress and provide guidance.</p>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Reports</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Generate Reports</h3>
                  <p className="text-gray-500">Create detailed placement reports and analytics.</p>
                </div>
              </div>
            )}

            {activeTab === 'guidance' && (
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Student Guidance</h1>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Guidance Center</h3>
                  <p className="text-gray-500">Provide career guidance and mentorship to students.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default FacultyDashboard