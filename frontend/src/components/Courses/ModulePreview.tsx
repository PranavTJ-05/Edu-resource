import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import mermaid from 'mermaid';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs';

mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
});

const Mermaid = ({ chart }: { chart: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        if (ref.current && !rendered) {
            mermaid.run({
                nodes: [ref.current],
                suppressErrors: true
            }).then(() => setRendered(true)).catch(e => console.error(e));
        }
    }, [chart, rendered]);

    return (
        <div className="mermaid flex justify-center my-4 overflow-x-auto" ref={ref}>
            {chart}
        </div>
    );
};

import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ClockIcon,
    BookOpenIcon,
    VideoCameraIcon,
    DocumentIcon,
    LinkIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../Common/LoadingSpinner';
import type { Module } from '../../types';

const ModulePreview = () => {
    const { id: courseId, moduleId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [module, setModule] = useState<Module | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextModuleId, setNextModuleId] = useState<string | null>(null);
    const [isLastModule, setIsLastModule] = useState(false);


    // Auth Check
    useEffect(() => {
        if (!user) {
            toast.error('Please login to view module content');
            navigate('/login');
        }
    }, [user, navigate]);

    // Assignment Logic
    const [completedAssignmentIds, setCompletedAssignmentIds] = useState<string[]>([]);
    const [allBlockingAssignmentsCompleted, setAllBlockingAssignmentsCompleted] = useState(false);

    useEffect(() => {
        const fetchModule = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/courses/${courseId}`);
                const course = res.data;
                const foundModule = course.modules?.find((m: Module) => m._id === moduleId);

                if (foundModule) {
                    setModule(foundModule);

                    if (course.modules) {
                        const currentIndex = course.modules.findIndex((m: Module) => m._id === moduleId);
                        if (currentIndex !== -1 && currentIndex < course.modules.length - 1) {
                            setNextModuleId(course.modules[currentIndex + 1]._id || null);
                            setIsLastModule(false);
                        } else if (currentIndex === course.modules.length - 1) {
                            setNextModuleId(null);
                            setIsLastModule(true);
                        }
                    }

                    // Check Assignment Status if exists
                    if (foundModule.assignments && foundModule.assignments.length > 0 && user?.role === 'student') {
                        try {
                            const completedIds: string[] = [];
                            await Promise.all(foundModule.assignments.map(async (assign: any) => {
                                const assignId = typeof assign === 'object' ? assign._id : assign;
                                try {
                                    await axios.get(`/api/submissions/assignment/${assignId}/student/${user._id}`);
                                    completedIds.push(assignId);
                                } catch (err) {
                                    // Not submitted or error
                                }
                            }));

                            setCompletedAssignmentIds(completedIds);

                            // Check if all are completed (if blocking is true, usually strict check)
                            // Basically checks if every assignment in the module is in the completedIds list
                            const allDone = foundModule.assignments.every((a: any) => {
                                const aId = typeof a === 'object' ? a._id : a;
                                return completedIds.includes(aId);
                            });
                            setAllBlockingAssignmentsCompleted(allDone);

                        } catch (err) {
                            console.error("Error in assignment check:", err);
                        }
                    } else {
                        setAllBlockingAssignmentsCompleted(true); // No assignments = auto complete
                    }

                } else {
                    setError('Module not found');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load module details');
            } finally {
                setLoading(false);
            }
        };

        if (courseId && moduleId && user) {
            fetchModule();
        }
    }, [courseId, moduleId, user]);

    if (loading) return <LoadingSpinner />; // Or separate loading for assignment? Better global loading for now.
    if (error || !module) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
                    <p className="text-gray-600 mb-4">{error || 'Module not found'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-600 hover:text-blue-800 flex items-center justify-center font-medium"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="mb-4 text-gray-500 hover:text-gray-700 flex items-center transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Course
                </button>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{module.title}</h1>
                        <p className="text-lg text-gray-600">{module.description}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                        {module.duration && (
                            <span className="flex items-center">
                                <ClockIcon className="w-4 h-4 mr-1.5" />
                                {module.duration}
                            </span>
                        )}
                        <span className="flex items-center">
                            <BookOpenIcon className="w-4 h-4 mr-1.5" />
                            {module.materials?.length || 0} materials
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content (Markdown) */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Module Content</h2>
                        </div>
                        <div className="p-6">
                            {module.markdownContent ? (
                                <div className="prose max-w-none prose-blue">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeRaw, rehypeKatex]}
                                        components={{
                                            pre: ({ children }) => <>{children}</>,
                                            a: ({ children, href }) => {
                                                const getYoutubeId = (url: string | undefined) => {
                                                    if (!url) return null;
                                                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                                                    const match = url.match(regExp);
                                                    return (match && match[2].length === 11) ? match[2] : null;
                                                };

                                                const youtubeId = getYoutubeId(href);

                                                if (youtubeId) {
                                                    return (
                                                        <div className="my-4 relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-black">
                                                            <iframe
                                                                className="absolute top-0 left-0 w-full h-full"
                                                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                                                title="YouTube video player"
                                                                frameBorder="0"
                                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                allowFullScreen
                                                            ></iframe>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <a
                                                        href={href || '#'}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        {children}
                                                    </a>
                                                );
                                            },
                                            img: ({ src, alt }) => (
                                                <img src={src} alt={alt} className="max-w-full h-auto rounded shadow-sm my-4 border border-gray-100" />
                                            ),
                                            code({ inline, className, children, ...props }: any) {
                                                const match = /language-(\w+)/.exec(className || '');
                                                const lang = match ? match[1] : '';

                                                if (!inline && lang === 'mermaid') {
                                                    return (
                                                        <div className="flex justify-center my-4 bg-white p-4 rounded-lg border border-gray-100 shadow-sm overflow-x-auto">
                                                            <Mermaid chart={String(children).replace(/\n$/, '')} />
                                                        </div>
                                                    );
                                                }

                                                return !inline && match ? (
                                                    <div className="rounded-md overflow-hidden bg-white my-4 border border-gray-100">
                                                        <SyntaxHighlighter
                                                            style={atomOneLight}
                                                            language={lang}
                                                            PreTag="div"
                                                            customStyle={{ background: 'transparent', margin: 0, padding: '1rem' }}
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    </div>
                                                ) : (
                                                    <code className={className} {...props}>
                                                        {children}
                                                    </code>
                                                );
                                            }
                                        }}
                                    >
                                        {module.markdownContent}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic text-center py-8">
                                    No written content for this module.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar (Materials) */}

                <div className="lg:col-span-1 space-y-6">
                    {/* Assignments List */}
                    {module.assignments && module.assignments.length > 0 && user && (
                        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                                    <DocumentIcon className="w-5 h-5" />
                                    Assignments
                                </h2>
                                {allBlockingAssignmentsCompleted ? (
                                    <span className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-wide">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></div>
                                        All Complete
                                    </span>
                                ) : (
                                    <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 uppercase tracking-wide">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></div>
                                        Pending
                                    </span>
                                )}
                            </div>
                            <div className="p-4 space-y-3">
                                {module.assignments.map((assign: any, idx) => {
                                    const assignId = assign._id || assign;
                                    const isCompleted = completedAssignmentIds.includes(assignId);

                                    return (
                                        <div key={idx} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-medium text-gray-900 text-sm">
                                                    {assign.title || 'Assignment'}
                                                </h3>
                                                {isCompleted ? (
                                                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded border border-green-100">Done</span>
                                                ) : (
                                                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-100">To Do</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-3">
                                                Due: {assign.dueDate ? new Date(assign.dueDate).toLocaleDateString() : 'No Due Date'}
                                            </p>
                                            <button
                                                onClick={() => navigate(`/assignments/${assignId}`)}
                                                className={`w-full btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-primary'} text-xs justify-center`}
                                            >
                                                {isCompleted ? 'View Submission' : 'Start Assignment'}
                                            </button>
                                        </div>
                                    );
                                })}

                                <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
                                    {(module as any).isAssignmentBlocking
                                        ? "Complete all assignments to unlock the next module."
                                        : "Assignments are recommended but not required."}
                                </div>
                            </div>
                        </div>
                    )}



                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-6">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-900">Materials</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {module.materials && module.materials.length > 0 ? (
                                module.materials.map((material, idx) => (
                                    <div
                                        key={idx}
                                        className="group p-3 rounded-lg border border-gray-100 hover:border-blue-100 hover:bg-blue-50/50 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1.5 bg-white rounded-md shadow-sm text-blue-600 group-hover:text-blue-700">
                                                {material.type === 'video' ? <VideoCameraIcon className="w-5 h-5" /> :
                                                    material.type === 'link' ? <LinkIcon className="w-5 h-5" /> :
                                                        <DocumentIcon className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-700">
                                                    {material.title}
                                                </h4>
                                                <p className="text-xs text-gray-500 capitalize mb-2">{material.type}</p>

                                                <a
                                                    href={material.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    <EyeIcon className="w-3 h-3 mr-1" />
                                                    View Material
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">
                                    No materials attached.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Navigation Buttons for Next Module */}
                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        {nextModuleId ? (
                            <button
                                onClick={() => {
                                    if (!allBlockingAssignmentsCompleted && (module.assignments?.length || 0) > 0 && module.isAssignmentBlocking) {
                                        // Optional: Shake effect or toast explanation
                                        return;
                                    }
                                    navigate(`/courses/${courseId}/modules/${nextModuleId}`);
                                    window.scrollTo(0, 0);
                                }}
                                disabled={!allBlockingAssignmentsCompleted && (module.assignments?.length || 0) > 0 && module.isAssignmentBlocking}
                                className={`flex items-center transition-colors text-sm font-medium ${!allBlockingAssignmentsCompleted && (module.assignments?.length || 0) > 0 && module.isAssignmentBlocking
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                title={
                                    !allBlockingAssignmentsCompleted && (module.assignments?.length || 0) > 0 && module.isAssignmentBlocking
                                        ? 'Complete all assignments to proceed'
                                        : 'Next Module'
                                }
                            >
                                Next Module
                                <ArrowRightIcon className="ml-2 h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : isLastModule ? (
                            <div className="text-sm font-medium text-green-600 flex items-center">
                                <span className="mr-2">🎉</span>
                                You have completed this module
                            </div>
                        ) : null}
                    </div>
                </div>


            </div>

        </div>

    );
};

export default ModulePreview;
