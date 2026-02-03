import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthContext';

function StudentLearning() {
    const { userData } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/login');
        } catch (error) {
            alert('Failed to logout: ' + error.message);
        }
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard/student');
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Learning Area</h1>
                <div>
                    <button
                        onClick={handleBackToDashboard}
                        style={{ padding: '10px 20px', cursor: 'pointer', marginRight: '10px' }}
                    >
                        Back to Dashboard
                    </button>
                    <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ fontSize: '18px', margin: '0' }}>
                    Personalized lessons will appear here
                </p>
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                <p style={{ margin: '0', color: '#666' }}>
                    Welcome, {userData?.fullName}! Your AI-powered learning content will be displayed here.
                </p>
            </div>
        </div>
    );
}

export default StudentLearning;
