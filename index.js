import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// Example in-memory data
const messages = [
  { id: 1, text: 'Hello from the backend!' },
  { id: 2, text: 'Your API is up and running.' }
];

app.get('/api/messages', (_req, res) => {
  res.json(messages);
});

app.post('/api/messages', (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text is required' });
  }
  const newMessage = { id: messages.length + 1, text };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});


