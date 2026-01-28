import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  PlusIcon,
  BookOpenIcon,
  UserIcon,
  CalendarIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Course, Pagination } from '../../types';

interface CourseListResponse {
  courses: Course[];
  pagination: Pagination;
}

const CourseList = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm] = useState('');
  const [selectedCategory] = useState('');
  const [selectedLevel] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);



  useEffect(() => {
    fetchCourses();
    if (user?.role === 'student') {
      fetchEnrollments();
    }
  }, [searchTerm, selectedCategory, selectedLevel, user]); // Added user to dependency

  const fetchEnrollments = async () => {
    try {
      if (!user?._id) return;
      const response = await axios.get(`/api/enrollments/student/${user._id}`);
      console.log('Raw enrollments response:', response.data);
      const enrolledIds = response.data
        .filter((enrollment: any) => {
          console.log(`Enrollment for ${enrollment.course?._id}: ${enrollment.status}`);
          return enrollment.status === 'enrolled' || enrollment.status === 'active';
        })
        .map((enrollment: any) => enrollment.course._id);
      setEnrolledCourseIds(enrolledIds);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchCourses = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedLevel) params.append('level', selectedLevel);

      console.log('Fetching courses with params:', params.toString()); // Debug log

      const response = await axios.get<CourseListResponse | Course[]>(`/api/courses?${params}`);
      console.log('Courses response:', response.data); // Debug log

      if (Array.isArray(response.data)) {
        setCourses(response.data);
      } else {
        setCourses(response.data.courses);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      console.log('Attempting to enroll in course:', courseId); // Debug log
      const response = await axios.post('/api/enrollments', { courseId });
      console.log('Enrollment response:', response.data); // Debug log
      toast.success('Successfully enrolled in course!');
      toast.success('Successfully enrolled in course!');
      fetchCourses(); // Refresh to update enrollment status
      fetchEnrollments(); // Refresh enrolled courses list
    } catch (error: any) {
      console.error('Enrollment error:', error); // Debug log
      const message = error.response?.data?.message || 'Failed to enroll';
      toast.error(message);
    }
  };

  const handleApproveCourse = async (courseId: string) => {
    try {
      await axios.put(`/api/courses/${courseId}/approve`);
      toast.success('Course approved successfully!');
      fetchCourses(); // Refresh courses
    } catch (error) {
      toast.error('Failed to approve course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      await axios.delete(`/api/courses/${courseId}`);
      toast.success('Course deleted successfully');
      fetchCourses();
    } catch (error) {
      console.error('Delete course error:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleToggleVisibility = async (courseId: string, currentStatus: boolean) => {
    try {
      await axios.put(`/api/courses/${courseId}`, { isActive: !currentStatus });
      toast.success(`Course ${!currentStatus ? 'visible' : 'hidden'} successfully`);
      fetchCourses();
    } catch (error) {
      console.error('Visibility toggle error:', error);
      toast.error('Failed to update course visibility');
    }
  };



  if (loading && courses.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Discover and enroll in courses that match your interests
          </p>
        </div>

        {user?.role === 'instructor' && ( // Removed admin from create course button
          <Link
            to="/create-course"
            className="mt-4 sm:mt-0 btn btn-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Course
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      {/* <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 dark:text-white dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input dark:text-white dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="input dark:text-white dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">All Levels</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>

          <button
            onClick={clearFilters}
            className="btn btn-secondary flex items-center justify-center"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Clear Filters
          </button>
        </div>
      </div> */}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No courses found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course._id} className={`card hover:shadow-md transition-shadow duration-200 ${course.isActive === false ? 'opacity-75 bg-gray-50 dark:bg-gray-800/50' : ''}`}>
              {/* Course Image */}
              <div className="h-48 rounded-lg mb-4 overflow-hidden relative">
                {course.thumbnailImage ? (
                  <img
                    src={course.thumbnailImage}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <BookOpenIcon className="h-16 w-16 text-white" />
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{course.courseCode}</p>
                  {!course.isApproved && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1 mr-2">
                      Pending Approval
                    </span>
                  )}
                  {course.isActive === false && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 mt-1">
                      <EyeSlashIcon className="w-3 h-3 mr-1" />
                      Hidden from Students
                    </span>
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3">
                  {course.description}
                </p>

                {/* Course Details */}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    {course.instructor?.firstName} {course.instructor?.lastName}
                  </div>

                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {course.credits} credits • {course.level}
                  </div>
                </div>

                {/* Enrollment Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {course.currentEnrollment}/{course.maxStudents} enrolled
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${course.level === '1st Year' ? 'bg-green-100 text-green-800' :
                    course.level === '2nd Year' ? 'bg-blue-100 text-blue-800' :
                      course.level === '3rd Year' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {course.level}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4">
                  <Link
                    to={`/courses/${course._id}`}
                    className="flex-1 btn btn-secondary text-center flex items-center justify-center"
                  >
                    View Details
                  </Link>

                  {user?.role === 'student' && course.isApproved && (
                    <>
                      {enrolledCourseIds.includes(course._id) ? (
                        // If enrolled, View Details is already shown above, so we don't need another button.
                        // But the user requested "view details enroll should go and then the view -> only should appear".
                        // Currently "View Details" is separate at line 265.
                        // Let's hide the Enroll button if enrolled.
                        null
                      ) : (
                        <button
                          onClick={() => handleEnroll(course._id)}
                          disabled={course.currentEnrollment >= course.maxStudents}
                          className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {course.currentEnrollment >= course.maxStudents ? 'Full' : 'Enroll'}
                        </button>
                      )}
                    </>
                  )}

                  {user?.role === 'student' && !course.isApproved && (
                    <button
                      disabled
                      className="flex-1 btn btn-secondary opacity-50 cursor-not-allowed"
                    >
                      Pending Approval
                    </button>
                  )}

                  {user?.role === 'admin' && !course.isApproved && (
                    <button
                      onClick={() => handleApproveCourse(course._id)}
                      className="flex-1 btn btn-primary"
                    >
                      Approve Course
                    </button>
                  )}
                </div>

                {/* Instructor Actions */}
                {user?.role === 'instructor' && user._id === course.instructor?._id && (
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <button
                      onClick={() => handleToggleVisibility(course._id, course.isActive ?? true)}
                      className="p-2 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                      title={course.isActive ?? true ? "Hide from students" : "Show to students"}
                    >
                      {course.isActive ?? true ? (
                        <EyeIcon className="h-5 w-5" />
                      ) : (
                        <EyeSlashIcon className="h-5 w-5" />
                      )}
                    </button>
                    <Link
                      to={`/courses/edit/${course._id}`}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                      title="Edit Course"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
                          handleDeleteCourse(course._id);
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      title="Delete Course"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          {pagination.hasPrev && (
            <button
              onClick={() => fetchCourses(pagination.current - 1)}
              className="btn btn-secondary"
            >
              Previous
            </button>
          )}

          <span className="flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
            Page {pagination.current} of {pagination.pages}
          </span>

          {pagination.hasNext && (
            <button
              onClick={() => fetchCourses(pagination.current + 1)}
              className="btn btn-secondary"
            >
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CourseList;
