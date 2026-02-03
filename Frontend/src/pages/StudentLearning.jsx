import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { getStudentProgress, updateLessonStatus, saveTestAttempt } from '../utils/firestoreService';
import { generateLessonTest, generateLearningPath } from '../utils/gemini';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function StudentLearning() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(null);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [viewingContent, setViewingContent] = useState(false);
    const [takingTest, setTakingTest] = useState(false);
    const [testQuestions, setTestQuestions] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [testSubmitted, setTestSubmitted] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [generatingTest, setGeneratingTest] = useState(false);
    const [generatingPath, setGeneratingPath] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            loadProgress();
        }
    }, [currentUser]);

    const loadProgress = async () => {
        try {
            setLoading(true);
            const progressData = await getStudentProgress(currentUser.uid);

            if (!progressData || !progressData.lessons || progressData.lessons.length === 0) {
                // Keep progress null to trigger "Generate Learning Path" view
                setProgress(null);
            } else {
                setProgress(progressData);
            }
            setLoading(false);
        } catch (err) {
            console.error('Error loading progress:', err);
            setError('Failed to load learning path');
            setLoading(false);
        }
    };

    const handleGeneratePath = async () => {
        try {
            setGeneratingPath(true);
            setError('');

            // Fetch user profile for level and weak areas
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            let level = 'beginner';
            let weakAreas = [];

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                level = data.level || 'beginner';
                weakAreas = data.weakAreas || [];
            }

            // Generate path using Gemini
            const pathData = await generateLearningPath(level, weakAreas);

            // Save to Firestore
            const learningPathData = {
                userId: currentUser.uid,
                currentLevel: level,
                subject: pathData.subject,
                lessons: pathData.lessons.map(lesson => ({
                    ...lesson,
                    completed: false,
                    contentViewed: false,
                    testPassed: false,
                    testScore: null
                })),
                progressPercentage: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Save to Firestore under users collection
            await setDoc(doc(db, 'users', currentUser.uid, 'student_progress', 'main'), learningPathData);
            
            // Reload progress
            await loadProgress();
            setGeneratingPath(false);
        } catch (err) {
            console.error('Error generating learning path:', err);
            setError('Failed to generate learning path. Please try again.');
            setGeneratingPath(false);
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

    const handleBackToDashboard = () => {
        navigate('/dashboard/student');
    };

    const handleViewLesson = (lesson) => {
        setSelectedLesson(lesson);
        setViewingContent(true);
        setTakingTest(false);
        setTestSubmitted(false);
        setTestResult(null);
    };

    const handleContentViewed = async () => {
        try {
            // Mark content as viewed
            await updateLessonStatus(currentUser.uid, selectedLesson.lessonId, {
                contentViewed: true
            });

            // Reload progress
            await loadProgress();

            alert('Lesson content marked as viewed! You can now take the lesson test.');
            setViewingContent(false);
        } catch (err) {
            console.error('Error marking content as viewed:', err);
            alert('Failed to update progress');
        }
    };

    const handleStartLessonTest = async (lesson) => {
        try {
            setGeneratingTest(true);
            setError('');

            const testData = await generateLessonTest(
                lesson.lessonId,
                lesson.title,
                progress.currentLevel
            );

            if (testData && testData.questions && testData.questions.length === 5) {
                const formattedQuestions = testData.questions.map((q, index) => ({
                    id: index,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    studentAnswer: null,
                    isCorrect: null
                }));

                setTestQuestions(formattedQuestions);
                setSelectedAnswers({});
                setSelectedLesson(lesson);
                setTakingTest(true);
                setViewingContent(false);
                setTestSubmitted(false);
                setTestResult(null);
            } else {
                throw new Error('Invalid test data');
            }

            setGeneratingTest(false);
        } catch (err) {
            console.error('Error generating lesson test:', err);
            setError('Failed to generate test');
            setGeneratingTest(false);
        }
    };

    const handleAnswerSelect = (questionId, answer) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [questionId]: answer
        });
    };

    const handleSubmitLessonTest = async () => {
        try {
            // Evaluate questions
            const evaluatedQuestions = testQuestions.map(q => ({
                ...q,
                studentAnswer: selectedAnswers[q.id] || null,
                isCorrect: selectedAnswers[q.id] === q.correctAnswer
            }));

            const correctCount = evaluatedQuestions.filter(q => q.isCorrect).length;
            const scorePercentage = Math.round((correctCount / 5) * 100);
            const passed = scorePercentage >= 80;

            setTestResult({
                score: scorePercentage,
                correctCount,
                totalQuestions: 5,
                passed
            });

            setTestQuestions(evaluatedQuestions);
            setTestSubmitted(true);

            // Save test attempt
            await saveTestAttempt({
                userId: currentUser.uid,
                subject: "Python", // Or dynamic subject
                level: progress.currentLevel,
                type: "lesson",
                lessonId: selectedLesson.lessonId,
                questions: evaluatedQuestions,
                score: scorePercentage,
                correctCount,
                totalQuestions: 5
            });

            // If passed, mark lesson as complete
            if (passed) {
                await updateLessonStatus(currentUser.uid, selectedLesson.lessonId, {
                    completed: true,
                    testPassed: true,
                    testScore: scorePercentage
                });

                // Reload progress
                await loadProgress();
            } else {
                await updateLessonStatus(currentUser.uid, selectedLesson.lessonId, {
                    testPassed: false,
                    testScore: scorePercentage
                });
            }
        } catch (err) {
            console.error('Error submitting lesson test:', err);
            setError('Failed to submit test');
        }
    };

    const handleRetakeTest = () => {
        setTakingTest(false);
        setTestSubmitted(false);
        setTestResult(null);
        setTestQuestions([]);
        setSelectedAnswers({});
    };

    const handleBackToLessons = () => {
        setSelectedLesson(null);
        setViewingContent(false);
        setTakingTest(false);
        setTestSubmitted(false);
        setTestResult(null);
    };

    const canAccessLesson = (index) => {
        if (index === 0) return true; // First lesson always accessible
        return progress.lessons[index - 1]?.completed; // Can access if previous lesson is complete
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <p>Loading learning path...</p>
            </div>
        );
    }

    if (!progress) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>Start Your Learning Journey</h2>
                    <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
                        We'll analyze your profile and create a personalized learning path just for you.
                    </p>
                    
                    {error && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>}
                    
                    <button 
                        onClick={handleGeneratePath} 
                        className="btn btn-primary"
                        disabled={generatingPath}
                        style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}
                    >
                        {generatingPath ? 'Generating Path...' : 'Generate Learning Path'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>{progress.subject || 'My Learning Path'}</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Level: <strong>{progress?.currentLevel?.toUpperCase()}</strong> |
                        Progress: <strong>{progress?.progressPercentage || 0}%</strong>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleBackToDashboard} className="btn btn-outline">
                        Dashboard
                    </button>
                    <button onClick={handleLogout} className="btn btn-outline">
                        Logout
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: '#ffebee', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: '#c62828' }}>
                    {error}
                </div>
            )}

            {/* Lesson List View */}
            {!viewingContent && !takingTest && progress && (
                <div>
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Your Lessons</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            Complete each lesson by viewing the content and passing the test (≥80% score).
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {progress.lessons.map((lesson, index) => {
                            const isAccessible = canAccessLesson(index);
                            const isLocked = !isAccessible;

                            return (
                                <div
                                    key={lesson.lessonId}
                                    className="card"
                                    style={{
                                        opacity: isLocked ? 0.6 : 1,
                                        border: lesson.completed ? '2px solid var(--color-success)' : '1px solid var(--color-border)',
                                        position: 'relative',
                                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                    }}
                                >
                                    {isLocked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            right: '1rem',
                                            background: 'var(--color-warning)',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            LOCKED
                                        </div>
                                    )}

                                    {lesson.completed && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            right: '1rem',
                                            background: 'var(--color-success)',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            COMPLETED
                                        </div>
                                    )}

                                    <h3 style={{ marginBottom: '0.5rem', color: isLocked ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                                        {index + 1}. {lesson.title}
                                    </h3>
                                    <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>{lesson.description}</p>
                                    
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                        <span>⏱ {lesson.estimatedDuration}</span>
                                        <span>📊 {lesson.difficulty}</span>
                                    </div>

                                    {!isLocked && (
                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button
                                                onClick={() => handleViewLesson(lesson)}
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.875rem' }}
                                            >
                                                {lesson.contentViewed ? 'Review Content' : 'Start Lesson'}
                                            </button>
                                            
                                            {lesson.contentViewed && (
                                                <button
                                                    onClick={() => handleStartLessonTest(lesson)}
                                                    className="btn btn-primary"
                                                    style={{ fontSize: '0.875rem' }}
                                                    disabled={generatingTest}
                                                >
                                                    {lesson.completed ? 'Retake Test' : (generatingTest ? 'Generating...' : 'Take Test')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Lesson Content View */}
            {viewingContent && selectedLesson && (
                <div className="card">
                    <button onClick={handleBackToLessons} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                        ← Back to Lessons
                    </button>
                    
                    <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedLesson.title}</h2>
                    
                    <div style={{ background: 'var(--color-surface-hover)', padding: '2rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
                            {/* In a real app, this would be rich content from the database */}
                            This is the detailed learning content for <strong>{selectedLesson.title}</strong>.
                            <br /><br />
                            Here you would learn about {selectedLesson.topics.join(', ')}.
                            <br /><br />
                            <em>(Content placeholder for demonstration)</em>
                        </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleContentViewed} className="btn btn-primary">
                            Mark as Viewed & Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Test View */}
            {takingTest && (
                <div className="card">
                     <button onClick={handleBackToLessons} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                        ← Cancel Test
                    </button>

                    <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Quiz: {selectedLesson.title}</h2>

                    {!testSubmitted ? (
                        <div>
                            {testQuestions.map((q, index) => (
                                <div key={q.id} style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
                                    <p style={{ fontWeight: '600', marginBottom: '1rem' }}>{index + 1}. {q.question}</p>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        {q.options.map((option, optIndex) => (
                                            <label 
                                                key={optIndex} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    padding: '0.75rem', 
                                                    borderRadius: 'var(--radius-sm)',
                                                    background: selectedAnswers[q.id] === option ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                                    border: selectedAnswers[q.id] === option ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`question-${q.id}`}
                                                    value={option}
                                                    checked={selectedAnswers[q.id] === option}
                                                    onChange={() => handleAnswerSelect(q.id, option)}
                                                    style={{ marginRight: '10px' }}
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={handleSubmitLessonTest}
                                className="btn btn-primary"
                                disabled={Object.keys(selectedAnswers).length !== testQuestions.length}
                                style={{ width: '100%' }}
                            >
                                Submit Quiz
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                                {testResult.passed ? '🎉' : '📚'}
                            </div>
                            <h3 style={{ marginBottom: '1rem', color: testResult.passed ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                {testResult.passed ? 'Congratulations! You Passed!' : 'Keep Practicing!'}
                            </h3>
                            <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
                                Score: <strong>{testResult.score}%</strong> ({testResult.correctCount}/{testResult.totalQuestions})
                            </p>
                            
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                                <button onClick={handleBackToLessons} className="btn btn-outline">
                                    Back to Lessons
                                </button>
                                {!testResult.passed && (
                                    <button onClick={handleRetakeTest} className="btn btn-primary">
                                        Retake Test
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default StudentLearning;
