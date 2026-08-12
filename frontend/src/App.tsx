import { useEffect, createContext, useState } from 'react';
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

export const ThemeContext = createContext<{ theme: 'light' | 'dark', toggleTheme: () => void }>({
  theme: 'light',
  toggleTheme: () => {}
});

function App() {
  const [user, loading] = useAuthState(auth);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

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
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <Router>
        {theme === 'dark' && (
          <div className="background-mesh">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
          </div>
        )}
        <DeepLinkListener />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Room /> : <Navigate to="/login" />} />
          <Route path="/room/:id" element={user ? <Room /> : <Navigate to="/login" />} />
        </Routes>
      </Router>
    </ThemeContext.Provider>
  );
}

export default App;
