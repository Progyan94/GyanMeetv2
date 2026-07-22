import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';
import ClassUI from '../components/ClassUI';

export default function MeetingRoom() {
  const { classCode } = useParams<{ classCode: string }>();
  const { currentUser, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState('');

  // Use the backend URL from environment or fallback to localhost
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!currentUser || !classCode) return;

    const fetchToken = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName: classCode,
            participantName: currentUser.displayName || currentUser.email,
            isTeacher: isTeacher,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch token');
        }

        const data = await response.json();
        setToken(data.token);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchToken();
  }, [currentUser, classCode, isTeacher, BACKEND_URL]);

  if (error) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
        <h2 style={{ color: 'var(--danger)' }}>Error joining class</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container flex-center" style={{ minHeight: '100vh' }}>
        <h2>Connecting to class...</h2>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        padding: '1rem 2rem', 
        background: 'var(--bg-panel)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--glass-border)'
      }}>
        <h2 className="brand-title" style={{ margin: 0, fontSize: '1.5rem', textShadow: 'none' }}>Gyan Classes</h2>
        
        {isTeacher && (
          <div style={{ background: 'var(--bg-dark)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--saffron)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Class Code: </span>
            <strong style={{ color: 'var(--saffron)', letterSpacing: '1px' }}>{classCode}</strong>
          </div>
        )}
        
        <button onClick={() => navigate('/dashboard')} className="btn btn-glass" style={{ padding: '0.5rem 1rem' }}>
          Leave Class
        </button>
      </header>

      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={import.meta.env.VITE_LIVEKIT_URL || 'wss://gyanmeetv2-pv411jzk.livekit.cloud'}
        data-lk-theme="default"
        style={{ flex: 1, height: 'calc(100vh - 73px)' }}
        className="custom-lk-theme"
      >
        <ClassUI />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
