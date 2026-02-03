import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { getStudentProgress, updateLessonStatus, saveTestAttempt } from '../utils/firestoreService';
import { generateLessonTest } from '../utils/gemini';

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
                setError('No learning path found. Please take the mock test first.');
                setLoading(false);
                return;
            }

            setProgress(progressData);
            setLoading(false);
        } catch (err) {
            console.error('Error loading progress:', err);
            setError('Failed to load learning path');
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
                subject: "Python",
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

    if (error && !progress) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <div className="card">
                    <h2 style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>No Learning Path Found</h2>
                    <p style={{ marginBottom: '1.5rem' }}>{error}</p>
                    <button onClick={() => navigate('/student/mock-test')} className="btn btn-primary">
                        Take Mock Test
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
                    <h1 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>Python Learning Path</h1>
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
                                        border: lesson.completed ? '2px solid #4caf50' : '1px solid var(--color-border)',
                                        position: 'relative'
                                    }}
                                >
                                    {isLocked && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            right: '1rem',
                                            background: '#ff9800',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            🔒 LOCKED
                                        </div>
                                    )}

                                    {lesson.completed && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '1rem',
                                            right: '1rem',
                                            background: '#4caf50',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            ✓ COMPLETED
                                        </div>
                                    )}

                                    <h4 style={{ marginBottom: '0.5rem', paddingRight: '6rem' }}>
                                        Lesson {index + 1}: {lesson.title}
                                    </h4>
                                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                                        {lesson.description}
                                    </p>

                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                        <span style={{ color: lesson.contentViewed ? '#4caf50' : '#666' }}>
                                            {lesson.contentViewed ? '✓' : '○'} Content Viewed
                                        </span>
                                        <span style={{ color: '#ddd' }}>|</span>
                                        <span style={{ color: lesson.testPassed ? '#4caf50' : '#666' }}>
                                            {lesson.testPassed ? '✓' : '○'} Test Passed
                                            {lesson.testScore !== null && ` (${lesson.testScore}%)`}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleViewLesson(lesson)}
                                            disabled={isLocked}
                                            className="btn btn-secondary"
                                            style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                                        >
                                            {lesson.contentViewed ? 'Review Content' : 'View Content'}
                                        </button>

                                        <button
                                            onClick={() => handleStartLessonTest(lesson)}
                                            disabled={isLocked || !lesson.contentViewed || generatingTest}
                                            className="btn btn-primary"
                                            style={{ cursor: (isLocked || !lesson.contentViewed || generatingTest) ? 'not-allowed' : 'pointer' }}
                                        >
                                            {generatingTest ? 'Generating...' : lesson.testPassed ? 'Retake Test' : 'Take Test'}
                                        </button>
                                    </div>

                                    {isAccessible && !lesson.contentViewed && (
                                        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#ff9800' }}>
                                            ⚠️ View the lesson content to unlock the test
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Level Completion Section */}
                    {progress.lessons.every(l => l.completed) && (
                        <div className="card" style={{
                            marginTop: '2rem',
                            background: 'linear-gradient(to right, rgba(37, 99, 235, 0.1), rgba(168, 85, 247, 0.1))',
                            border: '1px solid var(--color-primary)',
                            textAlign: 'center',
                            padding: '2rem'
                        }}>
                            <h2 style={{ color: 'var(--color-primary)', marginBottom: '1rem' }}>🎉 Level Completed!</h2>
                            <p style={{ fontSize: '1.2rem', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                                You have successfully completed all lessons in the <strong>{progress.currentLevel.toUpperCase()}</strong> level.
                                It's time to take the next step!
                            </p>
                            <button
                                onClick={() => navigate('/student/mock-test')}
                                className="btn btn-primary"
                                style={{ fontSize: '1.1rem', padding: '0.75rem 2rem' }}
                            >
                                Take Level Advancement Test
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Lesson Content View */}
            {viewingContent && selectedLesson && (
                <div>
                    <button onClick={handleBackToLessons} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                        ← Back to Lessons
                    </button>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1rem' }}>{selectedLesson.title}</h2>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                            {selectedLesson.description}
                        </p>

                        <div style={{
                            background: '#f5f5f5',
                            padding: '1.5rem',
                            borderRadius: '8px',
                            lineHeight: '1.8',
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'monospace'
                        }}>
                            {selectedLesson.content}
                        </div>

                        {!selectedLesson.contentViewed && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <button onClick={handleContentViewed} className="btn btn-primary">
                                    Mark as Viewed & Unlock Test
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lesson Test View */}
            {takingTest && !testSubmitted && (
                <div>
                    <button onClick={handleBackToLessons} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                        ← Back to Lessons
                    </button>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ marginBottom: '0.5rem' }}>Test: {selectedLesson.title}</h2>
                        <p style={{ color: 'var(--color-text-secondary)' }}>
                            Pass with ≥80% to complete this lesson. Questions: {Object.keys(selectedAnswers).length}/5 answered
                        </p>
                    </div>

                    {testQuestions.map((q, index) => (
                        <div key={q.id} className="card" style={{ marginBottom: '1rem' }}>
                            <h4 style={{ marginBottom: '0.75rem' }}>Question {index + 1}</h4>
                            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{q.question}</p>

                            {q.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ marginBottom: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            value={option}
                                            checked={selectedAnswers[q.id] === option}
                                            onChange={() => handleAnswerSelect(q.id, option)}
                                            style={{ marginRight: '0.75rem' }}
                                        />
                                        <span>{option}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    ))}

                    <button
                        onClick={handleSubmitLessonTest}
                        disabled={Object.keys(selectedAnswers).length !== 5}
                        className="btn btn-primary"
                        style={{ cursor: Object.keys(selectedAnswers).length !== 5 ? 'not-allowed' : 'pointer' }}
                    >
                        Submit Test
                    </button>
                </div>
            )}

            {/* Test Results View */}
            {testSubmitted && testResult && (
                <div>
                    <button onClick={handleBackToLessons} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
                        ← Back to Lessons
                    </button>

                    <div className="card" style={{
                        marginBottom: '1.5rem',
                        background: testResult.passed ? 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)' : 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
                        color: 'white'
                    }}>
                        <h2 style={{ color: 'white', marginBottom: '1rem' }}>
                            {testResult.passed ? '🎉 Test Passed!' : '😔 Test Not Passed'}
                        </h2>
                        <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                            {testResult.score}%
                        </div>
                        <p>{testResult.correctCount}/5 correct answers</p>
                        {testResult.passed && (
                            <p style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                ✓ Lesson completed! You can now proceed to the next lesson.
                            </p>
                        )}
                        {!testResult.passed && (
                            <p style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '6px' }}>
                                You need at least 80% to pass. Review the content and try again.
                            </p>
                        )}
                    </div>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Review Answers</h3>
                        {testQuestions.map((q, index) => (
                            <div
                                key={q.id}
                                style={{
                                    background: q.isCorrect ? '#e8f5e9' : '#ffebee',
                                    padding: '1rem',
                                    borderRadius: '6px',
                                    marginBottom: '0.75rem'
                                }}
                            >
                                <h4 style={{ marginBottom: '0.5rem' }}>Question {index + 1}</h4>
                                <p style={{ marginBottom: '0.5rem' }}>{q.question}</p>
                                <p><strong>Your Answer:</strong> {q.studentAnswer}</p>
                                {!q.isCorrect && <p><strong>Correct:</strong> {q.correctAnswer}</p>}
                                <p style={{ fontWeight: 'bold', color: q.isCorrect ? '#2e7d32' : '#c62828' }}>
                                    {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </p>
                            </div>
                        ))}
                    </div>

                    {!testResult.passed && (
                        <button onClick={handleRetakeTest} className="btn btn-primary">
                            Retake Test
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

export default StudentLearning;

