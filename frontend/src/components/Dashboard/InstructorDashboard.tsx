import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  BookOpenIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDate } from '../../utils/dateUtils';
import type { DashboardData } from '../../types';

const InstructorDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get<DashboardData>('/api/analytics/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = [
    {
      name: 'My Courses',
      value: dashboardData?.totalCourses || 0,
      icon: BookOpenIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      href: '/courses'
    },
    {
      name: 'Total Students',
      value: dashboardData?.totalStudents || 0,
      icon: UserGroupIcon,
      color: 'text-green-600',
      bg: 'bg-green-100'
    },
    {
      name: 'Assignments',
      value: dashboardData?.totalAssignments || 0,
      icon: DocumentTextIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      href: '/assignments'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Account Status Alert */}
      {!user?.isApproved && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Account Pending Approval:</strong> Please upload your verification documents to complete your account setup.
                <Link to="/upload-documents" className="font-medium underline ml-2">
                  Upload Documents
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, Professor {user?.lastName}!</h1>
        <p className="mt-2 text-green-100">
          Manage your courses, track student progress, and create engaging content.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/create-course"
          className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <PlusIcon className="h-8 w-8 text-blue-600" />
          <span className="ml-3 font-medium text-gray-900 dark:text-white">Create New Course</span>
        </Link>
        
        <Link
          to="/create-assignment"
          className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
        >
          <PlusIcon className="h-8 w-8 text-green-600" />
          <span className="ml-3 font-medium text-gray-900 dark:text-white">Create Assignment</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Enrollments</h2>
          {dashboardData?.recentEnrollments?.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No recent enrollments.</p>
          ) : (
            dashboardData?.recentEnrollments?.map((enrollment) => (
              <div key={enrollment._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {enrollment.student?.firstName} {enrollment.student?.lastName}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{enrollment.course?.title}</p>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(enrollment.enrollmentDate)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
