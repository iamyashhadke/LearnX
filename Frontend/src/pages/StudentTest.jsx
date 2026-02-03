import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../components/AuthContext';
import { generateDiagnosticTest, generateLevelBasedTest, evaluateStudentLevel } from '../utils/gemini';

function StudentTest() {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [diagnosticCompleted, setDiagnosticCompleted] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(null);

    const [testQuestions, setTestQuestions] = useState([]);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [testSubmitted, setTestSubmitted] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [startTime, setStartTime] = useState(null);

    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser) {
            checkStudentProfile();
        }
    }, [currentUser]);

    const checkStudentProfile = async () => {
        try {
            setLoading(true);
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const data = userDocSnap.data();
                setDiagnosticCompleted(data.diagnosticCompleted || false);
                setCurrentLevel(data.level || null);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching student profile:', err);
            setError('Failed to load profile data');
            setLoading(false);
        }
    };

    const handleGenerateTest = async () => {
        try {
            setGenerating(true);
            setError('');

            let testData;

            if (!diagnosticCompleted) {
                // Generate diagnostic test
                testData = await generateDiagnosticTest();
            } else {
                // Generate level-based test
                testData = await generateLevelBasedTest(currentLevel || 'intermediate');
            }

            if (testData && testData.questions) {
                // Format questions for display
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
                setTestSubmitted(false);
                setTestResult(null);
                setStartTime(Date.now()); // Start timer
            } else {
                throw new Error('Invalid test data received');
            }

            setGenerating(false);
        } catch (err) {
            console.error('Error generating test:', err);
            setError('Failed to generate test. Please try again.');
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
            
            const endTime = Date.now();
            const timeSpentSeconds = Math.round((endTime - startTime) / 1000);

            // Update questions with student answers and check correctness
            const evaluatedQuestions = testQuestions.map(q => ({
                ...q,
                studentAnswer: selectedAnswers[q.id] || null,
                isCorrect: selectedAnswers[q.id] === q.correctAnswer
            }));

            // Calculate score
            const correctCount = evaluatedQuestions.filter(q => q.isCorrect).length;
            const scorePercentage = Math.round((correctCount / evaluatedQuestions.length) * 100);

            let levelEvaluated = currentLevel;
            let weakAreas = [];

            // If diagnostic test, evaluate level
            if (!diagnosticCompleted) {
                const evaluation = await evaluateStudentLevel(evaluatedQuestions, scorePercentage);
                levelEvaluated = evaluation.level;
                weakAreas = evaluation.weakAreas || [];

                // Update user profile
                const userDocRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userDocRef, {
                    level: levelEvaluated,
                    diagnosticCompleted: true,
                    weakAreas: weakAreas
                });

                setDiagnosticCompleted(true);
                setCurrentLevel(levelEvaluated);
            }

            // Save test to Firestore
            const testData = {
                userId: currentUser.uid,
                testType: !diagnosticCompleted ? 'diagnostic' : 'regular',
                questions: evaluatedQuestions.map(q => ({
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    studentAnswer: q.studentAnswer,
                    isCorrect: q.isCorrect
                })),
                score: scorePercentage,
                correctAnswers: correctCount,
                totalQuestions: evaluatedQuestions.length,
                levelEvaluated: levelEvaluated,
                timeSpentSeconds: timeSpentSeconds,
                weakAreas: weakAreas,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'tests'), testData);

            // Set result
            setTestResult({
                score: scorePercentage,
                correctCount,
                totalQuestions: evaluatedQuestions.length,
                level: levelEvaluated,
                isDiagnostic: !diagnosticCompleted,
                timeSpent: timeSpentSeconds
            });

            setTestQuestions(evaluatedQuestions);
            setTestSubmitted(true);
            setSubmitting(false);
        } catch (err) {
            console.error('Error submitting test:', err);
            setError('Failed to submit test. Please try again.');
            setSubmitting(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--color-primary)' }}>Test Area</h1>
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

            {!diagnosticCompleted && testQuestions.length === 0 && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Welcome to Your First Test!</h3>
                    <p style={{ marginBottom: '0.5rem' }}>This diagnostic test will help us understand your current knowledge level.</p>
                    <p style={{ marginBottom: '1.5rem' }}>The test contains 10 multiple-choice questions covering various topics.</p>
                    <p><strong>Click "Generate Test" to begin.</strong></p>
                </div>
            )}

            {diagnosticCompleted && testQuestions.length === 0 && !testSubmitted && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Ready for a New Test?</h3>
                    <p style={{ marginBottom: '0.5rem' }}>Current Level: <strong>{currentLevel}</strong></p>
                    <p>This test will be tailored to your {currentLevel} level.</p>
                </div>
            )}

            {testQuestions.length === 0 && !testSubmitted && (
                <button
                    onClick={handleGenerateTest}
                    disabled={generating}
                    className="btn btn-primary"
                    style={{ fontSize: '1.1rem', padding: '0.875rem 2rem' }}
                >
                    {generating ? 'Generating Test...' : 'Generate Test'}
                </button>
            )}

            {testQuestions.length > 0 && !testSubmitted && (
                <div>
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '0.5rem' }}>{!diagnosticCompleted ? 'Diagnostic Test' : `${currentLevel} Level Test`}</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Total Questions: {testQuestions.length}</p>
                    </div>

                    {testQuestions.map((q, index) => (
                        <div key={q.id} className="card" style={{ marginBottom: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Question {index + 1}</h4>
                            <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>{q.question}</p>

                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                {q.options.map((option, optIndex) => (
                                    <label 
                                        key={optIndex} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            padding: '1rem', 
                                            borderRadius: 'var(--radius-md)',
                                            background: selectedAnswers[q.id] === option ? 'rgba(37, 99, 235, 0.1)' : 'var(--color-surface)',
                                            border: selectedAnswers[q.id] === option ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            value={option}
                                            checked={selectedAnswers[q.id] === option}
                                            onChange={() => handleAnswerSelect(q.id, option)}
                                            style={{ marginRight: '1rem' }}
                                        />
                                        {option}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleSubmitTest}
                        disabled={submitting || Object.keys(selectedAnswers).length !== testQuestions.length}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>
                </div>
            )}

            {testSubmitted && testResult && (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <h2 style={{ marginBottom: '2rem', color: 'var(--color-primary)' }}>Test Results</h2>
                    
                    <div style={{ 
                        display: 'inline-flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        padding: '2rem', 
                        background: 'var(--color-surface-hover)', 
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '2rem'
                    }}>
                        <div style={{ fontSize: '4rem', fontWeight: 'bold', color: 'var(--color-primary)', lineHeight: 1 }}>
                            {testResult.score}%
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                            {testResult.correctCount} out of {testResult.totalQuestions} correct
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <span>Level Assessed:</span>
                            <strong>{testResult.level}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <span>Time Taken:</span>
                            <strong>{Math.floor(testResult.timeSpent / 60)}m {testResult.timeSpent % 60}s</strong>
                        </div>
                    </div>

                    <p style={{ marginBottom: '2rem' }}>
                        {testResult.isDiagnostic 
                            ? "Great job! We've analyzed your results and set your starting level." 
                            : "Test completed successfully. Keep practicing to improve your skills!"}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                        <button onClick={handleStartNewTest} className="btn btn-outline">
                            Take Another Test
                        </button>
                        <button onClick={handleBackToDashboard} className="btn btn-primary">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentTest;
