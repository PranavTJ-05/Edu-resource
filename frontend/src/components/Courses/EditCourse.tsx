import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../Common/LoadingSpinner';
import type { Course, CourseMaterial, Module } from '../../types';

import BackButton from '../Common/BackButton';

interface CourseFormData {
  title: string;
  description: string;
  courseCode: string;
  credits: number;
  maxStudents: number;
  category: string;
  level: '1st Year' | '2nd Year' | '3rd Year' | '4th Year';
  prerequisites: string[];
  isActive: boolean;
  thumbnailImage: string;
  materials: CourseMaterial[];
  modules: Module[];
}

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    courseCode: '',
    credits: 3,
    maxStudents: 30,
    // fees removed
    category: '',
    level: '1st Year',
    prerequisites: [''],
    isActive: true,
    thumbnailImage: '',
    materials: [],
    modules: []
  });



  const categories = [
    'Computer Science', 'Mathematics', 'Physics', 'Chemistry',
    'Biology', 'English', 'History', 'Arts', 'Business', 'Other'
  ];

  useEffect(() => {
    fetchCourseDetails();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get<Course>(`/api/courses/${id}`);
      const course = response.data;

      setFormData({
        title: course.title,
        description: course.description,
        courseCode: course.courseCode,
        credits: course.credits,
        maxStudents: course.maxStudents,
        // fees removed
        category: course.category || '',
        level: course.level,
        prerequisites: course.prerequisites && course.prerequisites.length > 0 ? course.prerequisites : [''],
        isActive: true,
        thumbnailImage: course.thumbnailImage || '',
        materials: course.materials || [],
        modules: course.modules || []
      });
      // Handle isActive explicitly if it's in the response but not strictly typed in frontend yet
      if ('isActive' in course) {
        setFormData(prev => ({ ...prev, isActive: (course as any).isActive }));
      }

    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handlePrerequisiteChange = (index: number, value: string) => {
    const newPrerequisites = [...formData.prerequisites];
    newPrerequisites[index] = value;
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };

  const addPrerequisite = () => {
    setFormData(prev => ({
      ...prev,
      prerequisites: [...prev.prerequisites, '']
    }));
  };

  const removePrerequisite = (index: number) => {
    const newPrerequisites = formData.prerequisites.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, prerequisites: newPrerequisites }));
  };



  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Validate file size (max 5MB for images)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      try {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('type', 'course-material'); // Reusing existing type or could be 'image' if backend supported

        const response = await axios.post('/api/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const fileUrl = response.data.url || response.data.filePath;
        setFormData(prev => ({ ...prev, thumbnailImage: fileUrl }));
        toast.success('Thumbnail uploaded successfully');
      } catch (error: any) {
        console.error('Thumbnail upload error:', error);
        toast.error(error.response?.data?.message || 'Failed to upload thumbnail');
      }
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;

    try {
      await axios.delete(`/api/courses/${id}/modules/${moduleId}`);
      toast.success('Module deleted');
      setFormData(prev => ({
        ...prev,
        modules: prev.modules.filter(m => m._id !== moduleId)
      }));
    } catch (error) {
      console.error('Delete module error:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanedData = {
        ...formData,
        ...formData,
        prerequisites: formData.prerequisites.filter(p => p.trim() !== ''),
        materials: formData.materials.map(material => ({
          title: material.title,
          type: material.type,
          url: material.url,
          filename: material.filename || '',
          description: material.description || ''
        })),
        thumbnailImage: formData.thumbnailImage
      };

      await axios.put(`/api/courses/${id}`, cleanedData);
      toast.success('Course updated successfully');
      navigate('/courses');
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Course</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Update course details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Course Thumbnail */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course Thumbnail</h2>
          <div className="mt-2">
            {!formData.thumbnailImage ? (
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-primary-500 transition-colors duration-200">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 dark:text-gray-400">
                    <label
                      htmlFor="thumbnail-upload"
                      className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="thumbnail-upload"
                        name="thumbnail-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div className="relative h-48 w-full md:w-96 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img
                    src={formData.thumbnailImage}
                    alt="Course Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
                      className="p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors duration-200"
                      title="Remove image"
                    >
                      <TrashIcon className="h-6 w-6 text-red-600" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, thumbnailImage: '' }))}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium"
                >
                  Remove Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course Code (Read Only)
              </label>
              <input
                type="text"
                value={formData.courseCode}
                disabled
                className="input bg-gray-100 dark:bg-gray-600 dark:text-gray-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level *
              </label>
              <select
                name="level"
                required
                value={formData.level}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credits *
              </label>
              <input
                type="number"
                name="credits"
                required
                min="1"
                max="10"
                value={formData.credits}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Students *
              </label>
              <input
                type="number"
                name="maxStudents"
                required
                min="1"
                value={formData.maxStudents}
                onChange={handleChange}
                className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-gray-700 dark:text-white font-medium">
                  Course is Visible to Students
                </span>
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-8">
                Uncheck this to hide the course from the public course list.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
        </div>

        {/* Course Modules */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Modules</h2>
            <button
              type="button"
              onClick={() => navigate(`/courses/${id}/add-module`)}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Module
            </button>
          </div>

          <div className="space-y-4">
            {formData.modules.map((module, index) => (
              <div key={module._id || index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">{module.title}</h3>
                  <p className="text-sm text-gray-500">{module.description}</p>
                  <span className="text-xs text-gray-400">{module.materials?.length || 0} materials</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/courses/${id}/modules/${module._id}/edit`)}
                    className="btn btn-secondary btn-sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => module._id && handleDeleteModule(module._id)}
                    className="btn btn-danger btn-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {formData.modules.length === 0 && (
              <p className="text-gray-500 text-center py-4">No modules added yet.</p>
            )}
          </div>
        </div>

        {/* Prerequisites - Simplified for Edit */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Prerequisites</h2>
            <button
              type="button"
              onClick={addPrerequisite}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add
            </button>
          </div>

          <div className="space-y-3">
            {formData.prerequisites.map((prereq, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  value={prereq}
                  onChange={(e) => handlePrerequisiteChange(index, e.target.value)}
                  className="input flex-1 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  placeholder="Enter prerequisite"
                />
                <button
                  type="button"
                  onClick={() => removePrerequisite(index)}
                  className="btn btn-danger btn-sm"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Course Materials */}


        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/courses')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCourse;
