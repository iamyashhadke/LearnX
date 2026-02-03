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

            // If diagnostic test, evaluate level
            if (!diagnosticCompleted) {
                const evaluation = await evaluateStudentLevel(evaluatedQuestions, scorePercentage);
                levelEvaluated = evaluation.level;

                // Update user profile
                const userDocRef = doc(db, 'users', currentUser.uid);
                await updateDoc(userDocRef, {
                    level: levelEvaluated,
                    diagnosticCompleted: true
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
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'tests'), testData);

            // Set result
            setTestResult({
                score: scorePercentage,
                correctCount,
                totalQuestions: evaluatedQuestions.length,
                level: levelEvaluated,
                isDiagnostic: !diagnosticCompleted
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
            <div style={{ padding: '20px' }}>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Test Area</h1>
                <div>
                    <button
                        onClick={handleBackToDashboard}
                        style={{ padding: '10px 20px', cursor: 'pointer', marginRight: '10px' }}
                    >
                        Back to Dashboard
                    </button>
                    <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
                        Logout
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ background: '#ffebee', padding: '15px', borderRadius: '8px', marginBottom: '20px', color: '#c62828' }}>
                    {error}
                </div>
            )}

            {!diagnosticCompleted && testQuestions.length === 0 && (
                <div style={{ background: '#e3f2fd', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3>Welcome to Your First Test!</h3>
                    <p>This diagnostic test will help us understand your current knowledge level.</p>
                    <p>The test contains 10 multiple-choice questions covering various topics.</p>
                    <p><strong>Click "Generate Test" to begin.</strong></p>
                </div>
            )}

            {diagnosticCompleted && testQuestions.length === 0 && !testSubmitted && (
                <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3>Ready for a New Test?</h3>
                    <p>Current Level: <strong>{currentLevel}</strong></p>
                    <p>This test will be tailored to your {currentLevel} level.</p>
                </div>
            )}

            {testQuestions.length === 0 && !testSubmitted && (
                <button
                    onClick={handleGenerateTest}
                    disabled={generating}
                    style={{
                        padding: '12px 24px',
                        fontSize: '16px',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        backgroundColor: '#646cff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px'
                    }}
                >
                    {generating ? 'Generating Test...' : 'Generate Test'}
                </button>
            )}

            {testQuestions.length > 0 && !testSubmitted && (
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <h3>{!diagnosticCompleted ? 'Diagnostic Test' : `${currentLevel} Level Test`}</h3>
                        <p>Total Questions: {testQuestions.length}</p>
                    </div>

                    {testQuestions.map((q, index) => (
                        <div key={q.id} style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                            <h4>Question {index + 1}</h4>
                            <p style={{ fontSize: '16px', marginBottom: '15px' }}>{q.question}</p>

                            {q.options.map((option, optIndex) => (
                                <div key={optIndex} style={{ marginBottom: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name={`question-${q.id}`}
                                            value={option}
                                            checked={selectedAnswers[q.id] === option}
                                            onChange={() => handleAnswerSelect(q.id, option)}
                                            style={{ marginRight: '10px' }}
                                        />
                                        <span>{option}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    ))}

                    <button
                        onClick={handleSubmitTest}
                        disabled={submitting || Object.keys(selectedAnswers).length !== testQuestions.length}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            cursor: (submitting || Object.keys(selectedAnswers).length !== testQuestions.length) ? 'not-allowed' : 'pointer',
                            backgroundColor: '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px'
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit Test'}
                    </button>

                    {Object.keys(selectedAnswers).length !== testQuestions.length && (
                        <p style={{ marginTop: '10px', color: '#666' }}>
                            Please answer all questions before submitting ({Object.keys(selectedAnswers).length}/{testQuestions.length} answered)
                        </p>
                    )}
                </div>
            )}

            {testSubmitted && testResult && (
                <div>
                    <div style={{ background: '#e8f5e9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h2>Test Completed!</h2>
                        <p><strong>Score:</strong> {testResult.score}% ({testResult.correctCount}/{testResult.totalQuestions})</p>
                        {testResult.isDiagnostic && (
                            <p><strong>Your Level:</strong> {testResult.level}</p>
                        )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h3>Review Your Answers</h3>
                        {testQuestions.map((q, index) => (
                            <div
                                key={q.id}
                                style={{
                                    background: q.isCorrect ? '#e8f5e9' : '#ffebee',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    marginBottom: '15px'
                                }}
                            >
                                <h4>Question {index + 1}</h4>
                                <p style={{ fontSize: '16px', marginBottom: '10px' }}>{q.question}</p>
                                <p><strong>Your Answer:</strong> {q.studentAnswer || 'Not answered'}</p>
                                <p><strong>Correct Answer:</strong> {q.correctAnswer}</p>
                                <p style={{ fontWeight: 'bold', color: q.isCorrect ? '#2e7d32' : '#c62828' }}>
                                    {q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                </p>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleStartNewTest}
                        style={{
                            padding: '12px 24px',
                            fontSize: '16px',
                            cursor: 'pointer',
                            backgroundColor: '#646cff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px'
                        }}
                    >
                        Start New Test
                    </button>
                </div>
            )}
        </div>
    );
}

export default StudentTest;
