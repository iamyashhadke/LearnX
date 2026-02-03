import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

function StudentDashboard() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        level: null,
        diagnosticCompleted: false,
        totalTests: 0,
        lastTestScore: null,
        averageScore: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (currentUser) {
            fetchStudentStats();
        }
    }, [currentUser]);

    const fetchStudentStats = async () => {
        try {
            setLoading(true);

            // Fetch user profile data
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            let level = null;
            let diagnosticCompleted = false;

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                level = data.level || null;
                diagnosticCompleted = data.diagnosticCompleted || false;
            }

            // Fetch test data
            const testsQuery = query(
                collection(db, 'tests'),
                where('userId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );

            const testsSnapshot = await getDocs(testsQuery);
            const tests = [];

            testsSnapshot.forEach((doc) => {
                tests.push(doc.data());
            });

            const totalTests = tests.length;
            const lastTestScore = tests.length > 0 ? tests[0].score : null;

            let averageScore = null;
            if (tests.length > 0) {
                const totalScore = tests.reduce((sum, test) => sum + test.score, 0);
                averageScore = Math.round(totalScore / tests.length);
            }

            setStats({
                level,
                diagnosticCompleted,
                totalTests,
                lastTestScore,
                averageScore
            });

            setLoading(false);
        } catch (error) {
            console.error('Error fetching student stats:', error);
            setLoading(false);
        }
    };

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
                <h3>Welcome, {userData?.fullName || 'Student'}!</h3>
                <p><strong>Full Name:</strong> {userData?.fullName}</p>
                <p><strong>Role:</strong> {userData?.role}</p>
                <p><strong>Email:</strong> {currentUser?.email}</p>
            </div>

            {loading ? (
                <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <p>Loading statistics...</p>
                </div>
            ) : (
                <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3>Learning Progress</h3>
                    <div style={{ marginTop: '15px' }}>
                        <p>
                            <strong>Current Level:</strong>{' '}
                            {stats.level ? (
                                <span style={{
                                    textTransform: 'capitalize',
                                    color: stats.level === 'advanced' ? '#2e7d32' : stats.level === 'intermediate' ? '#f57c00' : '#1976d2',
                                    fontWeight: 'bold'
                                }}>
                                    {stats.level}
                                </span>
                            ) : (
                                'Not yet determined'
                            )}
                        </p>
                        <p>
                            <strong>Diagnostic Test:</strong>{' '}
                            {stats.diagnosticCompleted ? (
                                <span style={{ color: '#2e7d32' }}>✓ Completed</span>
                            ) : (
                                <span style={{ color: '#d32f2f' }}>Not completed</span>
                            )}
                        </p>
                        <p><strong>Total Tests Taken:</strong> {stats.totalTests}</p>
                        {stats.lastTestScore !== null && (
                            <p><strong>Last Test Score:</strong> {stats.lastTestScore}%</p>
                        )}
                        {stats.averageScore !== null && (
                            <p><strong>Average Score:</strong> {stats.averageScore}%</p>
                        )}
                    </div>
                </div>
            )}

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h3>Quick Access</h3>
                <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                    <button
                        onClick={() => navigate('/student/learning')}
                        style={{
                            padding: '12px 24px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            backgroundColor: '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px'
                        }}
                    >
                        Learning
                    </button>
                    <button
                        onClick={() => navigate('/student/test')}
                        style={{
                            padding: '12px 24px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            backgroundColor: '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px'
                        }}
                    >
                        Test
                    </button>
                </div>
            </div>

            <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                <h3>Coming Soon</h3>
                <ul>
                    <li>Adaptive Learning Content</li>
                    <li>Personalized Lesson Recommendations</li>
                    <li>Detailed Performance Analytics</li>
                    <li>Learning Streaks & Achievements</li>
                </ul>
            </div>
        </div>
    );
}

export default StudentDashboard;
