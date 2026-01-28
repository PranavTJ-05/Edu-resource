import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    SquaresPlusIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import toast from 'react-hot-toast';
import type { Course } from '../../types';
import { useAuth } from '../../context/AuthContext';

const ManageModules = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const response = await axios.get<Course>(`/api/courses/${id}`);
            setCourse(response.data);
        } catch (error) {
            console.error('Error fetching course:', error);
            toast.error('Failed to fetch course');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!window.confirm('Are you sure you want to delete this module?')) return;

        try {
            await axios.delete(`/api/courses/${id}/modules/${moduleId}`);
            toast.success('Module deleted successfully');
            fetchCourse();
        } catch (error) {
            console.error('Error deleting module:', error);
            toast.error('Failed to delete module');
        }
    };

    if (loading) return <LoadingSpinner />;

    if (!course) {
        return <div className="text-center py-12">Course not found</div>;
    }

    const canEdit = user?.role === 'instructor' && course.instructor._id === user._id || user?.role === 'admin';

    if (!canEdit) {
        return <div className="text-center py-12">Unauthorized</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Modules</h1>
                    <p className="text-gray-600">{course.title} ({course.courseCode})</p>
                </div>
                <button
                    onClick={() => navigate(`/courses/${id}/add-module`)}
                    className="btn btn-primary flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Module
                </button>
            </div>

            {/* Modules List */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Modules ({course.modules?.length || 0})</h2>

                {!course.modules?.length ? (
                    <div className="text-center py-8 text-gray-500">
                        No modules created yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {course.modules.map((module, index) => (
                            <div key={module._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center space-x-3">
                                    <SquaresPlusIcon className="h-6 w-6 text-gray-500" />
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-semibold text-gray-400">#{index + 1}</span>
                                            <h3 className="font-medium text-gray-900">{module.title}</h3>
                                        </div>
                                        {module.duration && (
                                            <p className="text-sm text-gray-600">Duration: {module.duration}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">{module.materials?.length || 0} Materials</p>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => navigate(`/courses/${id}/add-module/${module._id}`)}
                                        className="btn btn-secondary btn-sm"
                                        title="Edit Module"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => module._id && handleDeleteModule(module._id)}
                                        className="btn btn-danger btn-sm"
                                        title="Delete Module"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageModules;
