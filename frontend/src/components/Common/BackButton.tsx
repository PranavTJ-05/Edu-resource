import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getBackPath } from '../../utils/navigationUtils';

const BackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const backPath = getBackPath(location.pathname);

    if (!backPath) return null;

    return (
        <button
            type="button"
            onClick={() => navigate(backPath)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Go Back"
        >
            <ArrowLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
    );
};

export default BackButton;
