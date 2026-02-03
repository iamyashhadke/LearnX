import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getAllStudentsProgress, getStudentDetailsForTeacher } from '../utils/firestoreService';

function TeacherDashboard() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetails, setStudentDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            setLoading(true);
            const studentsData = await getAllStudentsProgress();
            setStudents(studentsData);
            setLoading(false);
        } catch (err) {
            console.error('Error loading students:', err);
            setLoading(false);
        }
    };

    const handleViewStudentDetails = async (studentId) => {
        try {
            setLoadingDetails(true);
            const details = await getStudentDetailsForTeacher(studentId);
            setStudentDetails(details);
            setSelectedStudent(studentId);
            setLoadingDetails(false);
        } catch (err) {
            console.error('Error loading student details:', err);
            setLoadingDetails(false);
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

    const handleBackToList = () => {
        setSelectedStudent(null);
        setStudentDetails(null);
    };

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Teacher Dashboard</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Monitor student progress and performance</p>
                </div>
                <button onClick={handleLogout} className="btn btn-outline">
                    Logout
                </button>
            </header>

            {loading ? (
                <div className="card">
                    <p>Loading students...</p>
                </div>
            ) : selectedStudent ? (
                // Student Details View
                <div>
                    <button onClick={handleBackToList} className="btn btn-outline" style={{ marginBottom: '1.5rem' }}>
                        ← Back to Students List
                    </button>

                    {loadingDetails ? (
                        <div className="card">
                            <p>Loading student details...</p>
                        </div>
                    ) : studentDetails ? (
                        <div>
                            {/* Student Info */}
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>
                                    {students.find(s => s.userId === selectedStudent)?.fullName}
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Current Level</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                                            {studentDetails.progress?.currentLevel?.toUpperCase() || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Progress</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-secondary)' }}>
                                            {studentDetails.progress?.progressPercentage || 0}%
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>Lessons Completed</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                            {studentDetails.progress?.lessons?.filter(l => l.completed).length || 0} / {studentDetails.progress?.lessons?.length || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Analytics */}
                            {studentDetails.analytics && (
                                <div className="card" style={{ marginBottom: '1.5rem' }}>
                                    <h3 style={{ marginBottom: '1rem' }}>Performance Analytics</h3>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#e8f5e9', borderRadius: '6px' }}>
                                            <span style={{ fontWeight: '600', color: '#2e7d32' }}>Easy Level Score</span>
                                            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#2e7d32' }}>
                                                {studentDetails.analytics.easyScore !== null && studentDetails.analytics.easyScore !== undefined ? `${studentDetails.analytics.easyScore}/5` : 'N/A'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fff3e0', borderRadius: '6px' }}>
                                            <span style={{ fontWeight: '600', color: '#e65100' }}>Medium Level Score</span>
                                            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#e65100' }}>
                                                {studentDetails.analytics.mediumScore !== null && studentDetails.analytics.mediumScore !== undefined ? `${studentDetails.analytics.mediumScore}/5` : 'N/A'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: '#fce4ec', borderRadius: '6px' }}>
                                            <span style={{ fontWeight: '600', color: '#c2185b' }}>Advanced Level Score</span>
                                            <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#c2185b' }}>
                                                {studentDetails.analytics.advancedScore !== null && studentDetails.analytics.advancedScore !== undefined ? `${studentDetails.analytics.advancedScore}/5` : 'N/A'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Strengths and Weaknesses */}
                                    <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <h4 style={{ marginBottom: '0.5rem', color: '#2e7d32' }}>Strengths</h4>
                                            {studentDetails.analytics.strengths && studentDetails.analytics.strengths.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                                    {studentDetails.analytics.strengths.map((strength, idx) => (
                                                        <li key={idx} style={{ color: '#2e7d32' }}>{strength}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No data yet</p>
                                            )}
                                        </div>
                                        <div>
                                            <h4 style={{ marginBottom: '0.5rem', color: '#c62828' }}>Areas for Improvement</h4>
                                            {studentDetails.analytics.weaknesses && studentDetails.analytics.weaknesses.length > 0 ? (
                                                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                                                    {studentDetails.analytics.weaknesses.map((weakness, idx) => (
                                                        <li key={idx} style={{ color: '#c62828' }}>{weakness}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No data yet</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Test History */}
                            {studentDetails.testAttempts && studentDetails.testAttempts.length > 0 && (
                                <div className="card">
                                    <h3 style={{ marginBottom: '1rem' }}>Recent Test Attempts</h3>
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {studentDetails.testAttempts.slice(0, 5).map((test, idx) => (
                                            <div key={idx} style={{
                                                padding: '0.75rem',
                                                background: 'var(--color-surface-hover)',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '600' }}>
                                                        {test.type === 'mock' ? '📝 Mock Test' : '📚 Lesson Test'}
                                                        {test.level && ` - ${test.level.toUpperCase()}`}
                                                    </div>
                                                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                                                        {test.createdAt?.toDate ? new Date(test.createdAt.toDate()).toLocaleDateString() : 'Recent'}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '1.25rem',
                                                    fontWeight: '700',
                                                    color: test.score >= 80 ? '#2e7d32' : test.score >= 60 ? '#e65100' : '#c62828'
                                                }}>
                                                    {test.score}%
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card">
                            <p>No details available</p>
                        </div>
                    )}
                </div>
            ) : (
                // Students List View
                <div>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>Students Overview</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                            Total Students: <strong>{students.length}</strong>
                        </p>
                    </div>

                    {students.length === 0 ? (
                        <div className="card">
                            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                No students enrolled yet
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {students.map((student) => (
                                <div key={student.userId} className="card" style={{ transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                                                {student.fullName}
                                            </h4>
                                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
                                                {student.email}
                                            </p>
                                            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
                                                <div>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>Level: </span>
                                                    <strong style={{ color: 'var(--color-primary)' }}>
                                                        {student.currentLevel?.toUpperCase() || 'N/A'}
                                                    </strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>Progress: </span>
                                                    <strong style={{ color: 'var(--color-secondary)' }}>
                                                        {student.progressPercentage || 0}%
                                                    </strong>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>Lessons: </span>
                                                    <strong>
                                                        {student.lessonsCompleted || 0}/{student.totalLessons || 0}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleViewStudentDetails(student.userId)}
                                            className="btn btn-primary"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TeacherDashboard;

