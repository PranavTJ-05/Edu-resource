import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  BookOpenIcon, 
  DocumentTextIcon, 
  ClockIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDateTime, isValidDate } from '../../utils/dateUtils';
import type { StudentDashboardData } from '../../types';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      if (!user) return;

      const [enrollmentsRes, assignmentsRes] = await Promise.all([
        axios.get(`/api/enrollments/student/${user._id}`),
        axios.get('/api/assignments')
      ]);

      setDashboardData({
        enrollments: enrollmentsRes.data,
        assignments: assignmentsRes.data
      });
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
      name: 'Enrolled Courses',
      value: dashboardData?.enrollments?.length || 0,
      icon: BookOpenIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      href: '/my-courses'
    },
    {
      name: 'Pending Assignments',
      value: dashboardData?.assignments?.filter(a => !a.isSubmitted)?.length || 0,
      icon: DocumentTextIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      href: '/assignments'
    }
  ];

  const upcomingDeadlines = dashboardData?.assignments
    ?.filter(assignment => assignment.dueDate && isValidDate(assignment.dueDate) && new Date(assignment.dueDate) > new Date())
    ?.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    ?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-2 text-blue-100">
          Here's an overview of your academic progress and upcoming tasks.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.href}
              className="card hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center">
                <div className={`${stat.bg} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
            <Link to="/assignments" className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
              View all
            </Link>
          </div>
          
          {upcomingDeadlines.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((assignment) => (
                <div key={assignment._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{assignment.title}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{assignment.course?.title}</p>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDateTime(assignment.dueDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
