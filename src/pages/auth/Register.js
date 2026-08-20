// src/pages/auth/Register.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react'; // Icon

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'email') setEmail(value);
        if (name === 'password') setPassword(value);
        if (name === 'confirmPassword') setConfirmPassword(value);
    };

    const validateForm = () => {
        if (!email || !password || !confirmPassword) return "All fields are required.";
        if (!email.toLowerCase().endsWith('@pace.edu.in')) return "Registration requires a @pace.edu.in email.";
        if (password.length < 6) return "Password must be at least 6 characters.";
        if (password !== confirmPassword) return "Passwords do not match.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); setSuccess("");
        const validationError = validateForm();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase(), password);
            const user = userCredential.user;

            // Always create user as 'student' here. Admins must be granted via server/admin script.
            await setDoc(doc(db, "users", user.uid), {
                email: user.email,
                role: 'student',
                createdAt: serverTimestamp(),
                rewardPoints: 0,
            });

            setSuccess("Registration successful! Redirecting to login...");
            setEmail(''); setPassword(''); setConfirmPassword('');
            setTimeout(() => navigate('/login'), 2000);

        } catch (err) {
            if (err.code === 'auth/email-already-in-use') setError("This email is already registered.");
            else if (err.code === 'auth/weak-password') setError("Password is too weak (min. 6 characters).");
            else setError("Registration failed. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    // --- This JSX uses Tailwind classes (`className`) ---
    return (
        <div className="flex items-center justify-center min-h-screen bg-pace-blue-light p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border-t-4 border-pace-blue">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-ink-darkest">Create Account</h1>
                    <p className="text-ink-light mt-1">Smart Lost & Found System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-ink-dark">PACE Email</label>
                        <input
                            id="email" type="email" name="email" required
                            value={email} onChange={handleChange}
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-pace-blue focus:border-pace-blue"
                            placeholder="user@pace.edu.in"
                        />
                        <p className="mt-1 text-xs text-pace-red">Must end with @pace.edu.in</p>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-ink-dark">Password</label>
                        <input
                            id="password" type="password" name="password" required
                            value={password} onChange={handleChange}
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-pace-blue focus:border-pace-blue"
                            placeholder="Minimum 6 characters"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-dark">Confirm Password</label>
                        <input
                            id="confirmPassword" type="password" name="confirmPassword" required
                            value={confirmPassword} onChange={handleChange}
                            className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-pace-blue focus:border-pace-blue"
                            placeholder="Re-enter your password"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-md bg-red-100 border border-pace-red">
                            <p className="text-sm font-medium text-pace-red">{error}</p>
                        </div>
                    )}
                    {success && (
                         <div className="p-3 rounded-md bg-green-100 border border-pace-green">
                            <p className="text-sm font-medium text-pace-green">{success}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-semibold text-white bg-pace-blue hover:bg-pace-blue-dark transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pace-blue disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Registering...' : <><UserPlus size={20} /> Register Account</>}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-ink-light">
                    Already have an account?
                    <button 
                        onClick={() => navigate('/login')} 
                        className="ml-1 font-semibold text-pace-blue hover:text-pace-blue-dark"
                    >
                        Log In Here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Register;