import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getStudentProgress, getUserTestAttempts, getStudentAnalytics } from '../utils/firestoreService';

function StudentDashboard() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        level: null,
        diagnosticCompleted: false,
        totalTests: 0,
        lastTestScore: null,
        averageScore: null,
        mockTestsTaken: 0,
        currentLevel: null,
        completedLessons: 0,
        totalLessons: 0,
        progressPercentage: 0,
        easyScore: null,
        mediumScore: null,
        advancedScore: null
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

            // Fetch student progress (new system)
            const progress = await getStudentProgress(currentUser.uid);
            const analytics = await getStudentAnalytics(currentUser.uid);
            const testAttempts = await getUserTestAttempts(currentUser.uid, "Python");

            // Fetch old test data for backward compatibility
            const testsQuery = query(
                collection(db, 'tests'),
                where('userId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );

            const testsSnapshot = await getDocs(testsQuery);
            const oldTests = [];

            testsSnapshot.forEach((doc) => {
                oldTests.push(doc.data());
            });

            // Calculate stats from new system
            const mockTests = testAttempts.filter(t => t.type === 'mock');
            const completedLessons = progress?.lessons?.filter(l => l.completed).length || 0;
            const totalLessons = progress?.lessons?.length || 0;

            // Combine old and new tests
            const allTests = [...oldTests, ...testAttempts];
            const totalTests = allTests.length;
            const lastTestScore = allTests.length > 0 ? allTests[0].score : null;

            let averageScore = null;
            if (allTests.length > 0) {
                const totalScore = allTests.reduce((sum, test) => sum + test.score, 0);
                averageScore = Math.round(totalScore / allTests.length);
            }

            setStats({
                level,
                diagnosticCompleted,
                totalTests,
                lastTestScore,
                averageScore,
                mockTestsTaken: mockTests.length,
                currentLevel: progress?.currentLevel || level,
                completedLessons,
                totalLessons,
                progressPercentage: progress?.progressPercentage || 0,
                easyScore: analytics?.easyScore,
                mediumScore: analytics?.mediumScore,
                advancedScore: analytics?.advancedScore
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

    const startMockTest = () => {
        navigate('/student/mock-test');
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

                    {/* Learning Progress Card */}
                    {stats.totalLessons > 0 && (
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Learning Progress</h3>
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Overall Progress</span>
                                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: '600', color: 'var(--color-primary)' }}>{stats.progressPercentage}%</span>
                                </div>
                                <div style={{ background: 'var(--color-surface-hover)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                    <div style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))', height: '100%', width: `${stats.progressPercentage}%`, transition: 'width 0.3s' }}></div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Completed Lessons</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-primary)' }}>{stats.completedLessons}/{stats.totalLessons}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Mock Tests</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-secondary)' }}>{stats.mockTestsTaken}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Level-wise Performance Card */}
                    {(stats.easyScore !== null || stats.mediumScore !== null || stats.advancedScore !== null) && (
                        <div className="card">
                            <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Level-wise Performance</h3>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {stats.easyScore !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#e8f5e9', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: '600', color: '#2e7d32' }}>Easy Level</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2e7d32' }}>{stats.easyScore}/5</span>
                                    </div>
                                )}
                                {stats.mediumScore !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fff3e0', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: '600', color: '#e65100' }}>Medium Level</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e65100' }}>{stats.mediumScore}/5</span>
                                    </div>
                                )}
                                {stats.advancedScore !== null && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#fce4ec', borderRadius: '6px' }}>
                                        <span style={{ fontWeight: '600', color: '#c2185b' }}>Advanced Level</span>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#c2185b' }}>{stats.advancedScore}/5</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions Card */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>

                        {stats.totalLessons === 0 ? (
                            <div style={{
                                background: 'linear-gradient(to right, rgba(37, 99, 235, 0.1), rgba(5, 150, 105, 0.1))',
                                padding: '1.5rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--color-primary)'
                            }}>
                                <h4 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Start Your Python Journey</h4>
                                <p style={{ marginBottom: '1rem' }}>Take the mock test to determine your Python proficiency level and get a personalized learning path.</p>
                                <button onClick={startMockTest} className="btn btn-primary">
                                    Take Python Mock Test
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button onClick={startLearning} className="btn btn-primary">
                                    Continue Learning Path
                                </button>
                                <button onClick={startMockTest} className="btn btn-secondary">
                                    Take New Mock Test
                                </button>
                                {!stats.diagnosticCompleted && (
                                    <button onClick={startDiagnosticTest} className="btn btn-outline">
                                        Diagnostic Test
                                    </button>
                                )}
                                <button onClick={() => navigate('/student/test')} className="btn btn-outline">
                                    Practice Test
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
