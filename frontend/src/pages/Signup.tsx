import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

  const handleGoogleAuth = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const pending = localStorage.getItem('pendingDeepLink');
      if (pending) {
        localStorage.removeItem('pendingDeepLink');
        navigate(pending);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
    }
  };

  return (
    <AuthLayout title="Join MeetXD" subtitle="Create your account">
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
            placeholder="user@example.com"
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
            placeholder="Enter a strong password"
          />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center', marginBottom: '15px' }}>
          By creating an account, you agree to our <Link to="/terms" style={{ color: 'var(--primary-saffron)' }}>Terms of Service</Link> and acknowledge that MeetXD is a project created by GyanXD.
        </p>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
          <span style={{ margin: '0 10px', color: 'var(--text-sub)', fontSize: '0.9rem' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleAuth}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '12px',
            backgroundColor: '#ffffff',
            color: '#757575',
            border: '1px solid #ddd',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px' }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign up with Google
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
}
