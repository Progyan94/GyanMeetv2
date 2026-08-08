import React, { useState, useRef, useEffect } from 'react';
import { auth } from '../firebase';
import { Hand, HandMetal, ChevronDown, ChevronUp, ImageOff, Upload, XCircle, Circle, Square, AlertTriangle, RefreshCw, Edit2, UserX, Users } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { RoomEvent, Track, Participant } from 'livekit-client';
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
  LayoutContextProvider,
} from '@livekit/components-react';

import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import '@livekit/components-styles';
import './Room.css';

const serverUrl = 'wss://gyanmeet-3khfyxf1.livekit.cloud';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any, errorInfo: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    this.setState({ errorInfo });
    console.error("Caught by ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#DC2626', color: 'white', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong in the meeting room UI.</h2>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '10px' }}>{this.state.error?.toString()}</pre>
          <pre style={{ background: 'rgba(0,0,0,0.5)', padding: '10px' }}>{this.state.errorInfo?.componentStack}</pre>
          <button onClick={() => window.location.reload()} style={{ padding: '10px', marginTop: '10px', background: 'white', color: 'black' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}


// --- IDB Helper for Custom Backgrounds ---
const DB_NAME = 'GyanMeet_DB';
const STORE_NAME = 'custom_backgrounds';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e: any) => {
      if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
        e.target.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveBackgroundToDB = async (blob: Blob): Promise<number> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add({ image: blob, timestamp: Date.now() });
    request.onsuccess = (e: any) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
};

const loadBackgroundsFromDB = async (): Promise<{id: number, url: string}[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result.map((item: any) => ({
        id: item.id,
        url: URL.createObjectURL(item.image)
      }));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

const deleteBackgroundFromDB = async (id: number): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

function CustomControlBar({ isTeacher, chatOpen, setChatOpen, participantsOpen, setParticipantsOpen }: { isTeacher: boolean, chatOpen: boolean, setChatOpen: (v: boolean) => void, participantsOpen: boolean, setParticipantsOpen: (v: boolean) => void }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const participants = useParticipants();
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [bgImageEnabled, setBgImageEnabled] = useState(false);
  const [bgMenuOpen, setBgMenuOpen] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [customBgs, setCustomBgs] = useState<{id: number, url: string}[]>([]);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    loadBackgroundsFromDB().then(bgs => setCustomBgs(bgs)).catch(console.error);
  }, []);

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
    try {
      await saveBackgroundToDB(file);
      const bgs = await loadBackgroundsFromDB();
      setCustomBgs(bgs);
      if (bgs.length > 0) {
        await setPresetBackground(bgs[bgs.length - 1].url);
      }
    } catch(err) {
      console.error("Failed to save background", err);
    }
  };

  const handleRemoveCustomBg = async (id: number, url: string) => {
    await deleteBackgroundFromDB(id);
    URL.revokeObjectURL(url);
    const bgs = await loadBackgroundsFromDB();
    setCustomBgs(bgs);
  };

  const setPresetBackground = async (imageUrl: string) => {
    const cameraTrack = getCameraTrack();
    if (!cameraTrack) {
      alert("Please turn on your camera first.");
      return;
    }
    try {
      const bg = VirtualBackground(imageUrl);
      await cameraTrack.setProcessor(bg);
      setBgImageEnabled(true);
      setBlurEnabled(false);
      setBgMenuOpen(false);
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

  const startRecording = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      let finalStream = displayStream;

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const dest = audioContext.createMediaStreamDestination();

        if (displayStream.getAudioTracks().length > 0) {
          const displaySource = audioContext.createMediaStreamSource(new MediaStream(displayStream.getAudioTracks()));
          displaySource.connect(dest);
        }
        
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(dest);

        finalStream = new MediaStream([
          displayStream.getVideoTracks()[0],
          dest.stream.getAudioTracks()[0]
        ]);
        
        (finalStream as any)._ctx = audioContext;
        (finalStream as any)._micTracks = micStream.getTracks();
      } catch(e) {
         console.warn("Could not get mic access for recording", e);
      }

      const recorder = new MediaRecorder(finalStream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `GyanMeet_Recording_${new Date().getTime()}.webm`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        setRecording(false);
        
        if ((finalStream as any)._ctx) (finalStream as any)._ctx.close();
        if ((finalStream as any)._micTracks) (finalStream as any)._micTracks.forEach((t:any) => t.stop());
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (recorder.state !== 'inactive') recorder.stop();
        finalStream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err: any) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
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
      
      <button className="lk-button" onClick={() => { setChatOpen(!chatOpen); setParticipantsOpen(false); }} style={{ background: chatOpen ? 'var(--primary-saffron)' : '' }}>
        Chat
      </button>

      <button className="lk-button" onClick={() => { setParticipantsOpen(!participantsOpen); setChatOpen(false); }} style={{ background: participantsOpen ? 'var(--primary-saffron)' : '', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <Users size={16}/> {participants.length}
      </button>

      <button className="lk-button" onClick={toggleHandRaise} style={{ background: handRaised ? 'var(--primary-saffron)' : '', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {handRaised ? <><HandMetal size={16}/> Lower Hand</> : <><Hand size={16}/> Raise Hand</>}
      </button>
      
      <div style={{ position: 'relative' }}>
        <button 
          className="lk-button" 
          onClick={() => setBgMenuOpen(!bgMenuOpen)} 
          style={{ background: (blurEnabled || bgImageEnabled) ? 'var(--primary-saffron)' : '', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          Backgrounds {bgMenuOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
        </button>

        {bgMenuOpen && (
          <div style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column',
            gap: '8px', marginBottom: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)', minWidth: '150px', zIndex: 100
          }}>
            <button className="lk-button" onClick={() => { toggleBlur(); setBgMenuOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <ImageOff size={16}/> Blur Background
            </button>
            <button className="lk-button" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              <Upload size={16}/> Upload Custom...
            </button>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center', marginTop: '5px' }}>Presets</div>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
              <img 
                src="https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=100&q=80" 
                onClick={() => setPresetBackground("https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=1280&q=80")}
                style={{ width: '40px', height: '40px', borderRadius: '5px', cursor: 'pointer', objectFit: 'cover' }}
                title="Office"
              />
              <img 
                src="https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=100&q=80" 
                onClick={() => setPresetBackground("https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1280&q=80")}
                style={{ width: '40px', height: '40px', borderRadius: '5px', cursor: 'pointer', objectFit: 'cover' }}
                title="Gradient"
              />
              <img 
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=100&q=80" 
                onClick={() => setPresetBackground("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1280&q=80")}
                style={{ width: '40px', height: '40px', borderRadius: '5px', cursor: 'pointer', objectFit: 'cover' }}
                title="Living Room"
              />
            </div>

            {customBgs.length > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', textAlign: 'center', marginTop: '5px' }}>My Backgrounds</div>}
            {customBgs.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {customBgs.map(bg => (
                  <div key={bg.id} style={{ position: 'relative' }}>
                    <img 
                      src={bg.url}
                      onClick={() => setPresetBackground(bg.url)}
                      style={{ width: '40px', height: '40px', borderRadius: '5px', cursor: 'pointer', objectFit: 'cover' }}
                      title="Custom"
                    />
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleRemoveCustomBg(bg.id, bg.url); }}
                      style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                    >✕</div>
                  </div>
                ))}
              </div>
            )}
            
            {(blurEnabled || bgImageEnabled) && (
              <button className="lk-button" onClick={() => { clearProcessors(); setBgMenuOpen(false); }} style={{ width: '100%', background: '#EF4444', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                <XCircle size={16}/> Clear Background
              </button>
            )}
          </div>
        )}
      </div>
      <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImageUpload} />

      {isTeacher && (
        <>
          <button className="lk-button" onClick={handleRename} style={{ background: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Edit2 size={16}/> Rename Student
          </button>
          <button className="lk-button" onClick={handleRemove} style={{ background: '#DC2626', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <UserX size={16}/> Remove Student
          </button>
          {recording ? (
            <button className="lk-button" onClick={stopRecording} style={{ background: '#DC2626', animation: 'pulse 1.5s infinite', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Square size={16} fill="currentColor"/> Stop Recording
            </button>
          ) : (
            <button className="lk-button" onClick={startRecording} style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Circle size={16} fill="currentColor" color="#DC2626"/> Record Meeting
            </button>
          )}
        </>
      )}

      <DisconnectButton>Leave</DisconnectButton>
    </div>
  );
}

function CustomParticipantTile(props: any) {
  // Extract style and className for the wrapper so LiveKit grid can properly size and position it
  const { trackReference, participant: directParticipant, style, className, ...rest } = props;
  const participant = trackReference?.participant || directParticipant;
  
  const isHandRaised = participant?.attributes?.handRaised === "true";
  const isDistracted = participant?.attributes?.isDistracted === "true";
  
  return (
    <div 
      style={{ 
        ...style, 
        border: isDistracted ? '4px solid #DC2626' : 'none', 
        borderRadius: '8px', 
        boxSizing: 'border-box',
        position: 'relative'
      }} 
      className={className}
      {...rest}
    >
      <ParticipantTile 
        trackReference={trackReference} 
        participant={directParticipant} 
        style={{ width: '100%', height: '100%', borderRadius: '4px' }}
      />
      {isHandRaised && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 5, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Hand size={24} color="white"/>
        </div>
      )}
      {isDistracted && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 5, background: 'rgba(220, 38, 38, 0.9)', borderRadius: '8px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px', color: 'white', fontWeight: 'bold' }}>
          <AlertTriangle size={18}/> Distracted
        </div>
      )}
    </div>
  );
}

function CustomVideoConference({ isTeacher }: { isTeacher: boolean }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [showCheatWarning, setShowCheatWarning] = useState(false);
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const participants = useParticipants();
  const [distractedStudents, setDistractedStudents] = useState<Participant[]>([]);

  const playAlarm = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(400, ctx.currentTime); // urgent beep frequency
      osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1); 
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.error("Audio API failed", e);
    }
  };

  // Update distracted students list whenever attributes change
  useEffect(() => {
    const updateDistracted = () => {
      const allParticipants = Array.from(room.remoteParticipants.values());
      const newlyDistracted = allParticipants.filter(p => p.attributes?.isDistracted === "true");
      
      setDistractedStudents(prev => {
        if (isTeacher && newlyDistracted.length > prev.length) {
          playAlarm();
        }
        return newlyDistracted;
      });
    };

    room.on(RoomEvent.ParticipantAttributesChanged, updateDistracted);
    room.on(RoomEvent.ParticipantConnected, updateDistracted);
    room.on(RoomEvent.ParticipantDisconnected, updateDistracted);

    updateDistracted(); // Initial check

    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, updateDistracted);
      room.off(RoomEvent.ParticipantConnected, updateDistracted);
      room.off(RoomEvent.ParticipantDisconnected, updateDistracted);
    };
  }, [room]);

  useEffect(() => {
    if (isTeacher || !localParticipant) return;

    const handleFocusLoss = () => {
      localParticipant.setAttributes({ isDistracted: "true" });
      setShowCheatWarning(true);
    };
    const handleFocusGain = () => localParticipant.setAttributes({ isDistracted: "false" });

    const handleVisibilityChange = () => {
      if (document.hidden) handleFocusLoss();
      else if (document.hasFocus()) handleFocusGain();
    };

    window.addEventListener('blur', handleFocusLoss);
    window.addEventListener('focus', handleFocusGain);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleFocusLoss);
      window.removeEventListener('focus', handleFocusGain);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTeacher, localParticipant]);

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
      {/* Teacher Distraction Alerts */}
      {isTeacher && distractedStudents.length > 0 && (
        <div style={{
          position: 'absolute', top: 20, right: 20, zIndex: 50,
          background: 'rgba(220, 38, 38, 0.95)', color: 'white',
          padding: '15px 20px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          maxWidth: '300px', backdropFilter: 'blur(10px)', border: '1px solid #FCA5A5'
        }}>
          <h3 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
            <AlertTriangle size={20}/> Tab Switched!
          </h3>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.95rem' }}>
            {distractedStudents.map(p => (
              <li key={p.identity}><strong>{p.name || p.identity}</strong> is not looking at the app.</li>
            ))}
          </ul>
        </div>
      )}

      {/* Student Distraction Warning */}
      {!isTeacher && showCheatWarning && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 100,
          background: 'rgba(220, 38, 38, 0.95)', color: 'white', textAlign: 'center',
          padding: '30px', borderRadius: '16px', boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
          maxWidth: '400px', backdropFilter: 'blur(15px)', border: '2px solid #FCA5A5'
        }}>
          <AlertTriangle size={64} style={{ marginBottom: '15px', color: '#FEF08A' }} />
          <h2 style={{ margin: '0 0 10px 0' }}>Warning!</h2>
          <p style={{ margin: '0 0 20px 0', fontSize: '1.1rem' }}>You switched tabs or lost focus on the app. Your teacher has been notified of this activity.</p>
          <button 
            className="lk-button" 
            style={{ background: 'white', color: '#DC2626', fontWeight: 'bold' }}
            onClick={() => setShowCheatWarning(false)}
          >
            I Understand
          </button>
        </div>
      )}

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
        <CustomControlBar isTeacher={isTeacher} chatOpen={chatOpen} setChatOpen={setChatOpen} participantsOpen={participantsOpen} setParticipantsOpen={setParticipantsOpen} />
      </div>

      {/* Sidebars */}
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Chat Sidebar (Always mounted to receive messages, but visually hidden when closed) */}
        <div style={{ 
          width: '320px', 
          borderLeft: '1px solid var(--border-color)', 
          background: 'var(--card-bg)', 
          display: chatOpen ? 'flex' : 'none', 
          flexDirection: 'column' 
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>Meeting Chat</div>
          <Chat style={{ flex: 1, height: 'calc(100% - 50px)' }} />
        </div>

        {/* Participants Sidebar */}
        {participantsOpen && (
          <div style={{ width: '320px', borderLeft: '1px solid var(--border-color)', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>Participants ({participants.length})</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {participants.map(p => (
                <div key={p.identity} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-color)', padding: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary-saffron)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {(p.name || p.identity).charAt(0).toUpperCase()}
                    </div>
                    <span>{p.name || p.identity} {p === localParticipant ? "(You)" : ""}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {p.attributes?.handRaised === "true" && <Hand size={16} color="var(--primary-saffron)" />}
                    {p.attributes?.isDistracted === "true" && <AlertTriangle size={16} color="#DC2626" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
    
    const participantName = user?.displayName || user?.email?.split('@')[0] || 'Student';

    setLoading(true);
    setError('');
    
    try {
      // Use the live Vercel backend URL
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://gyan-meetv2.vercel.app';
      
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
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => window.location.href = window.location.origin + '?t=' + new Date().getTime()} 
              style={{ background: 'none', border: 'none', color: 'var(--primary-saffron)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', margin: '0 auto', padding: '8px' }}
            >
              <RefreshCw size={16}/> Check for Updates (Refresh)
            </button>
          </div>
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
        <LayoutContextProvider>
          <ErrorBoundary>
            <CustomVideoConference isTeacher={isTeacher} />
            <RoomAudioRenderer />
          </ErrorBoundary>
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
}
