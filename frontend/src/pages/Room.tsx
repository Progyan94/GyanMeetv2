import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  FocusLayoutContainer,
  CarouselLayout,
  ParticipantTile,
  useTracks,
  useLocalParticipant,
  useParticipants,
  TrackToggle,
  DisconnectButton,
  useRoomContext,
  usePinnedTracks,
  Chat,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import '@livekit/components-styles';
import './Room.css';

const serverUrl = 'wss://gyanmeet-3khfyxf1.livekit.cloud';

function CustomControlBar({ isTeacher, chatOpen, setChatOpen }: { isTeacher: boolean, chatOpen: boolean, setChatOpen: (v: boolean) => void }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const participants = useParticipants();
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [bgImageEnabled, setBgImageEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCameraTrack = () => {
    if (!localParticipant) return null;
    return localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack;
  };

  const toggleBlur = async () => {
    const cameraTrack = getCameraTrack();
    if (!cameraTrack) {
      alert("Please turn on your camera first.");
      return;
    }
    try {
      if (blurEnabled) {
        await cameraTrack.stopProcessor();
        setBlurEnabled(false);
      } else {
        const blur = BackgroundBlur(10);
        await cameraTrack.setProcessor(blur);
        setBlurEnabled(true);
        setBgImageEnabled(false);
      }
    } catch (e) {
      console.error("Failed to toggle blur", e);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const cameraTrack = getCameraTrack();
    if (!cameraTrack) {
      alert("Please turn on your camera first.");
      return;
    }
    try {
      const imageUrl = URL.createObjectURL(file);
      const bg = VirtualBackground(imageUrl);
      await cameraTrack.setProcessor(bg);
      setBgImageEnabled(true);
      setBlurEnabled(false);
    } catch (e) {
      console.error("Failed to set virtual background", e);
    }
  };

  const clearProcessors = async () => {
    const cameraTrack = getCameraTrack();
    if (cameraTrack) {
      await cameraTrack.stopProcessor();
      setBlurEnabled(false);
      setBgImageEnabled(false);
    }
  };

  const toggleHandRaise = () => {
    if (!localParticipant) return;
    const isRaised = !handRaised;
    // We store hand raise state in the participant metadata string
    const currentMeta = localParticipant.metadata ? JSON.parse(localParticipant.metadata) : {};
    currentMeta.handRaised = isRaised;
    
    // The server SDK doesn't natively let clients update metadata directly without a server token with specific permissions.
    // However, LiveKit Client SDK allows updating attributes (attributes are local-to-server synced).
    localParticipant.setAttributes({ handRaised: isRaised ? "true" : "false" });
    setHandRaised(isRaised);
  };

  const handleRename = async () => {
    if (participants.length <= 1) {
      alert("No other students in the room to rename.");
      return;
    }
    let participantNames = participants.filter(p => p !== localParticipant).map(p => p.name || p.identity).join(', ');
    const targetName = window.prompt(`Enter the current name of the student to rename.\nAvailable: ${participantNames}`);
    if (!targetName) return;

    const targetParticipant = participants.find(p => (p.name === targetName || p.identity === targetName) && p !== localParticipant);
    if (!targetParticipant) {
      alert("Student not found.");
      return;
    }

    const newName = window.prompt(`Enter new name for ${targetName}:`);
    if (!newName || newName.trim() === '') return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: room.name,
          identity: targetParticipant.identity,
          newName: newName,
          isTeacher: isTeacher
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Rename successful! (It may take a few seconds to reflect)");
    } catch (e: any) {
      alert("Failed to rename: " + e.message);
    }
  };

  const handleRemove = async () => {
    if (participants.length <= 1) {
      alert("No other students in the room to remove.");
      return;
    }
    let participantNames = participants.filter(p => p !== localParticipant).map(p => p.name || p.identity).join(', ');
    const targetName = window.prompt(`Enter the name of the student to remove/kick.\nAvailable: ${participantNames}`);
    if (!targetName) return;

    const targetParticipant = participants.find(p => (p.name === targetName || p.identity === targetName) && p !== localParticipant);
    if (!targetParticipant) {
      alert("Student not found.");
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${targetName}?`)) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: room.name,
          identity: targetParticipant.identity,
          isTeacher: isTeacher
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      alert("Participant removed!");
    } catch (e: any) {
      alert("Failed to remove: " + e.message);
    }
  };

  return (
    <div className="lk-control-bar" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', width: '100%', position: 'absolute', bottom: 0, zIndex: 10, flexWrap: 'wrap' }}>
      <TrackToggle source={Track.Source.Microphone} />
      <TrackToggle source={Track.Source.Camera} />
      <TrackToggle source={Track.Source.ScreenShare} />
      
      <button className="lk-button" onClick={() => setChatOpen(!chatOpen)} style={{ background: chatOpen ? 'var(--primary-saffron)' : '' }}>
        Chat
      </button>

      <button className="lk-button" onClick={toggleHandRaise} style={{ background: handRaised ? 'var(--primary-saffron)' : '' }}>
        {handRaised ? 'Lower Hand' : 'Raise Hand ✋'}
      </button>
      
      <button className="lk-button" onClick={toggleBlur} title="Toggle Blur" style={{ background: blurEnabled ? 'var(--primary-saffron)' : '' }}>
        Blur
      </button>

      <button className="lk-button" onClick={() => fileInputRef.current?.click()} title="Upload Background Image" style={{ background: bgImageEnabled ? 'var(--primary-saffron)' : '' }}>
        Image BG
      </button>
      <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImageUpload} />

      {(blurEnabled || bgImageEnabled) && (
        <button className="lk-button" onClick={clearProcessors} style={{ background: '#EF4444' }}>
          Clear BG
        </button>
      )}

      {isTeacher && (
        <>
          <button className="lk-button" onClick={handleRename} style={{ background: 'var(--text-sub)' }}>
            Rename Student
          </button>
          <button className="lk-button" onClick={handleRemove} style={{ background: '#DC2626' }}>
            Remove Student
          </button>
        </>
      )}

      <DisconnectButton>Leave</DisconnectButton>
    </div>
  );
}

function CustomParticipantTile({ participant, ...props }: any) {
  // Read the attributes for hand raised state
  const isHandRaised = participant.attributes?.handRaised === "true";
  
  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <ParticipantTile participant={participant} {...props} />
      {isHandRaised && (
        <div style={{ position: 'absolute', top: 10, right: 10, fontSize: '2rem', zIndex: 5, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '5px' }}>
          ✋
        </div>
      )}
    </div>
  );
}

function CustomVideoConference({ isTeacher }: { isTeacher: boolean }) {
  const [chatOpen, setChatOpen] = useState(false);
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const focusTracks = usePinnedTracks();

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Video Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, height: 'calc(100% - 80px)', padding: '10px' }}>
          {focusTracks.length > 0 ? (
            <FocusLayoutContainer>
              <CarouselLayout tracks={tracks}>
                <CustomParticipantTile />
              </CarouselLayout>
            </FocusLayoutContainer>
          ) : (
            <GridLayout tracks={tracks}>
              <CustomParticipantTile />
            </GridLayout>
          )}
        </div>
        <CustomControlBar isTeacher={isTeacher} chatOpen={chatOpen} setChatOpen={setChatOpen} />
      </div>

      {/* Chat Sidebar */}
      {chatOpen && (
        <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>Meeting Chat</div>
          <Chat style={{ flex: 1, height: 'calc(100% - 50px)' }} />
        </div>
      )}
    </div>
  );
}

export default function Room() {
  const [roomName, setRoomName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const user = auth.currentUser;
  
  // Use the requested email or fallback to environment variable
  const TEACHER_EMAIL = import.meta.env.VITE_TEACHER_EMAIL || "gyanclassesabacus2014@gmail.com";
  const isTeacher = user?.email === TEACHER_EMAIL;

  const joinMeeting = async (targetRoom: string) => {
    if (!targetRoom.trim()) return;
    
    // Use the display name from the Firebase profile (set during signup)
    // Fallback to email handle or "Student" if not set.
    const participantName = user?.displayName || user?.email?.split('@')[0] || 'Student';

    setLoading(true);
    setError('');
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName: targetRoom, 
          participantName: participantName,
          isTeacher: isTeacher
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get token');
      }
      
      setToken(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    joinMeeting(roomName);
  };

  const handleCreateMeeting = () => {
    // Generate a random class code like "gyan-1234"
    const randomCode = "gyan-" + Math.floor(1000 + Math.random() * 9000);
    setRoomName(randomCode);
    joinMeeting(randomCode);
  };

  const handleLogout = () => signOut(auth);

  if (token === '') {
    return (
      <div className="join-container">
        <button className="header-logout" onClick={handleLogout}>Sign Out</button>
        <div className="card join-card">
          <div style={{ textAlign: 'center' }}>
            <h2>{isTeacher ? "Teacher Dashboard" : "Join a Class"}</h2>
            <p style={{ color: 'var(--text-sub)' }}>
              {isTeacher ? "Create a new meeting or join an existing one." : "Enter a class code provided by your teacher."}
            </p>
          </div>

          {isTeacher && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
              <button 
                onClick={handleCreateMeeting} 
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Starting...' : 'Start New Class (Create Meeting)'}
              </button>
              <div style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: '0.875rem' }}>- OR -</div>
            </div>
          )}

          <form className="auth-form" onSubmit={handleJoinSubmit}>
            {error && <div className="auth-error">{error}</div>}
            <div className="auth-form-group">
              <label htmlFor="roomName">Class Code</label>
              <input 
                type="text" 
                id="roomName" 
                className="input-field" 
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)} 
                required 
                placeholder="e.g. gyan-1234"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} style={{ background: isTeacher ? 'var(--text-sub)' : 'var(--primary-saffron)' }}>
              {loading ? 'Joining...' : 'Join Existing Class'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ color: 'var(--primary-saffron)', fontWeight: 'bold', fontSize: '1.2rem', padding: '5px 10px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px' }}>
          Gyan Classes
        </div>
        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '5px 15px', borderRadius: '8px', fontSize: '1rem', display: 'flex', gap: '10px', alignItems: 'center', border: '1px solid var(--primary-saffron-light)' }}>
          <span style={{ color: '#ccc' }}>Class Code:</span>
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', userSelect: 'all' }}>{roomName}</span>
        </div>
      </div>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        data-lk-theme="default"
        style={{ height: '100vh', position: 'relative' }}
        onDisconnected={() => setToken('')}
      >
        <CustomVideoConference isTeacher={isTeacher} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
