import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: fullName });
      const pending = localStorage.getItem('pendingDeepLink');
      if (pending) {
        localStorage.removeItem('pendingDeepLink');
        navigate(pending);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create an account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Join Gyan Classes" subtitle="Create your student account">
      <form className="auth-form" onSubmit={handleSignup}>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-form-group">
          <label htmlFor="fullName">Full Name (Username)</label>
          <input 
            type="text" 
            id="fullName" 
            className="input-field" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            placeholder="John Doe"
          />
        </div>
        <div className="auth-form-group">
          <label htmlFor="email">Email</label>
          <input 
            type="email" 
            id="email" 
            className="input-field" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="student@gyanclasses.com"
          />
        </div>
        <div className="auth-form-group">
          <label htmlFor="password">Password</label>
          <input 
            type="password" 
            id="password" 
            className="input-field" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="••••••••"
          />
        </div>
        <div className="auth-form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input 
            type="password" 
            id="confirmPassword" 
            className="input-field" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            placeholder="••••••••"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
}
