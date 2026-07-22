import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { signOut, auth } from '../firebase';
import { LogOut, Video, Users } from 'lucide-react';

export default function Dashboard() {
  const { currentUser, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [classCode, setClassCode] = useState('');

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const startNewClass = () => {
    // Generate a random class code: gyan-XXXX
    const code = `gyan-${Math.floor(1000 + Math.random() * 9000)}`;
    navigate(`/class/${code}`);
  };

  const joinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (classCode.trim()) {
      navigate(`/class/${classCode.trim()}`);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 className="brand-title" style={{ margin: 0, fontSize: '2rem' }}>Gyan Classes</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Welcome, {currentUser?.displayName || 'User'}</span>
          <button onClick={handleLogout} className="btn btn-glass" style={{ padding: '0.5rem' }} title="Log out">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-center" style={{ minHeight: '60vh' }}>
        <div className="card" style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
          
          {isTeacher ? (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem', color: 'var(--saffron)' }}>
                <Video size={48} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ marginBottom: '1rem' }}>Teacher Dashboard</h2>
              <p style={{ marginBottom: '2rem' }}>Start a new live session for your students. A secure class code will be generated.</p>
              <button onClick={startNewClass} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
                Start New Class
              </button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div style={{ marginBottom: '2rem', color: 'var(--saffron)' }}>
                <Users size={48} style={{ margin: '0 auto' }} />
              </div>
              <h2 style={{ marginBottom: '1rem' }}>Student Dashboard</h2>
              <p style={{ marginBottom: '2rem' }}>Enter the class code provided by your teacher to join the session.</p>
              
              <form onSubmit={joinClass}>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="input-field" 
                    value={classCode}
                    onChange={e => setClassCode(e.target.value)}
                    placeholder="e.g. gyan-1234"
                    style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.2rem' }}>
                  Join Class
                </button>
              </form>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}
