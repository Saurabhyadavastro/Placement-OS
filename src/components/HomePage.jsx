import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

function HomePage({ session }) {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Placement OS</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <Link
                    to="/dashboard"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-8">Welcome to Placement OS</h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            A comprehensive placement management system connecting Students, Faculty, TPO, and Recruiters.
          </p>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto mt-12">
            <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-4">Students</h3>
              <p>Apply for jobs, track applications, and manage your placement journey.</p>
            </div>
            <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-4">Faculty</h3>
              <p>Monitor student progress and provide guidance throughout the placement process.</p>
            </div>
            <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-4">TPO</h3>
              <p>Coordinate placements, manage schedules, and oversee the entire process.</p>
            </div>
            <div className="bg-white bg-opacity-10 p-6 rounded-lg backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-4">Recruiters</h3>
              <p>Post job openings, review applications, and find the best candidates.</p>
            </div>
          </div>

          {!session && (
            <div className="mt-12">
              <Link
                to="/register"
                className="bg-white text-blue-600 font-bold py-4 px-8 rounded-lg text-xl hover:bg-gray-100 transition duration-300"
              >
                Get Started Today
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HomePage