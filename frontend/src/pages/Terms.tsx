import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';

export default function Terms() {
  return (
    <AuthLayout title="Terms of Service" subtitle="MeetXD Rules and Policies">
      <div style={{ textAlign: 'left', fontSize: '0.9rem', color: 'var(--text-main)', maxHeight: '400px', overflowY: 'auto', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing and using MeetXD, you agree to be bound by these Terms of Service. MeetXD is an open-source project created and maintained by GyanXD.</p>

        <h3>2. Project Credit & Attribution</h3>
        <p>MeetXD is the intellectual property of GyanXD. If you are using a self-hosted or modified version of this software, you are legally required to provide attribution to GyanXD unless a separate commercial license has been obtained.</p>

        <h3>3. Acceptable Use</h3>
        <p>You agree not to use MeetXD for any unlawful, harmful, or abusive purposes. The creator (GyanXD) is not responsible for the content shared or actions taken by users within meeting rooms.</p>

        <h3>4. Privacy & Anti-Cheat</h3>
        <p>Hosts may enable an "Anti-Cheat Tracking" feature in rooms they create. By joining a room with this enabled (which you must explicitly opt into), you acknowledge that the host will be notified if you navigate away from the meeting tab or window.</p>

        <h3>5. No Warranty</h3>
        <p>This software is provided "as is", without warranty of any kind. The creator shall not be liable for any damages or service interruptions.</p>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <Link to="/signup" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '10px 20px', width: '100%' }}>
          Back to Sign Up
        </Link>
      </div>
    </AuthLayout>
  );
}
