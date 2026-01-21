import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserGroupIcon,
  CheckCircleIcon,
  FunnelIcon,
  XMarkIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/dateUtils';
import type { User } from '../../types';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');
  const [pagination, setPagination] = useState<any>({});

  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [allCourses, setAllCourses] = useState<any[]>([]); // To populate dropdown
  const [selectedCourseId, setSelectedCourseId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });

      if (selectedRole) params.append('role', selectedRole);

      const response = await axios.get(`/api/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const activateUser = async (userId: string) => {
    try {
      await axios.put(`/api/users/${userId}/activate`);
      toast.success('User activated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to activate user');
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      await axios.put(`/api/users/${userId}/deactivate`);
      toast.success('User deactivated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to deactivate user');
    }
  };

  const handleEditClick = async (user: User) => {
    try {
      setLoadingDetails(true);
      setShowModal(true);
      // Fetch user profile and all courses in parallel
      const [profileRes, coursesRes] = await Promise.all([
        axios.get(`/api/users/${user._id}/profile`),
        axios.get('/api/courses')
      ]);

      setSelectedUser(profileRes.data);
      setAllCourses(coursesRes.data.courses || []);
    } catch (error) {
      toast.error('Failed to fetch details');
      setShowModal(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEnrollUser = async () => {
    if (!selectedCourseId || !selectedUser) return;
    try {
      await axios.post(`/api/users/${selectedUser._id}/enroll`, {
        courseId: selectedCourseId
      });
      toast.success('User enrolled successfully');

      // Refresh details
      const response = await axios.get(`/api/users/${selectedUser._id}/profile`);
      setSelectedUser(response.data);
      setSelectedCourseId('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enroll user');
    }
  };

  const handleUnenrollUser = async (courseId: string) => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to remove this course?')) return;

    try {
      await axios.delete(`/api/users/${selectedUser._id}/enroll/${courseId}`);
      toast.success('User unenrolled successfully');

      // Refresh details
      const response = await axios.get(`/api/users/${selectedUser._id}/profile`);
      setSelectedUser(response.data);
    } catch (error) {
      toast.error('Failed to unenroll user');
    }
  };

  const handleDeclineUser = async (userId: string) => {
    try {
      await axios.put(`/api/users/${userId}/decline`);
      toast.success('User permission declined successfully');
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to decline user permission');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'instructor': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && users.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-gray-600">
          Manage user accounts, approvals, and permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{pagination.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>

        {/* Pending Approval card removed */}

        <div className="card">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Instructors</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'instructor').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="instructor">Instructors</option>
          </select>
          <button
            onClick={() => setSelectedRole('')}
            className="btn btn-secondary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {/* Approval status badge removed */}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(user.enrollmentDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {user.isActive ? (
                      <button
                        onClick={() => deactivateUser(user._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => activateUser(user._id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleEditClick(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center space-x-2 mt-6">
            {pagination.hasPrev && (
              <button
                onClick={() => fetchUsers(pagination.current - 1)}
                className="btn btn-secondary"
              >
                Previous
              </button>
            )}

            <span className="flex items-center px-4 py-2 text-sm text-gray-600">
              Page {pagination.current} of {pagination.pages}
            </span>

            {pagination.hasNext && (
              <button
                onClick={() => fetchUsers(pagination.current + 1)}
                className="btn btn-secondary"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {
        showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" aria-hidden="true" onClick={() => setShowModal(false)}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="absolute top-0 right-0 pt-4 pr-4">
                    <button
                      type="button"
                      className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => setShowModal(false)}
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="sm:flex sm:items-start w-full">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        User Details
                      </h3>

                      {loadingDetails ? (
                        <div className="flex justify-center py-8">
                          <LoadingSpinner />
                        </div>
                      ) : selectedUser ? (
                        <div className="mt-4 space-y-6">
                          {/* User Header Info */}
                          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                            <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center text-xl font-bold text-gray-600">
                              {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900">
                                {selectedUser.firstName} {selectedUser.lastName}
                              </h4>
                              <p className="text-gray-600">{selectedUser.email}</p>
                              <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                                {selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                              </span>
                            </div>
                          </div>

                          {/* Registered Courses */}
                          <div>
                            <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
                              <AcademicCapIcon className="h-5 w-5 mr-2 text-indigo-500" />
                              Registered Courses
                            </h4>
                            {selectedUser.enrolledCourses && selectedUser.enrolledCourses.length > 0 ? (
                              <div className="space-y-3">
                                {selectedUser.enrolledCourses.map((course: any) => (
                                  <div key={course._id} className="p-3 border rounded-lg bg-white flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-gray-900">{course.title}</p>
                                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                                        <span>Enrolled: {formatDate(course.enrollmentDate)}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                                                ${course.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            course.status === 'dropped' ? 'bg-red-100 text-red-800' :
                                              'bg-blue-100 text-blue-800'}`}>
                                          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleUnenrollUser(course._id)}
                                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                                      title="Remove Course"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic">No registered courses found.</p>
                            )}
                          </div>

                          {/* Add Course Section */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Enroll in New Course</h4>
                            <div className="flex space-x-2">
                              <select
                                value={selectedCourseId}
                                onChange={(e) => setSelectedCourseId(e.target.value)}
                                className="input flex-1 text-sm"
                              >
                                <option value="">Select a course...</option>
                                {allCourses
                                  .filter(course => !selectedUser.enrolledCourses?.some((e: any) => e._id === course._id))
                                  .map((course: any) => (
                                    <option key={course._id} value={course._id}>
                                      {course.title}
                                    </option>
                                  ))
                                }
                              </select>
                              <button
                                onClick={handleEnrollUser}
                                disabled={!selectedCourseId}
                                className="btn btn-primary text-sm px-3 py-1"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => selectedUser && handleDeclineUser(selectedUser._id)}
                  >
                    Decline Permission
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default UserManagement;
