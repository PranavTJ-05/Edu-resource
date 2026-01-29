import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
    DocumentIcon,
    LinkIcon,
    LockClosedIcon,
    EyeIcon,
    ArrowRightIcon,
    XMarkIcon,
    VideoCameraIcon,
    ClockIcon,
    BookOpenIcon
} from '@heroicons/react/24/outline';
import type { CourseMaterial, Module } from '../../types';

interface CourseContentViewerProps {
    materials: CourseMaterial[];
    modules?: Module[];
    isEnrolled: boolean;
    canEdit: boolean;
    courseId: string;
    completedAssignmentIds?: Set<string>;
    userRole?: string;
}

const CourseContentViewer = ({
    materials,
    modules,
    isEnrolled,
    canEdit,
    courseId,
    completedAssignmentIds = new Set(),
    userRole
}: CourseContentViewerProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return VideoCameraIcon;
            case 'link': return LinkIcon;
            case 'note': return DocumentIcon;
            default: return DocumentIcon;
        }
    };

    const canAccessMaterial = () => {
        return isEnrolled || canEdit;
    };

    const MaterialItem = ({ material }: { material: CourseMaterial }) => {
        const Icon = getIconForType(material.type);
        const canAccess = canAccessMaterial();

        return (
            <div
                className={`relative p-4 border rounded-lg transition-all ${canAccess
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                    : 'border-gray-100 bg-gray-50'
                    }`}
                onClick={() => {
                    if (!user) {
                        toast.error('Please login to view course content');
                        navigate('/login');
                        return;
                    }
                    if (canAccess) setSelectedMaterial(material);
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                        <div className={`relative ${!canAccess ? 'opacity-50' : ''}`}>
                            <Icon className="h-6 w-6 text-gray-500" />
                            {!canAccess && (
                                <LockClosedIcon className="h-3 w-3 text-red-500 absolute -top-1 -right-1 bg-white rounded-full" />
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center space-x-2">
                                <h3 className={`font-medium ${canAccess ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {material.title}
                                </h3>
                                {/* isFree check if needed */}
                            </div>
                            <p className={`text-sm capitalize ${canAccess ? 'text-gray-600' : 'text-gray-400'}`}>
                                {material.type}
                                {material.description && ` • ${material.description}`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {canAccess ? (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(material.url, '_blank');
                                    }}
                                    className="btn btn-secondary btn-sm flex items-center"
                                >
                                    <EyeIcon className="h-4 w-4 mr-1" />
                                    View
                                </button>
                                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
                            </>
                        ) : (
                            <div className="flex items-center text-gray-400">
                                <LockClosedIcon className="h-4 w-4 mr-2" />
                                <span className="text-sm">Locked</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const hasModules = modules && modules.length > 0;
    const hasMaterials = materials && materials.length > 0;

    if (!hasModules && !hasMaterials) {
        return (
            <div className="card">
                <div className="text-center py-8">
                    <DocumentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Available</h3>
                    <p className="text-gray-600">
                        Course materials will appear here once the instructor uploads them.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Materials Overview */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Course Content</h2>
                </div>

                {/* Modules List */}
                {hasModules && (
                    <div className="space-y-4">
                        {modules!.map((module, mIdx) => {
                            // Determine if this module is locked
                            let isLocked = false;

                            // Only apply locking logic for students who are enrolled
                            if (userRole === 'student' && isEnrolled) {
                                // Check all previous modules
                                for (let i = 0; i < mIdx; i++) {
                                    const prevModule = modules![i];
                                    if (prevModule.isAssignmentBlocking) {
                                        // If blocking, check if all assignments are completed
                                        // Note: assignments in module might be objects or IDs depending on population
                                        // Based on CourseDetail.tsx usage, they seem to be objects from population
                                        const assignments = prevModule.assignments || [];
                                        const allCompleted = assignments.every((a: any) =>
                                            completedAssignmentIds.has(typeof a === 'string' ? a : a._id)
                                        );

                                        if (!allCompleted) {
                                            isLocked = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            return (
                                <div
                                    key={module._id || mIdx}
                                    onClick={() => {
                                        if (!user) {
                                            toast.error('Please login to view course content');
                                            navigate('/login');
                                            return;
                                        }
                                        if (!isLocked && module._id) {
                                            navigate(`/courses/${courseId}/modules/${module._id}`);
                                        }
                                    }}
                                    className={`group relative bg-white border rounded-xl p-6 transition-all ${isLocked
                                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-75'
                                            : 'border-gray-200 hover:shadow-md cursor-pointer hover:border-blue-200'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-lg flex items-center justify-center transition-colors ${isLocked
                                                    ? 'bg-gray-100 text-gray-400'
                                                    : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                                                }`}>
                                                {isLocked ? <LockClosedIcon className="h-6 w-6" /> : <DocumentIcon className="h-6 w-6" />}
                                            </div>
                                            <div>
                                                <h3 className={`text-lg font-semibold transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'
                                                    }`}>
                                                    {module.title}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    {module.duration && (
                                                        <span className="flex items-center">
                                                            <ClockIcon className="w-3.5 h-3.5 mr-1" />
                                                            {module.duration}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center">
                                                        <BookOpenIcon className="w-3.5 h-3.5 mr-1" />
                                                        {module.materials?.length || 0} materials
                                                    </span>
                                                    {(module.assignments?.length || 0) > 0 && (
                                                        <span className="flex items-center">
                                                            {isLocked ? 'Locked by previous assignments' : `${module.assignments?.length} assignments`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`flex items-center transition-all ${isLocked
                                                ? 'text-gray-400'
                                                : 'text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1'
                                            }`}>
                                            {isLocked ? (
                                                <span className="text-sm font-medium flex items-center">
                                                    Locked <LockClosedIcon className="h-4 w-4 ml-1" />
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-sm font-medium mr-2 hidden sm:block">View Content</span>
                                                    <ArrowRightIcon className="h-5 w-5" />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Flat Materials List (Fallback or Legacy) */}
                {hasMaterials && !hasModules && (
                    <div className="space-y-3 mt-4">
                        <h3 className="text-md font-semibold text-gray-700 mb-3">Additional Materials</h3>
                        {materials.map((material, index) => (
                            <MaterialItem key={material._id || index} material={material} />
                        ))}
                    </div>
                )}
            </div>

            {/* Material Preview Modal */}
            {
                selectedMaterial && canAccessMaterial() && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg max-w-4xl max-h-screen overflow-auto m-4">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold">{selectedMaterial.title}</h3>
                                        <p className="text-gray-600 capitalize">{selectedMaterial.type}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedMaterial(null)}
                                        className="btn btn-secondary flex items-center"
                                    >
                                        <XMarkIcon className="h-4 w-4 mr-1" />
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {/* Material content preview or direct link */}
                                <div className="text-center">
                                    {(() => {
                                        const ModalIcon = getIconForType(selectedMaterial.type);
                                        return <ModalIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />;
                                    })()}
                                    <p className="text-gray-600 mb-4">
                                        {selectedMaterial.description || 'Click below to access this material'}
                                    </p>
                                    <div className="flex items-center justify-center space-x-3">
                                        <a
                                            href={selectedMaterial.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary flex items-center"
                                        >
                                            <EyeIcon className="h-4 w-4 mr-2" />
                                            Open Material
                                        </a>
                                        <button
                                            onClick={() => setSelectedMaterial(null)}
                                            className="btn btn-secondary"
                                        >
                                            Close Preview
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default CourseContentViewer;