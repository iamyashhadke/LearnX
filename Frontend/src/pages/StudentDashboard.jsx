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

    const startDiagnosticTest = () => {
        navigate('/student/test?type=diagnostic');
    };

    const startLearning = () => {
        navigate('/student/learning');
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Student Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Welcome back, {userData?.fullName || 'Student'}!</p>
                </div>
                <button onClick={handleLogout} className="btn btn-outline">
                    Logout
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>Loading dashboard...</div>
            ) : (
                <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    
                    {/* Profile Summary Card */}
                    <div className="card">
                        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Profile Summary</h3>
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Full Name</span>
                                <div style={{ fontWeight: '500' }}>{userData?.fullName}</div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Current Level</span>
                                <div style={{ fontWeight: '500', color: stats.level ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
                                    {stats.level || 'Not Assessed'}
                                </div>
                            </div>
                            <div>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>Email</span>
                                <div style={{ fontWeight: '500' }}>{currentUser?.email}</div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Stats Card */}
                    <div className="card">
                        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Performance Stats</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-primary)' }}>{stats.totalTests}</div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tests Taken</div>
                            </div>
                            <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-secondary)' }}>{stats.averageScore !== null ? `${stats.averageScore}%` : '-'}</div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Score</div>
                            </div>
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Recommended Actions</h3>
                        
                        {!stats.diagnosticCompleted ? (
                            <div style={{ 
                                background: 'linear-gradient(to right, rgba(37, 99, 235, 0.1), rgba(5, 150, 105, 0.1))', 
                                padding: '1.5rem', 
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Start Your Journey</h4>
                                <p style={{ marginBottom: '1rem' }}>Take the diagnostic test to determine your current knowledge level and get a personalized learning path.</p>
                                <button onClick={startDiagnosticTest} className="btn btn-primary">
                                    Start Diagnostic Test
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button onClick={startLearning} className="btn btn-primary">
                                    Continue Learning
                                </button>
                                <button onClick={() => navigate('/student/test')} className="btn btn-secondary">
                                    Take Practice Test
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentDashboard;
