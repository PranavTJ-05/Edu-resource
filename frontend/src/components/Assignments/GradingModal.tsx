import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { Submission } from '../../types';

interface GradingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { points: number; feedback: string }) => Promise<void>;
    submission: Submission | null;
    maxPoints: number;
}

const GradingModal = ({ isOpen, onClose, onSubmit, submission, maxPoints }: GradingModalProps) => {
    const [points, setPoints] = useState<number | ''>('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && submission) {
            if (submission.grade?.points !== undefined) {
                setPoints(submission.grade.points);
            } else {
                setPoints('');
            }
            setFeedback(submission.feedback || '');
            setError('');
        }
    }, [isOpen, submission]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (points === '' || points < 0 || points > maxPoints) {
            setError(`Points must be between 0 and ${maxPoints}`);
            return;
        }

        try {
            setLoading(true);
            setError('');
            await onSubmit({ points: Number(points), feedback });
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit grade');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                        <button
                            onClick={onClose}
                            className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Grade Submission
                                    </h3>

                                    {submission && (
                                        <div className="mt-2 mb-4">
                                            <p className="text-sm text-gray-500">
                                                Student: <span className="font-medium text-gray-900">{submission.student?.firstName} {submission.student?.lastName}</span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                                                Points (Max: {maxPoints})
                                            </label>
                                            <input
                                                type="number"
                                                name="points"
                                                id="points"
                                                min="0"
                                                max={maxPoints}
                                                value={points}
                                                onChange={(e) => setPoints(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="input mt-1 block w-full"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">
                                                Feedback
                                            </label>
                                            <textarea
                                                name="feedback"
                                                id="feedback"
                                                rows={4}
                                                value={feedback}
                                                onChange={(e) => setFeedback(e.target.value)}
                                                className="input mt-1 block w-full"
                                                placeholder="Enter feedback for the student..."
                                            />
                                        </div>

                                        {error && (
                                            <div className="text-red-600 text-sm">{error}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Grade'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GradingModal;
