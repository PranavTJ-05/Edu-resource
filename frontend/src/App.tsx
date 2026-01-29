import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layout Components
import Layout from './components/Layout/Layout';
import PublicLayout from './components/Layout/PublicLayout';

// Auth Components
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';

// Dashboard Components
import StudentDashboard from './components/Dashboard/StudentDashboard';
import InstructorDashboard from './components/Dashboard/InstructorDashboard';

// Feature Components
import CourseList from './components/Courses/CourseList';
import CourseDetail from './components/Courses/CourseDetail';
import CourseMaterials from './components/Courses/CourseMaterials';
import CreateCourse from './components/Courses/CreateCourse';
import AddModule from './components/Courses/AddModule';
import EditCourse from './components/Courses/EditCourse';
import ManageModules from './components/Courses/ManageModules';
import ModulePreview from './components/Courses/ModulePreview';

import MyEnrollments from './components/Enrollments/MyEnrollments';
import AssignmentList from './components/Assignments/AssignmentList';
import AssignmentDetail from './components/Assignments/AssignmentDetail';
import CreateAssignment from './components/Assignments/CreateAssignment';
import AssignmentSubmissions from './components/Assignments/AssignmentSubmissions';

import Messages from './components/Messages/Messages';
import Profile from './components/Profile/Profile';
import UserManagement from './components/Admin/UserManagement';
import HomePage from './components/Home/HomePage';

// Loading Component
import LoadingSpinner from './components/Common/LoadingSpinner';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
  }

  const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />; // Redirect to root (Dashboard)
    }

    return <>{children}</>;
  };

  // Semi-Protected Route (Allows public access but handles auth if present)
  // Actually, for the new public dashboard, we can just use the Layout directly
  // and components check auth state internally.

  interface PublicRouteProps {
    children: React.ReactNode;
  }

  const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
    // Prevent update loop: only redirect if not loading and user exists
    if (!loading && user) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  const getDashboard = () => {
    if (!user) {
      return <CourseList />; // Public view is Course List
    }
    switch (user.role) {
      case 'student':
        return <StudentDashboard />;
      case 'instructor':
        return <InstructorDashboard />;
      default:
        return <CourseList />;
    }
  };

  return (
    <Router>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Routes>
            {/* Public Routes */}
            <Route path="/home" element={<HomePage />} /> {/* Moved to /home */}
            <Route path="/" element={ // Root is now Dashboard/CourseList (Publicly accessible)
              <Layout>
                {getDashboard()}
              </Layout>
            } />

            <Route path="/login" element={
              <PublicRoute>
                <PublicLayout>
                  <Login />
                </PublicLayout>
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <PublicLayout>
                  <Register />
                </PublicLayout>
              </PublicRoute>
            } />


            <Route path="/courses" element={
              <Layout>
                <CourseList />
              </Layout>
            } />

            <Route path="/courses/:id" element={
              <Layout>
                <CourseDetail />
              </Layout>
            } />

            <Route path="/courses/:id/materials" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <CourseMaterials />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/courses/:id/modules" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <ManageModules />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/courses/:id/modules/:moduleId" element={
              <Layout>
                <ModulePreview />
              </Layout>
            } />




            <Route path="/courses/edit/:id" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <EditCourse />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/create-course" element={
              <ProtectedRoute allowedRoles={['instructor']}> {/* Removed admin */}
                <Layout>
                  <CreateCourse />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/courses/:id/add-module" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <AddModule />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/courses/:id/modules/:moduleId/edit" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <AddModule />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/my-courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Layout>
                  <MyEnrollments />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/assignments" element={
              <ProtectedRoute>
                <Layout>
                  <AssignmentList />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/assignments/:id" element={
              <ProtectedRoute>
                <Layout>
                  <AssignmentDetail />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/assignments/:id/submissions" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <AssignmentSubmissions />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/create-assignment" element={
              <ProtectedRoute allowedRoles={['instructor']}> {/* Removed admin */}
                <Layout>
                  <CreateAssignment />
                </Layout>
              </ProtectedRoute>
            } />



            <Route path="/messages" element={
              <ProtectedRoute>
                <Layout>
                  <Messages />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['instructor']}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Default Route
            <Route path="/" element={
              user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            } /> */}

            {/* 404 Route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900">404</h1>
                  <p className="text-gray-600 mt-2">Page not found</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;
