import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

function TeacherDashboard() {
    const { currentUser, userData } = useAuth();
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
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Teacher Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Manage your classes and students</p>
                </div>
                <button onClick={handleLogout} className="btn btn-outline">
                    Logout
                </button>
            </header>

            <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {/* Profile Card */}
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Instructor Profile</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ 
                            width: '64px', 
                            height: '64px', 
                            borderRadius: '50%', 
                            background: 'var(--color-primary)', 
                            color: 'white', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontSize: '1.5rem',
                            fontWeight: 'bold'
                        }}>
                            {userData?.fullName?.charAt(0) || 'T'}
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: 'var(--text-lg)' }}>{userData?.fullName || 'Teacher'}</div>
                            <div style={{ color: 'var(--color-text-muted)' }}>{currentUser?.email}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ 
                            background: 'rgba(5, 150, 105, 0.1)', 
                            color: 'var(--color-secondary)', 
                            padding: '0.25rem 0.75rem', 
                            borderRadius: 'var(--radius-full)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: '600'
                        }}>
                            {userData?.role?.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Features Card */}
                <div className="card">
                    <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Upcoming Features</h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {[
                            'Create & Manage Quizzes',
                            'Student Performance Analytics',
                            'AI-Powered Content Generation',
                            'Class Management'
                        ].map((feature, index) => (
                            <li key={index} style={{ 
                                padding: '0.75rem 0', 
                                borderBottom: index !== 3 ? '1px solid var(--color-border)' : 'none',
                                color: 'var(--color-text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <span style={{ color: 'var(--color-primary)' }}>•</span> {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default TeacherDashboard;
