import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import StudentDashboard from './dashboards/StudentDashboard'
import FacultyDashboard from './dashboards/FacultyDashboard'
import TpoDashboard from './dashboards/TpoDashboard'
import RecruiterDashboard from './dashboards/RecruiterDashboard'

function Dashboard({ session }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    async function getProfile() {
      try {
        setLoading(true)
        setError(null)

        if (!session?.user?.id) {
          navigate('/login')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          setError('Failed to load profile. Please try again.')
        } else if (!data) {
          setError('Profile not found. Please contact support.')
        } else {
          setProfile(data)
        }
      } catch (error) {
        console.error('Error:', error)
        setError('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }

    getProfile()

    // Add event listeners for keyboard shortcuts
    const handleKeyDown = (event) => {
      // Ctrl+Shift+D to go to dashboard
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        window.location.reload()
      }
      // Escape to sign out (with confirmation)
      if (event.key === 'F10') {
        if (confirm('Are you sure you want to sign out?')) {
          supabase.auth.signOut()
        }
      }
    }

    // Add online/offline status listeners
    const handleOnline = () => {
      console.log('Connection restored')
      // Could show a notification here
    }

    const handleOffline = () => {
      console.log('Connection lost')
      // Could show a notification here
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [session, navigate])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading your dashboard...</h2>
          <p className="text-gray-500 mt-2">Please wait while we prepare your workspace</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Route to role-specific dashboard with proper error handling
  const renderRoleDashboard = () => {
    if (!profile?.role) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-yellow-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Role Not Assigned</h2>
            <p className="text-gray-600 mb-6">Your account doesn't have a role assigned. Please contact the administrator.</p>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      )
    }

    try {
      switch (profile.role) {
        case 'Student':
          return <StudentDashboard session={session} profile={profile} />
        case 'Faculty':
          return <FacultyDashboard session={session} profile={profile} />
        case 'TPO':
          return <TpoDashboard session={session} profile={profile} />
        case 'Recruiter':
          return <RecruiterDashboard session={session} profile={profile} />
        default:
          return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md mx-auto">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-600 text-2xl">❓</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Unknown Role</h2>
                <p className="text-gray-600 mb-2">Role: <span className="font-mono">{profile.role}</span></p>
                <p className="text-gray-600 mb-6">This role is not recognized by the system. Please contact support.</p>
                <div className="space-x-4">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )
      }
    } catch (dashboardError) {
      console.error('Dashboard rendering error:', dashboardError)
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto">
            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">💥</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
            <p className="text-gray-600 mb-6">There was an error loading your dashboard. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="dashboard-container">
      {/* Hidden accessibility info */}
      <div className="sr-only">
        <h1>Placement OS - {profile?.role} Dashboard</h1>
        <p>Press F10 to sign out, Ctrl+Shift+D to refresh dashboard</p>
      </div>
      
      {renderRoleDashboard()}
    </div>
  )
}

export default Dashboard