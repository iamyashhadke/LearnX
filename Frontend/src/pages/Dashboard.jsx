import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            alert('Failed to logout: ' + error.message);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Student Dashboard</h1>
                <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                    Logout
                </button>
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>Welcome!</h3>
                <p>Email: {currentUser?.email}</p>
                <p>User ID: {currentUser?.uid}</p>
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                <h3>Coming Soon</h3>
                <ul>
                    <li>Student Progress Tracking</li>
                    <li>AI-Powered Quizzes</li>
                    <li>Personalized Learning Paths</li>
                    <li>Performance Analytics</li>
                </ul>
            </div>
        </div>
    );
}

export default Dashboard;
