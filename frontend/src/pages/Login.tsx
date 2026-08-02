import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your Gyan Classes account">
      <form className="auth-form" onSubmit={handleLogin}>
        {error && <div className="auth-error">{error}</div>}
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
        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.5rem' }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </div>
    </AuthLayout>
  );
}
