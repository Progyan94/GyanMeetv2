import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Room from './pages/Room';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

import { useNavigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { listen } from '@tauri-apps/api/event';

function DeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for Android/iOS App Links
    const capListener = CapacitorApp.addListener('appUrlOpen', data => {
      // E.g. https://gyan-meetv2.vercel.app/room/1234
      const url = new URL(data.url);
      if (url.hostname === 'gyan-meetv2.vercel.app') {
        const path = url.pathname;
        if (path) {
          navigate(path);
        }
      } else if (data.url.startsWith('gyanmeet://')) {
        // Fallback for custom protocol
        const path = data.url.replace('gyanmeet://', '/');
        navigate(path);
      }
    });

    let unlistenTauri: (() => void) | undefined;
    
    // Check if running inside Tauri
    if ((window as any).__TAURI__) {
      listen('scheme-request-received', (event: any) => {
        const payload = event.payload; // "gyanmeet://room/1234"
        if (typeof payload === 'string' && payload.startsWith('gyanmeet://')) {
          let path = payload.replace('gyanmeet://', '/');
          // Fix double slashes if any
          path = path.replace('//', '/');
          navigate(path);
        }
      }).then(unlisten => {
        unlistenTauri = unlisten;
      });
    }

    return () => {
      capListener.then(l => l.remove());
      if (unlistenTauri) unlistenTauri();
    };
  }, [navigate]);

  return null;
}

function App() {
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 or Ctrl+R to reload the window
      if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) {
        e.preventDefault();
        window.location.reload();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--primary-saffron)' }}>Loading...</div>;
  }

  return (
    <Router>
      <DeepLinkListener />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Room /> : <Navigate to="/login" />} />
        <Route path="/room/:id" element={user ? <Room /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
