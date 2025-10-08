import { Composio } from "@composio/core";
import dotenv from "dotenv";

dotenv.config();

let composioClient = null;

function getComposioClient() {
  if (!composioClient) {
    composioClient = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY,
    });
  }
  return composioClient;
}

export async function getConnectedAccounts(req, res) {
  try {
    const { entityId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: "entityId is required" });
    }

    console.log(
      `[Composio] Fetching connected accounts for entity: ${entityId}`
    );

    const composio = getComposioClient();
    const response = await composio.connectedAccounts.list({
      userId: entityId,
    });
    const connections = response.items || [];

    console.log(`[Composio] Found ${connections.length} connections`);

    res.json({ connections });
  } catch (error) {
    console.error("[Composio] Error fetching connected accounts:", error);
    res.status(500).json({
      error: "Failed to fetch connected accounts",
      message: error.message,
    });
  }
}

export async function initiateConnection(req, res) {
  try {
    const { appName, entityId, redirectUrl, authConfigId } = req.body;

    if (!appName || !entityId) {
      return res.status(400).json({
        error: "appName and entityId are required",
      });
    }

    console.log(
      `[Composio] Initiating connection for app: ${appName}, entity: ${entityId}`
    );

    const composio = getComposioClient();
    const callbackUrl =
      redirectUrl || `${process.env.BACKEND_URL}/api/composio/callback`;

    // Get auth configs for the app to find the auth config ID
    let configId = authConfigId;
    if (!configId) {
      try {
        const authConfigs = await composio.authConfigs.list({
          toolkitSlug: appName.toLowerCase(),
        });
        if (authConfigs && authConfigs.items && authConfigs.items.length > 0) {
          configId = authConfigs.items[0].id;
          console.log(`[Composio] Using auth config ID: ${configId}`);
        }
      } catch (err) {
        console.error("[Composio] Error getting auth configs:", err.message);
      }
    }

    if (!configId) {
      return res.status(400).json({
        error:
          "No auth config found for this app. Please create one in the Composio dashboard.",
        appName,
      });
    }

    const connectionRequest = await composio.connectedAccounts.initiate(
      entityId,
      configId,
      {
        allowMultiple: true,
        callbackUrl: callbackUrl,
      }
    );

    console.log(`[Composio] Connection initiated successfully`);
    console.log(`[Composio] Redirect URL: ${connectionRequest.redirectUrl}`);

    res.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    });
  } catch (error) {
    console.error("[Composio] Error initiating connection:", error);
    res.status(500).json({
      error: "Failed to initiate connection",
      message: error.message,
    });
  }
}

export async function handleCallback(req, res) {
  try {
    console.log(`[Composio] Handling OAuth callback`);
    console.log(`[Composio] Query params:`, req.query);
    console.log(`[Composio] Full URL: ${req.url}`);

    // Composio sends different parameters, always redirect to frontend
    const frontendRedirect = `${process.env.FRONTEND_URL}/dashboard?connected=true`;

    console.log(`[Composio] Redirecting to: ${frontendRedirect}`);

    res.redirect(frontendRedirect);
  } catch (error) {
    console.error("[Composio] Error handling callback:", error);
    const errorRedirect = `${
      process.env.FRONTEND_URL
    }/?error=${encodeURIComponent(error.message)}`;
    res.redirect(errorRedirect);
  }
}

export async function getCalendarEvents(req, res) {
  try {
    const { entityId, connectedAccountId } = req.query;

    if (!entityId) {
      return res.status(400).json({ error: "entityId is required" });
    }

    console.log(`[Composio] Fetching calendar events for entity: ${entityId}`);

    const composio = getComposioClient();

    // Get connected accounts for the entity
    const connections = await composio.connectedAccounts.list({
      userId: entityId,
    });

    if (!connections.items || connections.items.length === 0) {
      return res.status(404).json({
        error: "No Google Calendar connection found for this user",
      });
    }

    // Find Google Calendar connection
    const googleConnection = connectedAccountId
      ? connections.items.find((conn) => conn.id === connectedAccountId)
      : connections.items.find((conn) => conn.toolkitSlug === "googlecalendar");

    if (!googleConnection) {
      return res.status(404).json({
        error: "Google Calendar connection not found",
      });
    }

    console.log(`[Composio] Using connection ID: ${googleConnection.id}`);
    console.log(`[Composio] Connection status: ${googleConnection.status}`);

    // Use the tools.execute API with explicit version
    console.log(
      "%c Line:174 🥒 composio.tools",
      "color:#2eafb0",
      composio.tools
    );
    const result = await composio.tools.execute("GOOGLECALENDAR_EVENTS_LIST", {
      userId: entityId,
      connectedAccountId: googleConnection.id,
      arguments: {
        maxResults: 50,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        calendarId: "primary",
      },
    });

    console.log(`[Composio] Retrieved calendar events successfully`);
    console.log(`[Composio] Result:`, JSON.stringify(result, null, 2));

    const events = result.data?.items || [];

    res.json({ events });
  } catch (error) {
    console.error("[Composio] Error fetching calendar events:", error);
    console.error("[Composio] Error details:", error.response?.data || error);
    res.status(500).json({
      error: "Failed to fetch calendar events",
      message: error.message,
      details: error.response?.data || error.details,
    });
  }
}

export async function disconnectAccount(req, res) {
  try {
    const { connectionId } = req.query;

    if (!connectionId) {
      return res.status(400).json({
        error: "connectionId is required",
      });
    }

    console.log(`[Composio] Disconnecting connection: ${connectionId}`);

    const composio = getComposioClient();
    await composio.connectedAccounts.delete(connectionId);

    console.log(`[Composio] Connection disconnected successfully`);

    res.json({ success: true });
  } catch (error) {
    console.error("[Composio] Error disconnecting account:", error);
    res.status(500).json({
      error: "Failed to disconnect account",
      message: error.message,
    });
  }
}
