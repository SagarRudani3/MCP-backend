import { Composio } from '@composio/core';
import dotenv from 'dotenv';

dotenv.config();

let composioClient = null;

function getComposioClient() {
  if (!composioClient) {
    const composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY
    });
    composioClient = composio.getClient();
  }
  return composioClient;
}

export async function getConnectedAccounts(req, res) {
  try {
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    console.log(`[Composio] Fetching connected accounts for entity: ${entityId}`);

    const client = getComposioClient();
    const response = await client.connectedAccounts.list({ entityId });
    const connections = response.items || [];

    console.log(`[Composio] Found ${connections.length} connections`);

    res.json({ connections });
  } catch (error) {
    console.error('[Composio] Error fetching connected accounts:', error);
    res.status(500).json({
      error: 'Failed to fetch connected accounts',
      message: error.message
    });
  }
}

export async function initiateConnection(req, res) {
  try {
    const { appName, entityId, redirectUrl } = req.body;

    if (!appName || !entityId) {
      return res.status(400).json({
        error: 'appName and entityId are required'
      });
    }

    console.log(`[Composio] Initiating connection for app: ${appName}, entity: ${entityId}`);

    const client = getComposioClient();
    const callbackUrl = redirectUrl || `${process.env.BACKEND_URL}/api/composio/callback`;

    const connection = await client.link.create({
      appName: appName.toLowerCase(),
      entityId,
      redirectUrl: callbackUrl
    });

    console.log(`[Composio] Connection initiated successfully`);
    console.log(`[Composio] Redirect URL: ${connection.redirectUrl}`);

    res.json({
      redirectUrl: connection.redirectUrl,
      connectionId: connection.connectionId
    });
  } catch (error) {
    console.error('[Composio] Error initiating connection:', error);
    res.status(500).json({
      error: 'Failed to initiate connection',
      message: error.message
    });
  }
}

export async function handleCallback(req, res) {
  try {
    console.log(`[Composio] Handling OAuth callback`);
    console.log(`[Composio] Query params:`, req.query);
    console.log(`[Composio] Full URL: ${req.url}`);

    // Composio sends different parameters, always redirect to frontend
    const frontendRedirect = `${process.env.FRONTEND_URL}/?connected=true`;

    console.log(`[Composio] Redirecting to: ${frontendRedirect}`);

    res.redirect(frontendRedirect);
  } catch (error) {
    console.error('[Composio] Error handling callback:', error);
    const errorRedirect = `${process.env.FRONTEND_URL}/?error=${encodeURIComponent(error.message)}`;
    res.redirect(errorRedirect);
  }
}

export async function getCalendarEvents(req, res) {
  try {
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId is required' });
    }

    console.log(`[Composio] Fetching calendar events for entity: ${entityId}`);

    const client = getComposioClient();

    const result = await client.tools.execute({
      actionName: 'GOOGLECALENDAR_LIST_EVENTS',
      entityId,
      params: {
        maxResults: 50,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      }
    });

    console.log(`[Composio] Retrieved calendar events successfully`);

    const events = result.data?.items || result.items || [];

    res.json({ events });
  } catch (error) {
    console.error('[Composio] Error fetching calendar events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: error.message
    });
  }
}

export async function disconnectAccount(req, res) {
  try {
    const { connectionId } = req.query;

    if (!connectionId) {
      return res.status(400).json({
        error: 'connectionId is required'
      });
    }

    console.log(`[Composio] Disconnecting connection: ${connectionId}`);

    const client = getComposioClient();
    await client.connectedAccounts.delete({ connectedAccountId: connectionId });

    console.log(`[Composio] Connection disconnected successfully`);

    res.json({ success: true });
  } catch (error) {
    console.error('[Composio] Error disconnecting account:', error);
    res.status(500).json({
      error: 'Failed to disconnect account',
      message: error.message
    });
  }
}
