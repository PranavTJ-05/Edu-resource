import BackButton from '../Common/BackButton';
import AssignmentForm from './AssignmentForm';

const CreateAssignment = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Assignment</h1>
          <p className="mt-2 text-gray-600">
            Create a new assignment for your students
          </p>
        </div>
      </div>

      <AssignmentForm />
    </div>
  );
};

export default CreateAssignment;
