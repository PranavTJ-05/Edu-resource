import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { PlusIcon, TrashIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Course, RubricItem, Assignment } from '../../types';

interface AssignmentFormProps {
    initialCourseId?: string;
    onSuccess?: (assignment: Assignment) => void;
    onCancel?: () => void;
    embedded?: boolean;
}

const AssignmentForm = ({ initialCourseId, onSuccess, onCancel, embedded = false }: AssignmentFormProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);

    interface FormData {
        title: string;
        description: string;
        courseId: string;
        type: string;
        totalPoints: number;
        dueDate: string;
        submissionType: string;
        allowedFileTypes: string[];
        maxFileSize: number;
        instructions: string;
        isPublished: boolean;
        allowLateSubmission: boolean;
        latePenalty: number;
        rubric: RubricItem[];
        attachments: { originalName: string; path: string; mimetype: string }[];
        solution: { originalName: string; path: string; mimetype: string } | null;
        isSolutionVisible: boolean;
        hasNoDueDate?: boolean; // New field
    }

    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        courseId: initialCourseId || '',
        type: 'homework',
        totalPoints: 100,
        dueDate: '',
        hasNoDueDate: false, // New field
        submissionType: 'both',
        allowedFileTypes: ['pdf', 'doc', 'docx'],
        maxFileSize: 10485760, // 10MB
        instructions: '',
        isPublished: false,
        allowLateSubmission: true,
        latePenalty: 10,
        rubric: [],
        attachments: [],
        solution: null,
        isSolutionVisible: false
    });

    useEffect(() => {
        if (user && !initialCourseId) {
            fetchInstructorCourses();
        }
    }, [user, initialCourseId]);

    const fetchInstructorCourses = async () => {
        if (!user) return;
        try {
            const response = await axios.get(`/api/courses/instructor/${user._id}`);
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        if (name === 'dueDate') {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else if (name === 'hasNoDueDate') { // Handle checkbox
            setFormData(prev => ({
                ...prev,
                hasNoDueDate: checked,
                dueDate: checked ? '' : prev.dueDate // Clear date if checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked :
                    type === 'number' ? parseInt(value) || 0 : value
            }));
        }
    };

    const handleFileTypeChange = (fileType: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            allowedFileTypes: checked
                ? [...prev.allowedFileTypes, fileType]
                : prev.allowedFileTypes.filter(type => type !== fileType)
        }));
    };

    const uploadFile = async (file: File, context: 'assignment-admin' | 'assignment-student') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'document');
        formData.append('context', context);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            return {
                originalName: response.data.originalName,
                filename: response.data.filename,
                path: response.data.filePath,
                mimetype: response.data.mimetype
            };
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(`Failed to upload ${file.name}`);
            throw error;
        }
    };

    const handleAssignmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);

        setLoading(true);
        try {
            const uploadedAttachments = await Promise.all(
                files.map(file => uploadFile(file, 'assignment-admin'))
            );

            setFormData(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), ...uploadedAttachments]
            }));
            toast.success('Files uploaded successfully');
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const handleSolutionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setLoading(true);
        try {
            const uploadedSolution = await uploadFile(file, 'assignment-admin');
            setFormData(prev => ({
                ...prev,
                solution: uploadedSolution
            }));
            toast.success('Solution uploaded successfully');
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const removeSolution = () => {
        setFormData(prev => ({
            ...prev,
            solution: null
        }));
    };

    const addRubricCriteria = () => {
        setFormData(prev => ({
            ...prev,
            rubric: [...prev.rubric, { criteria: '', points: 0, description: '' }]
        }));
    };

    const removeRubricCriteria = (index: number) => {
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.filter((_, i) => i !== index)
        }));
    };

    const updateRubricCriteria = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            rubric: prev.rubric.map((item, i) =>
                i === index ? { ...item, [field]: field === 'points' ? parseInt(value) || 0 : value } : item
            )
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.hasNoDueDate) {
            if (!formData.dueDate) {
                toast.error('Please select a due date');
                setLoading(false);
                return;
            }

            const dueDate = new Date(formData.dueDate);
            if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
                toast.error('Please select a valid future date for the due date');
                setLoading(false);
                return;
            }
        }

        try {
            const payload = {
                ...formData,
                dueDate: formData.hasNoDueDate ? null : new Date(formData.dueDate).toISOString(),
                allowedFileTypes: formData.allowedFileTypes,
                rubric: formData.rubric,
                attachments: formData.attachments,
                solution: formData.solution,
                isSolutionVisible: formData.isSolutionVisible
            };

            const response = await axios.post('/api/assignments', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            toast.success('Assignment created successfully!');

            if (onSuccess) {
                onSuccess(response.data.assignment);
            } else {
                navigate(`/assignments/${response.data.assignment._id}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create assignment');
        } finally {
            setLoading(false);
        }
    };

    const fileTypes = [
        { value: 'pdf', label: 'PDF' },
        { value: 'doc', label: 'DOC' },
        { value: 'docx', label: 'DOCX' },
        { value: 'txt', label: 'TXT' },
        { value: 'jpg', label: 'JPG' },
        { value: 'png', label: 'PNG' },
        { value: 'zip', label: 'ZIP' }
    ];

    const getMinDateTime = () => {
        const minTime = new Date();
        minTime.setHours(minTime.getHours() + 1);
        return minTime.toISOString().slice(0, 16);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0' : ''}`}>
                {!embedded && <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title *</label>
                        <input type="text" name="title" required value={formData.title} onChange={handleChange} className="input" placeholder="Assignment 1: Data Structures" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                        {initialCourseId ? (
                            <input type="text" disabled value="Current Course" className="input bg-gray-100 text-gray-500 cursor-not-allowed" />
                        ) : (
                            <select name="courseId" required value={formData.courseId} onChange={handleChange} className="input">
                                <option value="">Select Course</option>
                                {courses.map(course => <option key={course._id} value={course._id}>{course.title} ({course.courseCode})</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type *</label>
                        <select name="type" required value={formData.type} onChange={handleChange} className="input">
                            <option value="homework">Homework</option>
                            <option value="quiz">Quiz</option>
                            <option value="exam">Exam</option>
                            <option value="project">Project</option>
                            <option value="presentation">Presentation</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Total Points *</label>
                        <input type="number" name="totalPoints" required min="1" value={formData.totalPoints} onChange={handleChange} className="input" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="datetime-local"
                                name="dueDate"
                                required={!formData.hasNoDueDate}
                                min={getMinDateTime()}
                                value={formData.dueDate}
                                onChange={handleChange}
                                disabled={formData.hasNoDueDate}
                                className={`input flex-1 ${formData.hasNoDueDate ? 'bg-gray-100 text-gray-400' : ''}`}
                            />
                            <label className="flex items-center min-w-[80px]">
                                <input
                                    type="checkbox"
                                    name="hasNoDueDate"
                                    checked={formData.hasNoDueDate || false}
                                    onChange={handleChange}
                                    className="rounded border-gray-300 text-primary-600"
                                />
                                <span className="ml-2 text-sm text-gray-700">No Due Date</span>
                            </label>
                        </div>
                        {!formData.hasNoDueDate && <p className="text-xs text-gray-500 mt-1">Assignment must be due at least 1 hour from now</p>}
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                        <textarea name="description" required rows={4} value={formData.description} onChange={handleChange} className="input" placeholder="Describe the assignment objectives and requirements..." />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <textarea name="instructions" rows={4} value={formData.instructions} onChange={handleChange} className="input" placeholder="Detailed instructions for completing the assignment..." />
                    </div>
                </div>
            </div>

            {/* Submission Settings */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Submission Settings</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Submission Type</label>
                        <select name="submissionType" value={formData.submissionType} onChange={handleChange} className="input">
                            <option value="file">File Upload Only</option>
                            <option value="text">Text Submission Only</option>
                            <option value="both">Both File and Text</option>
                        </select>
                    </div>

                    {formData.submissionType !== 'text' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed File Types</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {fileTypes.map(type => (
                                        <label key={type.value} className="flex items-center">
                                            <input type="checkbox" checked={formData.allowedFileTypes.includes(type.value)} onChange={(e) => handleFileTypeChange(type.value, e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                                            <span className="ml-2 text-sm">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Max File Size (MB)</label>
                                <input type="number" name="maxFileSize" min="1" max="100" value={Math.round(formData.maxFileSize / 1024 / 1024)} onChange={(e) => setFormData(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) * 1024 * 1024 }))} className="input" />
                            </div>
                        </>
                    )}

                    <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                            <input type="checkbox" name="allowLateSubmission" checked={formData.allowLateSubmission} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                            <span className="ml-2 text-sm">Allow Late Submissions</span>
                        </label>
                        {formData.allowLateSubmission && (
                            <div className="flex items-center space-x-2">
                                <label className="text-sm">Penalty per day:</label>
                                <input type="number" name="latePenalty" min="0" max="100" value={formData.latePenalty} onChange={handleChange} className="input w-20" />
                                <span className="text-sm">%</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="flex items-center">
                            <input type="checkbox" name="isPublished" checked={formData.isPublished} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                            <span className="ml-2 text-sm">Publish immediately</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Assignment Files */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assignment Files & Solution</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Materials</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <input type="file" multiple onChange={handleAssignmentFileChange} className="hidden" id="assignment-files" />
                                <label htmlFor="assignment-files" className="btn btn-secondary cursor-pointer">Choose Files</label>
                                <p className="text-sm text-gray-600 mt-2">Upload reference materials, templates, or instructions</p>
                            </div>
                        </div>
                        {formData.attachments.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
                                <ul className="space-y-2">
                                    {formData.attachments.map((file, index) => (
                                        <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                            <span className="text-sm text-gray-600">{file.originalName}</span>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4" /></button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Answer/Solution Key</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <input type="file" onChange={handleSolutionFileChange} className="hidden" id="solution-file" />
                                <label htmlFor="solution-file" className="btn btn-secondary cursor-pointer">Choose Solution File</label>
                                <p className="text-sm text-gray-600 mt-2">Upload the answer key or solution PDF</p>
                            </div>
                        </div>
                        {formData.solution && (
                            <div className="mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Solution File:</h4>
                                <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <span className="text-sm text-blue-800">{formData.solution.originalName}</span>
                                    <button type="button" onClick={removeSolution} className="text-red-600 hover:text-red-800"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="flex items-center">
                                <input type="checkbox" name="isSolutionVisible" checked={formData.isSolutionVisible} onChange={handleChange} className="rounded border-gray-300 text-primary-600" />
                                <span className="ml-2 text-sm">Make solution visible to students immediately</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1 ml-6">If unchecked, you can enable this later after the due date.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rubric */}
            <div className={`card ${embedded ? 'border-none shadow-none p-0 border-t pt-6 rounded-none' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Grading Rubric</h2>
                    <button type="button" onClick={addRubricCriteria} className="btn btn-secondary btn-sm flex items-center"><PlusIcon className="h-4 w-4 mr-1" />Add Criteria</button>
                </div>
                {formData.rubric.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No rubric criteria added. Click "Add Criteria" to get started.</p>
                ) : (
                    <div className="space-y-4">
                        {formData.rubric.map((criteria, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
                                <div className="md:col-span-4"><input type="text" placeholder="Criteria name" value={criteria.criteria} onChange={(e) => updateRubricCriteria(index, 'criteria', e.target.value)} className="input" /></div>
                                <div className="md:col-span-2"><input type="number" placeholder="Points" value={criteria.points} onChange={(e) => updateRubricCriteria(index, 'points', e.target.value)} className="input" /></div>
                                <div className="md:col-span-5"><input type="text" placeholder="Description" value={criteria.description} onChange={(e) => updateRubricCriteria(index, 'description', e.target.value)} className="input" /></div>
                                <div className="md:col-span-1"><button type="button" onClick={() => removeRubricCriteria(index)} className="btn btn-danger btn-sm w-full"><TrashIcon className="h-4 w-4" /></button></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-4">
                <button type="button" onClick={onCancel || (() => navigate('/assignments'))} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-50">{loading ? 'Creating...' : 'Create Assignment'}</button>
            </div>
        </form>
    );
};

export default AssignmentForm;
