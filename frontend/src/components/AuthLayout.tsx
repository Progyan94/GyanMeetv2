import React from 'react';
import { Video } from 'lucide-react';
import './AuthLayout.css';

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-logo"><Video size={36} color="white" /></div>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        {children}
        <div className="auth-footer">
          <p>&copy; {new Date().getFullYear()} MeetXD. All rights reserved.</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--primary-saffron)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            🔄 Check for Updates (Refresh)
          </button>
        </div>
      </div>
    </div>
  );
}
