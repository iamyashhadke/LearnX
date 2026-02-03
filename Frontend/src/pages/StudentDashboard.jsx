import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function StudentDashboard() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        level: null,
        diagnosticCompleted: false,
        totalTests: 0,
        averageScore: null,
        recentTests: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);

        // Real-time listener for user profile (level, diagnostic status)
        const userUnsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats(prev => ({
                    ...prev,
                    level: data.level || null,
                    diagnosticCompleted: data.diagnosticCompleted || false
                }));
            }
        }, (error) => {
            console.error("Error listening to user profile:", error);
        });

        // Real-time listener for tests
        const testsQuery = query(
            collection(db, 'tests'),
            where('userId', '==', currentUser.uid),
            orderBy('createdAt', 'asc')
        );

        const testsUnsubscribe = onSnapshot(testsQuery, (snapshot) => {
            const tests = [];
            let totalScore = 0;

            snapshot.forEach((doc) => {
                const data = doc.data();
                tests.push({
                    ...data,
                    date: data.createdAt?.toDate().toLocaleDateString() || 'N/A'
                });
                totalScore += data.score;
            });

            const totalTests = tests.length;
            const averageScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;

            setStats(prev => ({
                ...prev,
                totalTests,
                averageScore,
                recentTests: tests
            }));
            
            setLoading(false);
        }, (error) => {
            console.error("Error listening to tests:", error);
            setLoading(false);
        });

        // Cleanup listeners on unmount
        return () => {
            userUnsubscribe();
            testsUnsubscribe();
        };

    }, [currentUser]);

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
                                <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--color-secondary)' }}>{stats.averageScore}%</div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg. Score</div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Chart */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Performance History</h3>
                        {stats.recentTests.length > 0 ? (
                            <div style={{ height: '300px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.recentTests} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                                        <XAxis dataKey="date" />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2} activeDot={{ r: 8 }} name="Score (%)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No test data available yet.</p>
                        )}
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
