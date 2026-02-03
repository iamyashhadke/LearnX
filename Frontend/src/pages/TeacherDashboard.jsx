import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function TeacherDashboard() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState({
        totalStudents: 0,
        averageClassScore: 0,
        levelDistribution: [],
        recentActivity: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);

        // Real-time listener for students
        const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
        const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
            const students = [];
            const levels = { beginner: 0, intermediate: 0, advanced: 0, unassessed: 0 };

            snapshot.forEach(doc => {
                const data = doc.data();
                students.push(data);
                const level = data.level || 'unassessed';
                levels[level] = (levels[level] || 0) + 1;
            });

            const levelData = Object.keys(levels).map(key => ({
                name: key.charAt(0).toUpperCase() + key.slice(1),
                value: levels[key]
            }));

            setStats(prev => ({
                ...prev,
                totalStudents: students.length,
                levelDistribution: levelData
            }));
        });

        // Real-time listener for tests (activity)
        const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
            const tests = [];
            let totalScore = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                tests.push(data);
                totalScore += data.score;
            });

            const averageClassScore = tests.length > 0 ? Math.round(totalScore / tests.length) : 0;

            setStats(prev => ({
                ...prev,
                averageClassScore,
                recentActivity: tests.slice(0, 5) // Last 5 tests
            }));

            setLoading(false);
        });

        return () => {
            unsubscribeStudents();
            unsubscribeTests();
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

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Teacher Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Class Performance Analytics</p>
                </div>
                <button onClick={handleLogout} className="btn btn-outline">
                    Logout
                </button>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>Loading analytics...</div>
            ) : (
                <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    
                    {/* Key Metrics */}
                    <div className="card">
                        <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>{stats.totalStudents}</div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Total Students</div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-secondary)' }}>{stats.averageClassScore}%</div>
                                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Avg. Class Score</div>
                            </div>
                        </div>
                    </div>

                    {/* Student Distribution Chart */}
                    <div className="card">
                        <h3 style={{ marginBottom: '1rem' }}>Student Level Distribution</h3>
                        <div style={{ height: '250px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.levelDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.levelDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Recent Activity</h3>
                        {stats.recentActivity.length > 0 ? (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ padding: '1rem' }}>Test Type</th>
                                            <th style={{ padding: '1rem' }}>Score</th>
                                            <th style={{ padding: '1rem' }}>Level</th>
                                            <th style={{ padding: '1rem' }}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentActivity.map((test, index) => (
                                            <tr key={index} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{test.testType}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ 
                                                        fontWeight: 'bold',
                                                        color: test.score >= 80 ? 'var(--color-success)' : test.score >= 60 ? 'var(--color-warning)' : 'var(--color-error)'
                                                    }}>
                                                        {test.score}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', textTransform: 'capitalize' }}>{test.levelEvaluated || 'N/A'}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    {test.createdAt?.toDate ? test.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: '2rem' }}>No recent activity found.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeacherDashboard;
