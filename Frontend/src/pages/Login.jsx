import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            setLoading(true);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Fetch user role from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                // Redirect based on role
                if (userData.role === 'student') {
                    navigate('/dashboard/student');
                } else if (userData.role === 'teacher') {
                    navigate('/dashboard/teacher');
                } else {
                    navigate('/dashboard/student'); // Default fallback
                }
            } else {
                setError('User data not found. Please contact support.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
            <h2>Login</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        Email:
                        <br />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        Password:
                        <br />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            <p style={{ marginTop: '15px' }}>
                Don't have an account? <Link to="/register">Register here</Link>
            </p>
        </div>
    );
}

export default Login;
