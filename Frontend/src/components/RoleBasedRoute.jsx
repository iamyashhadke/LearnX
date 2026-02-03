import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function RoleBasedRoute({ children, allowedRole }) {
    const { currentUser, userData } = useAuth();

    // Check if user is authenticated
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Check if user data is loaded
    if (!userData) {
        return <div style={{ padding: '20px' }}>Loading user data...</div>;
    }

    // Check if user has the required role
    if (userData.role !== allowedRole) {
        // Redirect to their correct dashboard
        if (userData.role === 'student') {
            return <Navigate to="/dashboard/student" replace />;
        } else if (userData.role === 'teacher') {
            return <Navigate to="/dashboard/teacher" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default RoleBasedRoute;
