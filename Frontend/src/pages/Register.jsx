import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!fullName.trim()) {
            return setError('Full name is required');
        }

        if (!role) {
            return setError('Please select a role');
        }

        if (password !== confirmPassword) {
            return setError('Passwords do not match');
        }

        if (password.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        try {
            setLoading(true);

            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                fullName: fullName.trim(),
                email: user.email,
                role: role,
                createdAt: serverTimestamp()
            });

            // Redirect based on role
            if (role === 'student') {
                navigate('/dashboard/student');
            } else if (role === 'teacher') {
                navigate('/dashboard/teacher');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto' }}>
            <h2>Register</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        Full Name:
                        <br />
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </label>
                </div>
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
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        Confirm Password:
                        <br />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        />
                    </label>
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        Role:
                        <br />
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            required
                            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                        >
                            <option value="">-- Select Role --</option>
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                        </select>
                    </label>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                    {loading ? 'Registering...' : 'Register'}
                </button>
            </form>
            <p style={{ marginTop: '15px' }}>
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </div>
    );
}

export default Register;
