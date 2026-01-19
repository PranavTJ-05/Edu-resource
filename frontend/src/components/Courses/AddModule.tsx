import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { MarkdownManager } from '../Markdown';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentIcon,
  LinkIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import type { CourseMaterial, Module } from '../../types';

const AddModule = () => {
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Module Basic Info
  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    duration: '',
  });

  // Markdown Content
  const [markdownContent, setMarkdownContent] = useState('');

  // Materials List (Pending Uploads)
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [modulesList, setModulesList] = useState<Module[]>([]);
  const [tempMaterial, setTempMaterial] = useState<{
    title: string;
    file: File | null;
    type: 'document' | 'video' | 'note' | 'link';
    url: string;
    description: string;
  }>({
    title: '',
    file: null,
    type: 'document',
    url: '',
    description: ''
  });

  const fetchCourseData = async () => {
    if (!id) return;
    try {
      const res = await axios.get(`/api/courses/${id}`);
      const course = res.data;
      setModulesList(course.modules || []);

      if (moduleId) {
        const module = course.modules.find((m: any) => m._id === moduleId);
        if (module) {
          setModuleData({
            title: module.title,
            description: module.description || '',
            duration: module.duration || '',
          });
          setMarkdownContent(module.markdownContent || '');
          setMaterials(module.materials || []);
        } else {
          toast.error('Module not found');
          navigate(`/courses/${id}`);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
    }
  };

  useEffect(() => {
    fetchCourseData();
  }, [id, moduleId, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTempMaterial({ ...tempMaterial, file: e.target.files[0] });
    }
  };

  const addMaterialToList = async () => {
    if (!tempMaterial.title) {
      toast.error('Please provide a title');
      return;
    }

    if (tempMaterial.type === 'link' && !tempMaterial.url) {
      toast.error('Please provide a URL');
      return;
    }

    if (tempMaterial.type !== 'link' && !tempMaterial.file) {
      toast.error('Please upload a file');
      return;
    }

    let materialUrl = tempMaterial.url;
    let filename = '';

    if (tempMaterial.file) {
      const formData = new FormData();
      formData.append('file', tempMaterial.file);
      formData.append('type', 'course-material');

      try {
        toast.loading('Uploading file...', { id: 'upload' });
        const res = await axios.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('File uploaded', { id: 'upload' });
        materialUrl = res.data.filePath; // Ensure backend returns absolute URL or we handle relative
        filename = tempMaterial.file.name;
      } catch (err) {
        console.error(err);
        toast.error('Failed to upload file', { id: 'upload' });
        return;
      }
    }

    const newMaterial: CourseMaterial = {
      title: tempMaterial.title,
      type: tempMaterial.type,
      url: materialUrl,
      filename,
      description: tempMaterial.description
    };

    setMaterials([...materials, newMaterial]);
    setTempMaterial({ title: '', file: null, type: 'document', url: '', description: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Material added');
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleRemoveModule = async (modId: string) => {
    if (!window.confirm('Are you sure you want to delete this module?')) return;
    try {
      await axios.delete(`/api/courses/${id}/modules/${modId}`);
      toast.success('Module deleted');
      fetchCourseData(); // Refresh list
      if (moduleId === modId) {
        navigate(`/courses/${id}/add-module`); // Go back to add mode if we deleted current module
        // Reset form
        setModuleData({
          title: '',
          description: '',
          duration: '',
        });
        setMarkdownContent('');
        setMaterials([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete module');
    }
  };

  const handleSaveModule = async () => {
    if (!moduleData.title) {
      toast.error('Module Title is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...moduleData,
        markdownContent,
        materials
      };

      if (moduleId) {
        // Update existing module
        await axios.put(`/api/courses/${id}/modules/${moduleId}`, payload);
        toast.success('Module updated successfully');
        fetchCourseData(); // Refresh list
        // navigate(`/courses/${id}`); // Don't navigate away, stay on page to see list update or add more? 
        // User said: "whenever I add a information... and then Add this module(save it) then it should Show the module in a list wise structurally"
        // So maybe better to reset form and allow adding another one, OR just show updated list.
        // If updating, we probably want to stay or go back. Let's stay and switch to "Add Mode" or just stay?
        // Usually "Update" implies we are done editing. But "Add" implies we want to add more.

        // If we are editing, we probably want to go back to course detail OR just refresh list.
        // Let's just refresh.
      } else {
        // Create new module
        await axios.post(`/api/courses/${id}/modules`, payload);
        toast.success('Module saved! You can add another one.');
        fetchCourseData(); // Refresh list

        // Reset form for next module
        setModuleData({
          title: '',
          description: '',
          duration: '',
        });
        setMarkdownContent('');
        setMaterials([]);
        setMaterials([]);
        setTempMaterial({ title: '', file: null, type: 'document', url: '', description: '' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save module');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitModules = () => {
    if (moduleId) {
      navigate(`/courses/${id}`);
    } else {
      toast.success('All modules submitted successfully!');
      navigate(`/courses/${id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{moduleId ? 'Edit Module' : 'Add New Module'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Module Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={moduleData.title}
                  onChange={(e) => setModuleData({ ...moduleData, title: e.target.value })}
                  placeholder="Introduction to..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={moduleData.duration}
                  onChange={(e) => setModuleData({ ...moduleData, duration: e.target.value })}
                  placeholder="2 hours"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className="input mt-1"
                  rows={3}
                  value={moduleData.description}
                  onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Materials Upload */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Course Materials (PDF/Video)</h2>

            {/* Add Material Form */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Material</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="input text-sm"
                    value={tempMaterial.type}
                    onChange={(e) => setTempMaterial({ ...tempMaterial, type: e.target.value as any })}
                  >
                    <option value="document">Document/PDF</option>
                    <option value="video">Video</option>
                    <option value="note">Study Note</option>
                    <option value="link">External Link</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Material Title"
                    value={tempMaterial.title}
                    onChange={(e) => setTempMaterial({ ...tempMaterial, title: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    className="input text-sm"
                    placeholder="Brief description"
                    value={tempMaterial.description}
                    onChange={(e) => setTempMaterial({ ...tempMaterial, description: e.target.value })}
                  />
                </div>

                {tempMaterial.type === 'link' ? (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                    <input
                      type="url"
                      className="input text-sm"
                      placeholder="https://example.com"
                      value={tempMaterial.url}
                      onChange={(e) => setTempMaterial({ ...tempMaterial, url: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">File</label>
                    <div className="flex items-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-full file:border-0
                              file:text-sm file:font-semibold
                              file:bg-indigo-50 file:text-indigo-700
                              hover:file:bg-indigo-100"
                        onChange={handleFileChange}
                      />
                    </div>
                  </div>
                )}

                <div className="col-span-2">
                  <button
                    onClick={addMaterialToList}
                    className="btn btn-secondary w-full flex items-center justify-center sm:w-auto"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Material
                  </button>
                </div>
              </div>
            </div>

            {/* List of Key Materials */}
            {materials.length > 0 ? (
              <div className="space-y-3">
                {materials.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-center space-x-3">
                      {m.type === 'video' ? (
                        <VideoCameraIcon className="h-5 w-5 text-blue-500" />
                      ) : m.type === 'link' ? (
                        <LinkIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <DocumentIcon className="h-5 w-5 text-gray-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.title}</p>
                        <p className="text-xs text-gray-500">{m.type} • {m.filename || 'Link'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeMaterial(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No materials added yet.</p>
            )}
          </div>

          {/* Markdown Editor */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Module Content (Markdown)</h2>
            <MarkdownManager
              initialValue={markdownContent}
              onChange={(val) => setMarkdownContent(val)}
              // height="h-[600px]" // Reduced height for better fit if needed, keeping mostly same
              height="h-[500px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={handleSubmitModules}
              className="btn btn-secondary"
            >
              Finish & View Course
            </button>
            <button
              onClick={handleSaveModule}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Saving...' : (moduleId ? 'Update Module' : 'Add this Module')}
            </button>
          </div>
        </div>

        {/* Modules List Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Course Modules</h2>
            {modulesList.length > 0 ? (
              <div className="space-y-3">
                {modulesList.map((mod, index) => (
                  <div
                    key={mod._id || index}
                    className={`p-3 border rounded-md transition-colors ${moduleId === mod._id
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200 hover:border-indigo-300'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="cursor-pointer" onClick={() => {
                        if (mod._id) navigate(`/courses/${id}/modules/${mod._id}`);
                      }}>
                        <h3 className="text-sm font-medium text-gray-900">Module {index + 1}</h3>
                        <p className="text-sm text-gray-600 line-clamp-1">{mod.title}</p>
                        <span className="text-xs text-xs text-gray-400">{mod.duration}</span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {
                            if (mod._id) navigate(`/courses/${id}/modules/${mod._id}`);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => mod._id && handleRemoveModule(mod._id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p>No modules yet</p>
                <p className="text-sm">Add your first module!</p>
              </div>
            )}

            {/* If currently editing, show button to add new */}
            {moduleId && (
              <button
                onClick={() => {
                  navigate(`/courses/${id}/add-module`);
                  setModuleData({ title: '', description: '', duration: '' });
                  setMarkdownContent('');
                  setMaterials([]);
                  setTempMaterial({ title: '', file: null, type: 'document', url: '', description: '' });
                }}
                className="mt-4 w-full btn btn-secondary flex items-center justify-center"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add New Module
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddModule;
