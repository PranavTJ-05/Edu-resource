import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../Common/LoadingSpinner';
import { formatDateTime } from '../../utils/dateUtils';
import type { Submission, Assignment } from '../../types';
import BackButton from '../Common/BackButton';



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
        <div className="flex items-start">
          <BackButton />
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
        </div>
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

      {/* Submissions Table */}
      {!submissions || submissions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
          <p className="text-gray-500">Students haven't submitted any work for this assignment yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {submissions.map((submission) => (
                  <tr key={submission._id} className="hover:bg-gray-50 transition-colors">
                    {/* User Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {submission.student?.profileImage ? (
                            <img className="h-10 w-10 rounded-full object-cover" src={submission.student.profileImage} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                              {submission.student?.firstName?.[0]}{submission.student?.lastName?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.student?.firstName} {submission.student?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.student?.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full w-fit ${submission.status === 'graded' ? 'bg-green-100 text-green-800' :
                          submission.status === 'submitted' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                          {submission.status === 'submitted' ? 'Submitted' :
                            submission.status === 'graded' ? 'Graded' : submission.status}
                        </span>
                        {submission.isLate && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 w-fit">
                            Late
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Joined/Submitted Date Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(submission.submittedAt)}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        {/* View / Download Attachments Link - simplified */}
                        {(submission.attachments?.length ?? 0) > 0 && (
                          <a
                            href={`/api${submission.attachments![0].path}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-900 font-medium transition-colors"
                          >
                            View File
                          </a>
                        )}
                        <button
                          onClick={() => {/* Trigger grade modal or navigate to grade page - leaving as mocked action for now matching request */ }}
                          className="text-red-600 hover:text-red-900 font-medium transition-colors"
                        >
                          Grant Marks
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                          onClick={() => {/* Details view logic */ }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentSubmissions;