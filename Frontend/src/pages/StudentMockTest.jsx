import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { generateMockTest } from '../utils/gemini';
import {
    getStudentProgress,
    initializeStudentProgress,
    updateStudentProgress,
    saveTestAttempt,
    updateMockTestAnalytics,
    getStudentAnalytics,
    initializeAnalytics
} from '../utils/firestoreService';
import { generateLearningPath } from '../utils/gemini';

function StudentMockTest() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [hasExistingProgress, setHasExistingProgress] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(null);

    const [testQuestions, setTestQuestions] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [testSubmitted, setTestSubmitted] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            checkExistingProgress();
        }
    }, [currentUser]);

    const checkExistingProgress = async () => {
        try {
            setLoading(true);
            const progress = await getStudentProgress(currentUser.uid);

            if (progress) {
                setHasExistingProgress(true);
                setCurrentLevel(progress.currentLevel);
            } else {
                setHasExistingProgress(false);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error checking progress:', err);
            setError('Failed to load progress data');
            setLoading(false);
        }
    };

    const handleGenerateTest = async () => {
        try {
            setGenerating(true);
            setError('');

            const testData = await generateMockTest();

            if (testData && testData.questions && testData.questions.length === 15) {
                // Format questions for display
                const formattedQuestions = testData.questions.map((q, index) => ({
                    id: index,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    level: q.level,
                    studentAnswer: null,
                    isCorrect: null
                }));

                setTestQuestions(formattedQuestions);
                setSelectedAnswers({});
                setTestSubmitted(false);
                setTestResult(null);
            } else {
                throw new Error('Invalid test data: Expected 15 questions');
            }

            setGenerating(false);
        } catch (err) {
            console.error('Error generating mock test:', err);
            setError('Failed to generate mock test. Please try again.');
            setGenerating(false);
        }
    };

    const handleAnswerSelect = (questionId, answer) => {
        setSelectedAnswers({
            ...selectedAnswers,
            [questionId]: answer
        });
    };

    const handleSubmitTest = async () => {
        try {
            setSubmitting(true);
            setError('');

            // Evaluate questions with student answers
            const evaluatedQuestions = testQuestions.map(q => ({
                ...q,
                studentAnswer: selectedAnswers[q.id] || null,
                isCorrect: selectedAnswers[q.id] === q.correctAnswer
            }));

            // Calculate level-wise scores
            const easyQuestions = evaluatedQuestions.filter(q => q.level === 'easy');
            const mediumQuestions = evaluatedQuestions.filter(q => q.level === 'medium');
            const advancedQuestions = evaluatedQuestions.filter(q => q.level === 'advanced');

            const easyScore = easyQuestions.filter(q => q.isCorrect).length;
            const mediumScore = mediumQuestions.filter(q => q.isCorrect).length;
            const advancedScore = advancedQuestions.filter(q => q.isCorrect).length;

            const totalCorrect = easyScore + mediumScore + advancedScore;
            const scorePercentage = Math.round((totalCorrect / 15) * 100);

            // Determine promotion level
            let promotedLevel = currentLevel || 'easy';
            const previousLevel = currentLevel;

            if (easyScore === 5) {
                promotedLevel = 'medium';
            }
            if (mediumScore === 5) {
                promotedLevel = 'advanced';
            }
            if (advancedScore < 5 && currentLevel === 'advanced') {
                promotedLevel = 'advanced';
            }

            // Show result immediately (non-blocking UI)
            setTestResult({
                score: scorePercentage,
                totalCorrect,
                easyScore,
                mediumScore,
                advancedScore,
                promotedLevel,
                previousLevel,
                isFirstTime: !hasExistingProgress
            });

            setTestQuestions(evaluatedQuestions);
            setTestSubmitted(true);

            // Background operations (parallel execution)
            Promise.all([
                // Save test attempt
                saveTestAttempt({
                    userId: currentUser.uid,
                    subject: "Python",
                    level: promotedLevel,
                    type: "mock",
                    lessonId: null,
                    questions: evaluatedQuestions.map(q => ({
                        question: q.question,
                        options: q.options,
                        correctAnswer: q.correctAnswer,
                        studentAnswer: q.studentAnswer,
                        isCorrect: q.isCorrect,
                        level: q.level
                    })),
                    score: scorePercentage,
                    easyScore,
                    mediumScore,
                    advancedScore,
                    correctCount: totalCorrect,
                    totalQuestions: 15,
                    promotedTo: promotedLevel
                }),

                // Update analytics
                updateMockTestAnalytics(
                    currentUser.uid,
                    easyScore,
                    mediumScore,
                    advancedScore,
                    promotedLevel,
                    previousLevel
                ),

                // Generate and save learning path
                (async () => {
                    const learningPath = await generateLearningPath(promotedLevel);

                    if (!hasExistingProgress) {
                        // Initialize progress for first-time users
                        await initializeStudentProgress(
                            currentUser.uid,
                            promotedLevel,
                            learningPath.lessons.map(lesson => ({
                                ...lesson,
                                level: promotedLevel,
                                completed: false,
                                contentViewed: false,
                                testPassed: false,
                                testScore: null
                            }))
                        );
                    } else {
                        // Update existing progress
                        await updateStudentProgress(currentUser.uid, {
                            currentLevel: promotedLevel,
                            lessons: learningPath.lessons.map(lesson => ({
                                ...lesson,
                                level: promotedLevel,
                                completed: false,
                                contentViewed: false,
                                testPassed: false,
                                testScore: null
                            })),
                            progressPercentage: 0
                        });
                    }
                })(),

                // Initialize analytics if first time
                (async () => {
                    const analytics = await getStudentAnalytics(currentUser.uid);
                    if (!analytics) {
                        await initializeAnalytics(currentUser.uid);
                    }
                })()
            ])
                .then(() => {
                    console.log('All background operations completed successfully');
                    setHasExistingProgress(true);
                    setCurrentLevel(promotedLevel);
                })
                .catch(err => {
                    console.error('Error in background operations:', err);
                    // Don't show error to user since results are already displayed
                });

            setSubmitting(false);
        } catch (err) {
            console.error('Error submitting test:', err);
            setError('Failed to submit test. Please try again.');
            setSubmitting(false);
        }
    };

    const handleBackToDashboard = () => {
        navigate('/dashboard/student');
    };

    const handleGoToLearning = () => {
        navigate('/student/learning');
    };

    const handleStartNewTest = () => {
        setTestQuestions([]);
        setSelectedAnswers({});
        setTestSubmitted(false);
        setTestResult(null);
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Python Mock Test</h1>
                <button onClick={handleBackToDashboard} className="btn btn-outline">
                    Back to Dashboard
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ background: '#ffebee', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', color: '#c62828' }}>
                    {error}
                </div>
            )}

            {/* Introduction */}
            {!testSubmitted && testQuestions.length === 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>
                        {hasExistingProgress ? 'Ready for Your Next Mock Test?' : 'Welcome to Your First Mock Test!'}
                    </h3>
                    {hasExistingProgress && currentLevel && (
                        <p style={{ marginBottom: '1rem' }}>
                            Current Level: <strong style={{ color: 'var(--color-primary)' }}>{currentLevel.toUpperCase()}</strong>
                        </p>
                    )}
                    <p style={{ marginBottom: '1rem' }}>
                        This adaptive mock test contains <strong>15 Python programming questions</strong>:
                    </p>
                    <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
                        <li>5 Easy questions (Python basics, syntax, variables)</li>
                        <li>5 Medium questions (OOP, data structures, modules)</li>
                        <li>5 Advanced questions (decorators, generators, async/await)</li>
                    </ul>
                    <p style={{ marginBottom: '1.5rem' }}>
                        Based on your performance, you'll be assigned a learning level and receive a personalized learning path.
                    </p>
                    <button
                        onClick={handleGenerateTest}
                        disabled={generating}
                        className="btn btn-primary"
                        style={{ cursor: generating ? 'not-allowed' : 'pointer' }}
                    >
                        {generating ? 'Generating Test...' : 'Start Mock Test'}
                    </button>
                </div>
            )}

            {/* Test Questions */}
            {testQuestions.length > 0 && !testSubmitted && (
                <div>
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h3>Mock Test in Progress</h3>
                        <p>Answer all 15 questions. Your performance will determine your learning level.</p>
                        <p>Questions answered: <strong>{Object.keys(selectedAnswers).length}/15</strong></p>
                    </div>

                    {testQuestions.map((q, index) => (
                        <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4>Question {index + 1}</h4>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '12px',
                                    background: q.level === 'easy' ? '#e8f5e9' : q.level === 'medium' ? '#fff3e0' : '#fce4ec',
                                    color: q.level === 'easy' ? '#2e7d32' : q.level === 'medium' ? '#e65100' : '#c2185b',
                                    fontSize: '0.875rem',
                                    fontWeight: '600'
                                }}>
                                    {q.level.toUpperCase()}
                                </span>
                            </div>
                            <p style={{ fontSize: '1rem', marginBottom: '1rem', lineHeight: '1.6' }}>{q.question}</p>

                            {q.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ marginBottom: '0.75rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', transition: 'background 0.2s' }}
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

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button
                            onClick={handleSubmitTest}
                            disabled={submitting || Object.keys(selectedAnswers).length !== 15}
                            className="btn btn-primary"
                            style={{ cursor: (submitting || Object.keys(selectedAnswers).length !== 15) ? 'not-allowed' : 'pointer' }}
                        >
                            {submitting ? 'Submitting...' : 'Submit Test'}
                        </button>
                        {Object.keys(selectedAnswers).length !== 15 && (
                            <p style={{ color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                                Please answer all questions ({Object.keys(selectedAnswers).length}/15 answered)
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Test Results */}
            {testSubmitted && testResult && (
                <div>
                    {/* Result Summary */}
                    <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <h2 style={{ marginBottom: '1rem', color: 'white' }}>🎉 Test Completed!</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{testResult.score}%</div>
                                <div style={{ opacity: 0.9 }}>Overall Score</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>{testResult.totalCorrect}/15</div>
                                <div style={{ opacity: 0.9 }}>Correct Answers</div>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h3 style={{ marginBottom: '0.75rem', color: 'white' }}>Level-wise Performance</h3>
                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Easy:</span>
                                    <strong>{testResult.easyScore}/5</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Medium:</span>
                                    <strong>{testResult.mediumScore}/5</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Advanced:</span>
                                    <strong>{testResult.advancedScore}/5</strong>
                                </div>
                            </div>
                        </div>

                        {testResult.promotedLevel !== testResult.previousLevel && (
                            <div style={{ background: 'rgba(255,255,255,0.3)', padding: '1rem', borderRadius: '8px' }}>
                                <h3 style={{ color: 'white' }}>🚀 Level Promotion!</h3>
                                <p>You've been promoted to: <strong style={{ fontSize: '1.25rem' }}>{testResult.promotedLevel.toUpperCase()}</strong></p>
                            </div>
                        )}
                        {testResult.promotedLevel === testResult.previousLevel && testResult.previousLevel && (
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <p>Your level remains: <strong style={{ fontSize: '1.25rem' }}>{testResult.promotedLevel.toUpperCase()}</strong></p>
                            </div>
                        )}
                        {testResult.isFirstTime && (
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '1rem', borderRadius: '8px' }}>
                                <p>Your starting level: <strong style={{ fontSize: '1.25rem' }}>{testResult.promotedLevel.toUpperCase()}</strong></p>
                            </div>
                        )}
                    </div>

                    {/* Review Answers */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Review Your Answers</h3>
                        {testQuestions.map((q, index) => (
                            <div
                                key={q.id}
                                style={{
                                    background: q.isCorrect ? '#e8f5e9' : '#ffebee',
                                    padding: '1.5rem',
                                    borderRadius: '8px',
                                    marginBottom: '1rem',
                                    border: `2px solid ${q.isCorrect ? '#4caf50' : '#f44336'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h4>Question {index + 1}</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '12px',
                                            background: q.level === 'easy' ? '#e8f5e9' : q.level === 'medium' ? '#fff3e0' : '#fce4ec',
                                            color: q.level === 'easy' ? '#2e7d32' : q.level === 'medium' ? '#e65100' : '#c2185b',
                                            fontSize: '0.75rem',
                                            fontWeight: '600'
                                        }}>
                                            {q.level.toUpperCase()}
                                        </span>
                                        <span style={{ fontWeight: 'bold', color: q.isCorrect ? '#2e7d32' : '#c62828' }}>
                                            {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                        </span>
                                    </div>
                                </div>
                                <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>{q.question}</p>
                                <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    <p><strong>Your Answer:</strong> <span style={{ color: q.isCorrect ? '#2e7d32' : '#c62828' }}>{q.studentAnswer || 'Not answered'}</span></p>
                                    {!q.isCorrect && (
                                        <p><strong>Correct Answer:</strong> <span style={{ color: '#2e7d32' }}>{q.correctAnswer}</span></p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button onClick={handleGoToLearning} className="btn btn-primary">
                            Start Learning Path
                        </button>
                        <button onClick={handleStartNewTest} className="btn btn-secondary">
                            Take Another Mock Test
                        </button>
                        <button onClick={handleBackToDashboard} className="btn btn-outline">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentMockTest;
