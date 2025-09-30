import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import HomePage from './components/HomePage'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import Dashboard from './components/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
    
    // You could send this to an error reporting service
    // errorReportingService.captureException(error, { extra: errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                The application encountered an unexpected error. Please try refreshing the page.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  🔄 Refresh Page
                </button>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  🔄 Try Again
                </button>
                <a
                  href="/"
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-md transition-colors inline-block text-center"
                >
                  🏠 Go Home
                </a>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    Show Error Details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-50 p-3 rounded border overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connectionError, setConnectionError] = useState(false)

  useEffect(() => {
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason)
      
      // Check if it's a network/Supabase connection error
      if (event.reason?.message?.includes('fetch') || 
          event.reason?.message?.includes('network') ||
          event.reason?.message?.includes('supabase')) {
        setConnectionError(true)
        setTimeout(() => setConnectionError(false), 5000) // Clear after 5 seconds
      }
    }

    // Global error handler for uncaught errors
    const handleError = (event) => {
      console.error('Uncaught error:', event.error)
    }

    // Keyboard shortcuts for app-level actions
    const handleKeyboard = (event) => {
      // Ctrl+Shift+R for hard refresh
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault()
        window.location.reload(true)
      }
      
      // F5 for normal refresh
      if (event.key === 'F5') {
        event.preventDefault()
        window.location.reload()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    document.addEventListener('keydown', handleKeyboard)

    // Get initial session with error handling
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Error getting session:', error)
          setConnectionError(true)
        } else {
          setSession(session)
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setConnectionError(true)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes with error handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      setConnectionError(false) // Clear connection error on successful auth change
    })

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
      document.removeEventListener('keydown', handleKeyboard)
      subscription.unsubscribe()
    }
  }, [])

  // Connection Error Banner
  const ConnectionErrorBanner = () => (
    <div className="bg-red-600 text-white text-center py-2 text-sm relative z-50">
      <span className="mr-2">⚠️</span>
      Connection error. Please check your internet connection and try again.
      <button
        onClick={() => window.location.reload()}
        className="ml-4 underline hover:no-underline"
      >
        Retry
      </button>
    </div>
  )

  // Enhanced Loading Screen
  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-700">Loading Placement OS...</h2>
        <p className="mt-2 text-gray-500">Please wait while we initialize your session</p>
        
        {/* Show retry option if loading takes too long */}
        <div className="mt-6">
          <button
            onClick={() => window.location.reload()}
            className="text-blue-500 hover:text-blue-600 text-sm underline"
          >
            Taking too long? Click to retry
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <ErrorBoundary>
        {connectionError && <ConnectionErrorBanner />}
        <LoadingScreen />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {connectionError && <ConnectionErrorBanner />}
          
          <Routes>
            <Route path="/" element={<HomePage session={session} />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute session={session}>
                  <Dashboard session={session} />
                </ProtectedRoute>
              } 
            />
            {/* Catch-all route for 404 errors */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-300">404</h1>
                    <h2 className="mt-4 text-2xl font-semibold text-gray-700">Page Not Found</h2>
                    <p className="mt-2 text-gray-500">The page you're looking for doesn't exist.</p>
                    <div className="mt-6 space-x-4">
                      <a
                        href="/"
                        className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        🏠 Go Home
                      </a>
                      <button
                        onClick={() => window.history.back()}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
                      >
                        ← Go Back
                      </button>
                    </div>
                  </div>
                </div>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App