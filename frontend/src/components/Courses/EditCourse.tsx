import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  CloudArrowUpIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../Common/LoadingSpinner';
import type { Course, CourseMaterial, Module } from '../../types';

interface CourseFormData {
  title: string;
  description: string;
  courseCode: string;
  credits: number;
  maxStudents: number;
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites: string[];
  isActive: boolean;
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
    level: 'Beginner',
    prerequisites: [''],
    isActive: true,
    materials: [],
    modules: []
  });

  const [uploadingFiles, setUploadingFiles] = useState<number[]>([]);

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

  // Material handling functions
  const addMaterial = () => {
    setFormData(prev => ({
      ...prev,
      materials: [...prev.materials, {
        title: '',
        type: 'document',
        description: '',
        file: null,
        url: ''
      } as CourseMaterial]
    }));
  };

  const removeMaterial = (index: number) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const updateMaterial = (index: number, field: keyof CourseMaterial, value: any) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setFormData(prev => ({ ...prev, materials: newMaterials }));
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size must be less than 100MB');
      return;
    }

    try {
      setUploadingFiles(prev => [...prev, index]);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'course-material');

      const response = await axios.post('/api/upload', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const fileUrl = response.data.url || response.data.filePath;

      const updates: Partial<CourseMaterial> = {
        url: fileUrl,
        filename: response.data.filename
      };

      // Auto-fill title if empty
      if (!formData.materials[index].title) {
        updates.title = file.name.split('.')[0];
      }

      const newMaterials = [...formData.materials];
      newMaterials[index] = { ...newMaterials[index], ...updates };
      setFormData(prev => ({ ...prev, materials: newMaterials }));

      toast.success('File uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploadingFiles(prev => prev.filter(i => i !== index));
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
        }))
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
        <button
          onClick={() => navigate('/courses')}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Course</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Update course details and settings</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
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
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Materials</h2>
            <button
              type="button"
              onClick={addMaterial}
              className="btn btn-secondary btn-sm flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Material
            </button>
          </div>

          <div className="space-y-6">
            {formData.materials.map((material, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Material {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="btn btn-danger btn-sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={material.title}
                      onChange={(e) => updateMaterial(index, 'title', e.target.value)}
                      className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      placeholder="Material title"
                      required
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type *
                    </label>
                    <select
                      value={material.type}
                      onChange={(e) => updateMaterial(index, 'type', e.target.value)}
                      className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    >
                      <option value="document">Document/PDF</option>
                      <option value="video">Video</option>
                      <option value="note">Study Notes</option>
                      <option value="link">External Link</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={material.description || ''}
                      onChange={(e) => updateMaterial(index, 'description', e.target.value)}
                      className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                      rows={2}
                      placeholder="Brief description of the material"
                    />
                  </div>

                  {/* File Upload / URL */}
                  {material.type === 'link' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={material.url}
                        onChange={(e) => updateMaterial(index, 'url', e.target.value)}
                        className="input dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        placeholder="https://example.com"
                        required
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Upload File *
                      </label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                        <div className="space-y-1 text-center">
                          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                              <span>Upload a file</span>
                              <input
                                type="file"
                                className="sr-only"
                                accept={material.type === 'video' ? 'video/*' : '.pdf,.doc,.docx,.txt,.png,.jpg,.jpeg'}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(index, file);
                                  }
                                }}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {material.type === 'video' ? 'Video files up to 100MB' : 'PDF, DOC, TXT, Images up to 100MB'}
                          </p>
                          {uploadingFiles.includes(index) && (
                            <div className="text-sm text-blue-600">
                              <div className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full mr-2"></div>
                              Uploading...
                            </div>
                          )}
                          {material.url && (
                            <p className="text-sm text-green-600 font-medium">✓ File uploaded successfully</p>
                          )}
                          {!material.url && !uploadingFiles.includes(index) && (
                            <p className="text-sm text-red-500">⚠️ File upload required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {formData.materials.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>No materials added yet. Click "Add Material" to get started.</p>
                <p className="text-sm mt-2">Materials must have files uploaded to be included in the course.</p>
              </div>
            )}
          </div>
        </div>

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
