import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://gyanmeet-3khfyxf1.livekit.cloud';

const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

app.post('/api/rename', async (req, res) => {
  const { roomName, identity, newName, isTeacher } = req.body;
  if (!isTeacher) return res.status(403).json({ error: 'Only teachers can rename participants' });
  if (!roomName || !identity || !newName) return res.status(400).json({ error: 'Missing parameters' });

  try {
    await roomService.updateParticipant(roomName, identity, undefined, undefined, newName);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Rename error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/remove', async (req, res) => {
  const { roomName, identity, isTeacher } = req.body;
  if (!isTeacher) return res.status(403).json({ error: 'Only teachers can remove participants' });
  if (!roomName || !identity) return res.status(400).json({ error: 'Missing parameters' });

  try {
    await roomService.removeParticipant(roomName, identity);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Remove error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/token', async (req, res) => {
  const { roomName, participantName } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName are required' });
  }

  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    return res.status(500).json({ error: 'Server misconfigured. Missing LiveKit API Key or Secret' });
  }

  try {
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({ 
      roomJoin: true, 
      room: roomName, 
      canPublish: true, 
      canSubscribe: true,
      canUpdateOwnMetadata: true 
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

app.listen(port, () => {
  console.log(`Token server running on http://localhost:${port}`);
});

export default app;
