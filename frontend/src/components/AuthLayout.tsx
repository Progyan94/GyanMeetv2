import React from 'react';
import './AuthLayout.css';

export default function AuthLayout({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
  return (
    <div className="auth-container">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="auth-logo">GC</div>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        {children}
        <div className="auth-footer">
          <p>&copy; {new Date().getFullYear()} Gyan Classes. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
