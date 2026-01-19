import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  PlusIcon, 
  TrashIcon, 
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';


interface CourseFormData {
  title: string;
  description: string;
  courseCode: string;
  credits: number;
  maxStudents: number;
  // fees removed
  category: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites: string[];
}

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    courseCode: '',
    credits: 3,
    maxStudents: 30,
    // fees removed
    category: '',
    level: 'Beginner',
    prerequisites: []
  });



  const categories = [
    'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 
    'Biology', 'English', 'History', 'Arts', 'Business', 'Other'
  ];

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    // Handle checkbox separately if needed, but not used here for main form data currently
    
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



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up prerequisites
      const cleanedData = {
        ...formData,
        prerequisites: formData.prerequisites.filter(p => p.trim() !== '')
      };

      const response = await axios.post('/api/courses', cleanedData);
      
      toast.success('Course created! Redirecting to add modules...');
      
      // Redirect to Add Module page with the new course ID
      navigate(`/courses/${response.data.course._id}/add-module`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="mt-2 text-gray-600">
          Fill in the details below to create a new course
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="input"
                placeholder="Introduction to Computer Science"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Code *
              </label>
              <input
                type="text"
                name="courseCode"
                required
                value={formData.courseCode}
                onChange={handleChange}
                className="input"
                placeholder="CS101"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level *
              </label>
              <select
                name="level"
                required
                value={formData.level}
                onChange={handleChange}
                className="input"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Students *
              </label>
              <input
                type="number"
                name="maxStudents"
                required
                min="1"
                value={formData.maxStudents}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Fees input removed */}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="input"
              placeholder="Describe what students will learn in this course..."
            />
          </div>
        </div>

        {/* Prerequisites */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Prerequisites</h2>
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
                  className="input flex-1"
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

        {/* Submit Button */}
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
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create & Add Modules'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCourse;
