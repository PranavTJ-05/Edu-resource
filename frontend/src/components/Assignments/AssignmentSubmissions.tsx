import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDateTime } from '../../utils/dateUtils';
import type { Submission, Assignment } from '../../types';



interface SubmissionsData {
  assignment: Assignment;
  submissions: Submission[];
  totalSubmissions: number;
}

const AssignmentSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submissionsData, setSubmissionsData] = useState<SubmissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  const fetchSubmissions = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/api/submissions/assignment/${id}`);
      setSubmissionsData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (status) {
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800`;

      case 'late':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };



  if (loading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { assignment, submissions, totalSubmissions } = submissionsData || {};

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assignment Submissions</h1>
          {assignment && (
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">{assignment.title}</span>
              {assignment.dueDate && (
                <span className="ml-4">Due: {formatDateTime(assignment.dueDate)}</span>
              )}
              <span className="ml-4">Total Points: {assignment.totalPoints}</span>
            </div>
          )}
        </div>
        <button 
          className="btn btn-secondary" 
          onClick={() => navigate(-1)}
        >
          Back
        </button>
      </div>

      {/* Stats */}
      {totalSubmissions !== undefined && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total Submissions: <span className="font-medium text-gray-900">{totalSubmissions}</span></span>

            <span>Pending: <span className="font-medium text-gray-900">
              {submissions?.filter(s => s.status === 'submitted').length || 0}
            </span></span>
          </div>
        </div>
      )}

      {/* Submissions */}
      {!submissions || submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-500">Students haven't submitted any work for this assignment yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map(submission => (
            <div key={submission._id} className="bg-white rounded-lg shadow-sm border">
              <div className="p-6">
                {/* Student Info & Status */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {submission.student?.firstName} {submission.student?.lastName}
                    </h2>
                    <p className="text-sm text-gray-600">{submission.student?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={getStatusBadge(submission.status)}>
                      {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                    </span>
                    {submission.isLate && (
                      <div className="mt-1">
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                          Late Submission
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submission Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Submitted:</span>
                    <div className="text-sm text-gray-900">
                      {formatDateTime(submission.submittedAt)}
                    </div>
                  </div>
                  

                </div>

                {/* Submission Content */}
                {submission.submissionText && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Text Submission:</span>
                    <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-900 whitespace-pre-wrap">
                      {submission.submissionText}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {(submission.attachments?.length ?? 0) > 0 && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Attachments:</span>
                    <div className="space-y-1">
                      {submission.attachments?.map((file, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm">
                          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <a 
                            href={`/api/submissions/download/${file.filename}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {file.originalName}
                          </a>
                          <span className="text-gray-400">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback */}
                {submission.feedback && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 block mb-2">Feedback:</span>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-gray-900">
                      {submission.feedback}
                    </div>
                  </div>
                )}


              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmissions;