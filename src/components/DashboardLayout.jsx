import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function DashboardLayout({ children, session, profile, title }) {
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Click outside to close user menu
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu-container')) {
        setShowUserMenu(false)
      }
    }

    // Keyboard shortcuts
    const handleKeyboard = (event) => {
      // Alt + H for home
      if (event.altKey && event.key === 'h') {
        event.preventDefault()
        navigate('/')
      }
      // Alt + D for dashboard
      if (event.altKey && event.key === 'd') {
        event.preventDefault()
        window.location.reload()
      }
      // Escape to close menus
      if (event.key === 'Escape') {
        setShowUserMenu(false)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeyboard)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeyboard)
    }
  }, [navigate])

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      try {
        await supabase.auth.signOut()
        navigate('/login')
      } catch (error) {
        console.error('Error signing out:', error)
        alert('Error signing out. Please try again.')
      }
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      'Student': 'text-blue-600 bg-blue-100',
      'Faculty': 'text-green-600 bg-green-100',
      'TPO': 'text-purple-600 bg-purple-100',
      'Recruiter': 'text-orange-600 bg-orange-100'
    }
    return colors[role] || 'text-gray-600 bg-gray-100'
  }

  const getRoleIcon = (role) => {
    const icons = {
      'Student': '🎓',
      'Faculty': '👨‍🏫',
      'TPO': '📋',
      'Recruiter': '🏢'
    }
    return icons[role] || '👤'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="bg-red-600 text-white text-center py-2 text-sm">
          <span className="mr-2">🔴</span>
          No internet connection. Some features may not work properly.
        </div>
      )}

      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Left side - Logo and Title */}
            <div className="flex items-center">
              <Link 
                to="/" 
                className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors"
                title="Go to Home (Alt+H)"
              >
                🎯 Placement OS
              </Link>
              {title && (
                <>
                  <span className="mx-3 text-gray-400">|</span>
                  <span className="text-lg text-gray-600 font-medium">
                    {title}
                  </span>
                </>
              )}
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center space-x-4">
              {/* Online Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-sm text-gray-500 hidden sm:block">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* User Menu */}
              <div className="user-menu-container relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="User Menu"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">
                      {session.user.email}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${getRoleColor(profile?.role)}`}>
                      {getRoleIcon(profile?.role)} {profile?.role || 'Unknown'}
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {session.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-lg font-medium text-gray-600">
                            {session.user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{session.user.email}</div>
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${getRoleColor(profile?.role)}`}>
                            {getRoleIcon(profile?.role)} {profile?.role || 'Unknown Role'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          window.location.reload()
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>🔄</span>
                        <span>Refresh Dashboard</span>
                        <span className="ml-auto text-xs text-gray-400">Alt+D</span>
                      </button>
                      
                      <Link
                        to="/"
                        onClick={() => setShowUserMenu(false)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <span>🏠</span>
                        <span>Home</span>
                        <span className="ml-auto text-xs text-gray-400">Alt+H</span>
                      </Link>

                      <div className="border-t border-gray-200 my-2"></div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          handleSignOut()
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                        <span className="ml-auto text-xs text-gray-400">F10</span>
                      </button>
                    </div>

                    {/* Keyboard Shortcuts Help */}
                    <div className="border-t border-gray-200 px-4 py-2">
                      <div className="text-xs text-gray-500">
                        <div className="font-medium mb-1">Keyboard Shortcuts:</div>
                        <div>Alt+H: Home | Alt+D: Refresh | F10: Sign Out</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Sign Out Button (for mobile) */}
              <button
                onClick={handleSignOut}
                className="sm:hidden bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-3 rounded-md transition-colors"
                title="Sign Out"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer with additional info */}
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              <span>Placement OS</span>
              <span className="mx-2">•</span>
              <span>Logged in as {profile?.role}</span>
              {!isOnline && (
                <>
                  <span className="mx-2">•</span>
                  <span className="text-red-600">Offline Mode</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span>Session: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default DashboardLayout