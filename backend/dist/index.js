"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const livekit_server_sdk_1 = require("livekit-server-sdk");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://gyanmeet-3khfyxf1.livekit.cloud';
const roomService = new livekit_server_sdk_1.RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
app.post('/api/rename', async (req, res) => {
    const { roomName, identity, newName, isTeacher } = req.body;
    if (!isTeacher)
        return res.status(403).json({ error: 'Only teachers can rename participants' });
    if (!roomName || !identity || !newName)
        return res.status(400).json({ error: 'Missing parameters' });
    try {
        await roomService.updateParticipant(roomName, identity, undefined, undefined, newName);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/remove', async (req, res) => {
    const { roomName, identity, isTeacher } = req.body;
    if (!isTeacher)
        return res.status(403).json({ error: 'Only teachers can remove participants' });
    if (!roomName || !identity)
        return res.status(400).json({ error: 'Missing parameters' });
    try {
        await roomService.removeParticipant(roomName, identity);
        res.json({ success: true });
    }
    catch (error) {
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
        const at = new livekit_server_sdk_1.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
            identity: participantName,
            name: participantName,
        });
        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
        const token = await at.toJwt();
        res.json({ token });
    }
    catch (error) {
        console.error('Error generating token:', error);
        res.status(500).json({ error: 'Failed to generate token' });
    }
});
app.listen(port, () => {
    console.log(`Token server running on http://localhost:${port}`);
});
exports.default = app;
