import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getConnectedAccounts,
  initiateConnection,
  handleCallback,
  getCalendarEvents,
  disconnectAccount
} from './routes/composio.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const FRONTEND_URL = process.env.FRONTEND_URL ||"https://meeting-calendar-rho.vercel.app/"|| 'http://localhost:5173';
const allowedOrigins=[
  "https://meeting-calendar-rho.vercel.app",
"https://meeting-calendar-rho.vercel.app/",
  "http://localhost:5173"

  
]
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get('/api/composio/connectedAccounts', getConnectedAccounts);

app.post('/api/composio/initiate', initiateConnection);

app.get('/api/composio/callback', handleCallback);

app.get('/api/calendar/events', getCalendarEvents);

app.delete('/api/composio/disconnect', disconnectAccount);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    composioApiKey: process.env.COMPOSIO_API_KEY ? 'configured' : 'missing'
  });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`🌐 Backend URL: ${BACKEND_URL}`);
  console.log(`📡 CORS enabled for: ${FRONTEND_URL}`);
  console.log(`🔗 OAuth Callback: ${BACKEND_URL}/api/composio/callback`);
  console.log(`🔑 Composio API Key: ${process.env.COMPOSIO_API_KEY ? '✓ Configured' : '✗ Missing'}\n`);
});
