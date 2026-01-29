import { useState, useRef, useEffect, useCallback } from 'react';
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
  VideoCameraIcon,

  ClockIcon,
  BookOpenIcon,
  Bars4Icon,
  CloudArrowUpIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { useDropzone } from 'react-dropzone';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { CourseMaterial, Module, Assignment } from '../../types';
import AssignmentForm from '../Assignments/AssignmentForm';

interface DraggableModuleProps {
  mod: Module;
  index: number;
  id: string; // Course ID
  moveModule: (dragIndex: number, hoverIndex: number) => void;
  navigate: any;
  handleRemoveModule: (id: string) => void;
  handleEditModule: (mod: Module) => void;
}

const DraggableModule = ({ mod, index, id, moveModule, navigate, handleRemoveModule, handleEditModule }: DraggableModuleProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop({
    accept: 'module',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: any, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveModule(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: 'module',
    item: () => {
      return { id: mod._id, index };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId} className="border border-gray-200 rounded-lg bg-white shadow-sm transition-all hover:shadow-md">
      <div
        className="px-5 py-4 cursor-pointer flex items-start gap-4"
      >
        {/* Drag Handle */}
        <div className="mt-1 cursor-move text-gray-400 hover:text-gray-600">
          <Bars4Icon className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                Module {index + 1}
              </span>
              <h3 className="text-base font-semibold text-gray-900">{mod.title}</h3>
            </div>
            {/* Keeping existing duration logic */}
            <span className="flex items-center text-sm text-gray-500">
              <ClockIcon className="w-3 h-3 mr-1" />
              {mod.duration || 'No duration'}
            </span>
            {mod.assignments && mod.assignments.length > 0 && (
              <span className="flex items-center text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                <DocumentIcon className="w-3 h-3 mr-1" />
                {mod.assignments.length} Assignments
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{mod.description}</p>

          <div className="flex items-center text-sm text-gray-500">
            <BookOpenIcon className="w-4 h-4 mr-1" />
            {mod.materials?.length || 0} materials
          </div>
        </div>

        <div className="ml-4 flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (mod._id) navigate(`/courses/${id}/modules/${mod._id}`);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="View Module"
          >
            <EyeIcon className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditModule(mod);
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            title="Edit Module"
          >
            <PencilIcon className="w-5 h-5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              mod._id && handleRemoveModule(mod._id);
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="Delete Module"
          >
            <TrashIcon className="w-5 h-5" />
          </button>

        </div>
      </div>
    </div>
  );
};

const AddModule = () => {
  const { id, moduleId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [showReorderConfirm, setShowReorderConfirm] = useState(false);
  const [originalModulesList, setOriginalModulesList] = useState<Module[]>([]);

  // Module Basic Info
  const [moduleData, setModuleData] = useState({
    title: '',
    description: '',
    duration: '',
    assignments: [] as string[],
    isAssignmentBlocking: true, // Default to true
  });

  const [availableAssignments, setAvailableAssignments] = useState<Assignment[]>([]);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);


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
      setOriginalModulesList(course.modules || []);

      // Fetch assignments for this course
      try {
        const assignRes = await axios.get(`/api/assignments/course/${id}`);
        setAvailableAssignments(assignRes.data);
      } catch (err) {
        console.error("Failed to load assignments", err);
      }

      if (moduleId && !editingModuleId) {
        // Initial deep link load if provided
        const module = course.modules.find((m: any) => m._id === moduleId);
        if (module) {
          setEditingModuleId(moduleId);
          setModuleData({
            title: module.title,
            description: module.description || '',
            duration: module.duration || '',
            assignments: module.assignments?.map((a: any) => typeof a === 'object' ? a._id : a) || [],
            isAssignmentBlocking: module.isAssignmentBlocking !== undefined ? module.isAssignmentBlocking : true,
          });
          setMarkdownContent(module.markdownContent || '');
          setMaterials(module.materials || []);
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      setTempMaterial(prev => ({ ...prev, file: acceptedFiles[0] }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: tempMaterial.type === 'video'
      ? { 'video/*': [] }
      : {
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc', '.dot'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'text/plain': ['.txt'],
        'image/*': ['.png', '.jpg', '.jpeg']
      },
    maxFiles: 1,
    multiple: false
  });

  const removeSelectedFile = () => {
    setTempMaterial(prev => ({ ...prev, file: null }));
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
          assignments: [],
          isAssignmentBlocking: true,
        });
        setMarkdownContent('');
        setMaterials([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete module');
    }
  };

  const handleEditModule = (mod: Module) => {
    if (!mod._id) return;
    setEditingModuleId(mod._id);
    setModuleData({
      title: mod.title,
      description: mod.description || '',
      duration: mod.duration || '',
      assignments: (mod.assignments || []).map((a: any) => typeof a === 'object' ? a._id : a),
      isAssignmentBlocking: mod.isAssignmentBlocking !== undefined ? mod.isAssignmentBlocking : true,
    });
    setMarkdownContent(mod.markdownContent || '');
    setMaterials(mod.materials || []);
    // expand the one we are editing - functionality removed


    // Scroll to form
    setTimeout(() => {
      document.getElementById('module-form-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingModuleId(null);
    setEditingModuleId(null);
    setModuleData({ title: '', description: '', duration: '', assignments: [], isAssignmentBlocking: true });
    setMarkdownContent('');
    setMaterials([]);
    setTempMaterial({ title: '', file: null, type: 'document', url: '', description: '' });
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

      if (editingModuleId) {
        // Update existing module
        await axios.put(`/api/courses/${id}/modules/${editingModuleId}`, payload);
        toast.success('Module updated successfully');
        await fetchCourseData(); // Refresh list

        // Reset to add mode after update
        handleCancelEdit();
      } else {
        // Create new module
        await axios.post(`/api/courses/${id}/modules`, payload);
        toast.success('Module saved! You can add another one.');
        await fetchCourseData(); // Refresh list

        // Reset form for next module
        handleCancelEdit();
        setMarkdownContent('');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save module');
    } finally {
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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


  const moveModule = (dragIndex: number, hoverIndex: number) => {
    const dragModule = modulesList[dragIndex];
    if (!dragModule) return;

    // Create new array
    const newModules = [...modulesList];
    // Remove dragged item
    newModules.splice(dragIndex, 1);
    // Insert at new position
    newModules.splice(hoverIndex, 0, dragModule);

    setModulesList(newModules);
    setShowReorderConfirm(true);
  };

  const cancelReorder = () => {
    setModulesList(originalModulesList);
    setShowReorderConfirm(false);
    toast('Reorder cancelled', { icon: '↩️' });
  };

  const saveReorder = async () => {
    try {
      // Assuming existing PUT /modules or PUT course updates full object
      // We will use PUT /api/courses/{id} and send the new modules list
      // We need to fetch current course data first to not overwrite other fields?
      // Or we can just send { modules: modulesList } as partial update if API supports it.
      // Looking at courses.js, it supports partial updates via $set: updates.

      await axios.put(`/api/courses/${id}`, {
        modules: modulesList
      });

      setOriginalModulesList(modulesList);
      setShowReorderConfirm(false);
      toast.success('Module order updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save order');
      setModulesList(originalModulesList); // revert
    }
  };

  return (

    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{editingModuleId ? 'Edit Module' : 'Add New Module'}</h1>
            <p className="text-sm text-gray-500 mt-1">{editingModuleId ? `Editing: ${moduleData.title}` : 'Manage your course content and structure'}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Module Form */}
      <div id="module-form-section" className="space-y-6 mb-12">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="border-b border-gray-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {moduleId ? `Editing: ${moduleData.title || 'Untitled Module'}` : 'Add New Module'}
            </h2>
          </div>

          <div className="space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Module Title</label>
                <input
                  type="text"
                  className="input w-full"
                  value={moduleData.title}
                  onChange={(e) => setModuleData({ ...moduleData, title: e.target.value })}
                  placeholder="e.g. Introduction to React" />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <input
                  type="text"
                  className="input w-full"
                  value={moduleData.duration}
                  onChange={(e) => setModuleData({ ...moduleData, duration: e.target.value })}
                  placeholder="e.g. 2 hours" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={moduleData.description}
                  onChange={(e) => setModuleData({ ...moduleData, description: e.target.value })}
                  placeholder="Brief overview of what students will learn..." />
              </div>
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Materials Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Materials</h3>

              {/* Add Material Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Add New Material</h4>
                  <span className="text-xs text-gray-500 font-medium px-2 py-1 bg-white rounded border border-gray-200">
                    Step 1: Details & Upload
                  </span>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Inputs */}
                  <div className="md:col-span-7 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Material Type</label>
                        <select
                          className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors"
                          value={tempMaterial.type}
                          onChange={(e) => setTempMaterial({ ...tempMaterial, type: e.target.value as any, file: null })}
                        >
                          <option value="document">Document/PDF</option>
                          <option value="video">Video Content</option>
                          <option value="note">Study Note</option>
                          <option value="link">External Link</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        {/* Spacer or additional small field could go here if needed */}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors"
                        placeholder="e.g. Week 1 Lecture Slides"
                        value={tempMaterial.title}
                        onChange={(e) => setTempMaterial({ ...tempMaterial, title: e.target.value })} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Description (Optional)</label>
                      <textarea
                        className="input text-sm w-full bg-gray-50 focus:bg-white transition-colors resize-none"
                        placeholder="Briefly describe this material..."
                        rows={3}
                        value={tempMaterial.description}
                        onChange={(e) => setTempMaterial({ ...tempMaterial, description: e.target.value })} />
                    </div>
                  </div>

                  {/* Right Column: Upload/Link */}
                  <div className="md:col-span-5 flex flex-col">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                      {tempMaterial.type === 'link' ? 'External URL' : 'File Upload'} <span className="text-red-500">*</span>
                    </label>

                    <div className="flex-1 flex flex-col">
                      {tempMaterial.type === 'link' ? (
                        <div className="flex-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-6 flex flex-col justify-center items-center text-center">
                          <LinkIcon className="h-10 w-10 text-gray-400 mb-3" />
                          <input
                            type="url"
                            className="input text-sm w-full mb-2 text-center"
                            placeholder="https://example.com/resource"
                            value={tempMaterial.url}
                            onChange={(e) => setTempMaterial({ ...tempMaterial, url: e.target.value })} />
                          <p className="text-xs text-gray-500">Paste the full URL to the external resource</p>
                        </div>
                      ) : (
                        <div className="flex-1">
                          {!tempMaterial.file ? (
                            <div
                              {...getRootProps()}
                              className={`h-full min-h-[200px] flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all cursor-pointer ${isDragActive
                                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'}`}
                            >
                              <input {...getInputProps()} />
                              <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                                <CloudArrowUpIcon className={`h-8 w-8 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                              </div>
                              <p className="text-sm font-medium text-gray-700 text-center mb-1">
                                {isDragActive ? 'Drop file here' : 'Click or Drag file here'}
                              </p>
                              <p className="text-xs text-gray-500 text-center max-w-[200px]">
                                {tempMaterial.type === 'video'
                                  ? 'MP4, MKV, AVI (Max 100MB)'
                                  : 'PDF, DOC, TXT, Images (Max 10MB)'}
                              </p>
                            </div>
                          ) : (
                            <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-6 border-2 border-solid border-blue-200 bg-blue-50/50 rounded-lg relative group">
                              <button
                                onClick={removeSelectedFile}
                                className="absolute top-2 right-2 p-1.5 bg-white text-gray-400 hover:text-red-500 rounded-full shadow-sm border border-gray-100 transition-colors"
                                title="Remove file"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>

                              <div className="p-4 bg-white rounded-xl shadow-sm mb-3">
                                {tempMaterial.type === 'video' ? (
                                  <VideoCameraIcon className="h-8 w-8 text-blue-600" />
                                ) : (
                                  <DocumentIcon className="h-8 w-8 text-blue-600" />
                                )}
                              </div>
                              <p className="text-sm font-semibold text-gray-900 text-center break-all px-2 line-clamp-2">
                                {tempMaterial.file.name}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(tempMaterial.file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                              <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Ready to upload
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="md:col-span-12 flex justify-end pt-2">
                    <button
                      onClick={addMaterialToList}
                      className="btn btn-primary px-6 py-2.5 flex items-center shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Save Material
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials List */}
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          {m.type === 'video' ? (
                            <VideoCameraIcon className="h-5 w-5 text-blue-500" />
                          ) : m.type === 'link' ? (
                            <LinkIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <DocumentIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{m.type} • {m.filename || 'URL'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeMaterial(idx)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm">No materials added to this module yet.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 my-6"></div>

            {/* Content Editor */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Content (Markdown)</h3>
              <div className="w-full h-full">
                <MarkdownManager
                  initialValue={markdownContent}
                  onChange={(val) => setMarkdownContent(val)}
                  height="h-[600px]"
                  key={editingModuleId || 'new-module'} // Force re-render when switching contexts
                />
              </div>

              <div className="border-t border-gray-100 my-6"></div>

              {/* Assignment Section (Moved Bottom) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Module Assignments</h3>
                  {!isCreatingAssignment && (
                    <button
                      onClick={() => setIsCreatingAssignment(true)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      + Create New Assignment
                    </button>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                  {/* List of Added Assignments */}
                  {moduleData.assignments && moduleData.assignments.length > 0 && (
                    <div className="border-b border-gray-200 bg-white">
                      {moduleData.assignments.map((assignId, index) => {
                        const assignParams = availableAssignments.find(a => a._id === assignId);
                        return (
                          <div key={index} className="px-6 py-4 border-b last:border-0 border-gray-100 flex justify-between items-center hover:bg-gray-50">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <DocumentIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{assignParams?.title || 'Unknown Assignment'}</h4>
                                <p className="text-xs text-gray-500">
                                  Due: {assignParams?.dueDate ? new Date(assignParams.dueDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newAssignments = [...moduleData.assignments];
                                newAssignments.splice(index, 1);
                                setModuleData({ ...moduleData, assignments: newAssignments });
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                              title="Remove Assignment"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New / Select Existing Area */}
                  {isCreatingAssignment ? (
                    <div className="p-6 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Create New Assignment</h4>
                        <button onClick={() => setIsCreatingAssignment(false)} className="text-gray-400 hover:text-gray-600">
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <AssignmentForm
                        embedded={true}
                        initialCourseId={id}
                        onSuccess={(newAssignment) => {
                          // Append to list if not already there
                          if (!moduleData.assignments.includes(newAssignment._id)) {
                            setModuleData(prev => ({ ...prev, assignments: [...prev.assignments, newAssignment._id] }));
                          }
                          setIsCreatingAssignment(false);
                          setAvailableAssignments(prev => {
                            if (prev.find(p => p._id === newAssignment._id)) return prev;
                            return [...prev, newAssignment];
                          });
                          toast.success("Assignment created and linked!");
                        }}
                        onCancel={() => setIsCreatingAssignment(false)}
                      />
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50">
                      <div className="max-w-md mx-auto">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">Link Existing Assignment</label>
                        <select
                          className="input w-full mb-3"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              if (moduleData.assignments.includes(val)) {
                                toast.error("Assignment already added");
                                return;
                              }
                              setModuleData(prev => ({ ...prev, assignments: [...prev.assignments, val] }));
                            }
                          }}
                        >
                          <option value="">-- Select Assignment to Link --</option>
                          {availableAssignments.filter(a => !moduleData.assignments.includes(a._id)).map((assign) => (
                            <option key={assign._id} value={assign._id}>
                              {assign.title} (Due: {new Date(assign.dueDate).toLocaleDateString()})
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center mt-4 pt-4 border-t border-gray-200">
                          <input
                            type="checkbox"
                            id="blocking-checkbox"
                            checked={moduleData.isAssignmentBlocking}
                            onChange={(e) => setModuleData({ ...moduleData, isAssignmentBlocking: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                          <label htmlFor="blocking-checkbox" className="ml-2 block text-sm text-gray-900">
                            Require all assignments to proceed (Blocking)
                          </label>
                        </div>
                        <p className="ml-6 text-xs text-gray-500 mt-1">
                          If checked, students cannot access the next module until ALL assignments in this module are submitted.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-100">

              {editingModuleId && (
                <button
                  onClick={handleCancelEdit}
                  className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Cancel Edit
                </button>
              )}
              <button
                onClick={handleSaveModule}
                disabled={loading}
                className="btn btn-primary min-w-[150px]"
              >
                {loading ? 'Saving...' : (editingModuleId ? 'Update Module' : 'Save & Add Module')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-b border-gray-100 py-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-500 uppercase tracking-wide">Manage Structure</h3>
      </div>

      {/* Existing Modules Accordion List */}
      <DndProvider backend={HTML5Backend}>
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Course Modules</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{modulesList.length} modules</span>
              {showReorderConfirm && (
                <div className="flex items-center gap-2 animate-pulse bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <span className="text-xs text-blue-700 font-medium">Order changed</span>
                  <button onClick={saveReorder} className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700">Save</button>
                  <button onClick={cancelReorder} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              )}
            </div>
          </div>

          {modulesList.length > 0 ? (
            <div className="space-y-4">
              {modulesList.map((mod, index) => (
                <DraggableModule
                  key={mod._id || index}
                  mod={mod}
                  index={index}
                  id={id || ''}
                  moveModule={moveModule}
                  navigate={navigate}
                  handleRemoveModule={handleRemoveModule}
                  handleEditModule={handleEditModule} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-gray-500">No modules added yet.</p>
              <p className="text-sm text-gray-400">Add your first module below.</p>
            </div>
          )}
        </div>
      </DndProvider>

      <div className="flex justify-end pt-6 border-t border-gray-100">
        <button
          onClick={handleSubmitModules}
          className="btn btn-primary min-w-[150px] shadow-sm hover:shadow-md transition-all"
        >
          Finish & View Course
        </button>
      </div>
    </div >
  );
};
export default AddModule;
