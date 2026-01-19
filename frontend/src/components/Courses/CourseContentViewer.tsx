import { useState } from 'react';
import {
    DocumentIcon,
    LinkIcon,
    LockClosedIcon,
    EyeIcon,
    ArrowRightIcon,
    XMarkIcon,
    VideoCameraIcon
} from '@heroicons/react/24/outline';
import type { CourseMaterial, Module } from '../../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface CourseContentViewerProps {
    materials: CourseMaterial[];
    modules?: Module[];
    isEnrolled: boolean;
    canEdit: boolean;
    onEnroll: () => void;
    enrollmentLoading: boolean;
}

const CourseContentViewer = ({
    materials,
    modules,
    isEnrolled,
    canEdit,
    onEnroll,
    enrollmentLoading
}: CourseContentViewerProps) => {
    const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'video': return VideoCameraIcon;
            case 'link': return LinkIcon;
            case 'note': return DocumentIcon;
            default: return DocumentIcon;
        }
    };

    const canAccessMaterial = (material: CourseMaterial) => {
        return isEnrolled || canEdit || material.isFree; // Assuming isFree might be on backend even if type removed it
    };

    const MaterialItem = ({ material }: { material: CourseMaterial }) => {
        const Icon = getIconForType(material.type);
        const canAccess = canAccessMaterial(material);

        return (
            <div
                className={`relative p-4 border rounded-lg transition-all ${canAccess
                    ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm cursor-pointer'
                    : 'border-gray-100 bg-gray-50'
                    }`}
                onClick={() => canAccess && setSelectedMaterial(material)}
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
                    <div className="space-y-8">
                        {modules!.map((module, mIdx) => (
                            <div key={module._id || mIdx} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-800">{module.title}</h3>
                                    {module.duration && <span className="text-sm text-gray-500">{module.duration}</span>}
                                    <p className="text-gray-600 mt-1">{module.description}</p>
                                </div>

                                {/* Markdown Content */}
                                {module.markdownContent && (
                                    <div className="prose max-w-none text-gray-700 mb-4 bg-gray-50 p-4 rounded-md">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
                                        >
                                            {module.markdownContent}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Module Materials */}
                                <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                                    {module.materials && module.materials.map((mat, matIdx) => (
                                        <MaterialItem key={mat._id || matIdx} material={mat} />
                                    ))}
                                    {(!module.materials || module.materials.length === 0) && (
                                        <p className="text-sm text-gray-400 italic">No materials in this module.</p>
                                    )}
                                </div>
                            </div>
                        ))}
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

            {/* Enrollment CTA */}
            {/* {!isEnrolled && lockedMaterialsCount > 0 && (
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-900">
                                    Unlock Premium Content
                                </h3>
                                <p className="text-blue-700 mt-1">
                                    Enroll now to access all {materials.length} course materials, including {lockedMaterialsCount} premium {lockedMaterialsCount === 1 ? 'resource' : 'resources'}.
                                </p>
                                <div className="mt-3 flex items-center space-x-4 text-sm">
                                    <span className="flex items-center text-green-600">
                                        ✓ All video lectures
                                    </span>
                                    <span className="flex items-center text-green-600">
                                        ✓ Study notes & documents
                                    </span>
                                    <span className="flex items-center text-green-600">
                                        ✓ Assignments & quizzes
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onEnroll}
                                disabled={enrollmentLoading}
                                className="btn btn-primary px-6 py-3 text-lg disabled:opacity-50"
                            >
                                {enrollmentLoading ? 'Enrolling...' : 'Enroll Now'}
                            </button>
                        </div>
                    </div>
                )} */}


            {/* Material Preview Modal */}
            {
                selectedMaterial && canAccessMaterial(selectedMaterial) && (
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
        </div >
    );
};

export default CourseContentViewer;