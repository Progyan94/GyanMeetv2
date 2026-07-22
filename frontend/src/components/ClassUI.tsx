import { useState } from 'react';
import {
  VideoConference,
  useLocalParticipant,
  useDataChannel
} from '@livekit/components-react';
import { Hand } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ClassUI() {
  const { isTeacher } = useAuth();
  const { localParticipant } = useLocalParticipant();
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  // Set up Data Channel for "Raise Hand" feature
  const { send } = useDataChannel('raise_hand', (msg) => {
    const payload = new TextDecoder().decode(msg.payload);
    if (payload === 'toggle') {
      const pId = msg.from?.identity;
      if (pId) {
        setRaisedHands(prev => {
          const newSet = new Set(prev);
          if (newSet.has(pId)) newSet.delete(pId);
          else newSet.add(pId);
          return newSet;
        });
      }
    }
  });

  const toggleRaiseHand = () => {
    const data = new TextEncoder().encode('toggle');
    send(data, { reliable: true });
    // Also toggle for self locally
    setRaisedHands(prev => {
      const newSet = new Set(prev);
      const myId = localParticipant.identity;
      if (newSet.has(myId)) newSet.delete(myId);
      else newSet.add(myId);
      return newSet;
    });
  };





  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Main Video Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
          <VideoConference />
        </div>

        {/* Custom floating actions overlay */}
        <div style={{ 
          position: 'absolute', 
          bottom: '100px', 
          right: '20px', 
          display: 'flex', 
          gap: '10px',
          zIndex: 10
        }}>
          {!isTeacher && (
            <button 
              onClick={toggleRaiseHand} 
              className={`btn ${raisedHands.has(localParticipant.identity) ? 'btn-primary' : 'btn-glass'}`}
              title="Raise Hand"
            >
              <Hand size={20} />
            </button>
          )}
          <button 
             onClick={() => setBlurEnabled(!blurEnabled)}
             className={`btn ${blurEnabled ? 'btn-primary' : 'btn-glass'}`}
             title="Toggle Blur (Simulation)"
          >
            Blur {blurEnabled ? 'On' : 'Off'}
          </button>
        </div>

      </div>
    </div>
  );
}
