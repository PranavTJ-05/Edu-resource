import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import {
  BookOpenIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DocumentIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import CourseContentViewer from './CourseContentViewer';
import toast from 'react-hot-toast';
import type { Course } from '../../types';
import BackButton from '../Common/BackButton';

const CourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    if (user?.role === 'student') {
      checkEnrollmentStatus();
    }
  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get<Course>(`/api/courses/${id}`);
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Course not found');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollmentStatus = async () => {
    if (!user) return;
    try {
      const response = await axios.get<any[]>(`/api/enrollments/student/${user._id}`);
      const enrolled = response.data.some((enrollment: any) =>
        enrollment.course._id === id && enrollment.status === 'enrolled'
      );
      setIsEnrolled(enrolled);
    } catch (error) {
      console.error('Error checking enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    try {
      setEnrollmentLoading(true);
      console.log('Enrolling in course:', id); // Debug log
      const response = await axios.post('/api/enrollments', { courseId: id });
      console.log('Enrollment response:', response.data); // Debug log
      setIsEnrolled(true);
      toast.success('Successfully enrolled in course!');
      fetchCourseDetails(); // Refresh to update enrollment count
    } catch (error: any) {
      console.error('Enrollment error:', error); // Debug log
      const message = error.response?.data?.message || 'Failed to enroll';
      toast.error(message);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleUnenroll = async () => {
    if (!user) return;
    try {
      // Find enrollment ID and delete
      const enrollments = await axios.get<any[]>(`/api/enrollments/student/${user._id}`);
      const enrollment = enrollments.data.find((e: any) => e.course._id === id);

      if (enrollment) {
        await axios.delete(`/api/enrollments/${enrollment._id}`);
        setIsEnrolled(false);
        toast.success('Successfully unenrolled from course');
        fetchCourseDetails();
      }
    } catch (error) {
      toast.error('Failed to unenroll from course');
    }
  };

  const handleApproveCourse = async () => {
    try {
      await axios.put(`/api/courses/${id}/approve`);
      toast.success('Course approved successfully!');
      fetchCourseDetails(); // Refresh course data
    } catch (error) {
      toast.error('Failed to approve course');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Course not found</h2>
      </div>
    );
  }

  const canEdit = user?.role === 'instructor' && course.instructor?._id === user._id; // Removed admin from edit permissions
  const canApprove = user?.role === 'admin'; // Separate permission for approval

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Course Header */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              <BackButton />
              <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpenIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
                <p className="text-lg text-gray-600">{course.courseCode}</p>
              </div>
            </div>

            <p className="text-gray-700 mb-6">{course.description}</p>

            {/* Course Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center text-gray-600">
                <UserIcon className="h-5 w-5 mr-3" />
                <span>Instructor: {course.instructor ? `${course.instructor.firstName} ${course.instructor.lastName}` : 'Unknown'}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <CalendarIcon className="h-5 w-5 mr-3" />
                <span>{course.credits} Credits • {course.level}</span>
              </div>

              <div className="flex items-center text-gray-600">
                <ClockIcon className="h-5 w-5 mr-3" />
                <span>{course.currentEnrollment}/{course.maxStudents} enrolled</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 lg:mt-0 lg:ml-6 flex flex-col space-y-3">
            {canEdit && (
              <>
                <button
                  onClick={() => navigate(`/courses/edit/${id}`)}
                  className="btn btn-secondary flex items-center justify-center"
                >
                  <PencilIcon className="h-5 w-5 mr-2" />
                  Edit Course
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => navigate(`/courses/${id}/add-module`)}
                    className="btn btn-primary flex items-center justify-center text-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Module
                  </button>
                  <button
                    onClick={() => navigate(`/courses/${id}/materials`)}
                    className="btn btn-secondary flex items-center justify-center text-sm"
                  >
                    <DocumentIcon className="h-4 w-4 mr-2" />
                    Manage Materials
                  </button>
                </div>
              </>
            )}

            {canApprove && !course.isApproved && (
              <button
                onClick={handleApproveCourse}
                className="btn btn-primary flex items-center justify-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Approve Course
              </button>
            )}

            {canApprove && (
              <button
                className="btn btn-danger flex items-center justify-center"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Deactivate Course
              </button>
            )}

            {user?.role === 'student' && (
              <>
                {!isEnrolled ? (
                  <button
                    onClick={handleEnroll}
                    disabled={enrollmentLoading || course.currentEnrollment >= course.maxStudents || !course.isApproved}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {enrollmentLoading ? 'Enrolling...' :
                      !course.isApproved ? 'Pending Approval' :
                        course.currentEnrollment >= course.maxStudents ? 'Course Full' : 'Enroll Now'}
                  </button>
                ) : (
                  <button
                    onClick={handleUnenroll}
                    className="btn btn-danger"
                  >
                    Unenroll
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Course Materials - Now visible to all users */}
      <CourseContentViewer
        materials={course.materials || []}
        modules={course.modules || []}
        isEnrolled={isEnrolled}
        canEdit={!!canEdit}
        courseId={course._id || id || ''}
      />

      {/* Prerequisites */}
      {course.prerequisites && course.prerequisites.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Prerequisites</h2>
          <ul className="list-disc list-inside space-y-1">
            {course.prerequisites.map((prereq, index) => (
              <li key={index} className="text-gray-700">{prereq}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
