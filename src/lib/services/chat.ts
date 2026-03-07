/**
 * Chat notification service
 * Posts delivery links to Twitch/Kick chat when a build completes.
 *
 * Twitch: POST /helix/chat/messages (requires TWITCH_USER_ACCESS_TOKEN)
 * Kick:   POST /public/v1/chat (requires app access token)
 */

/** Post a message to Twitch chat as the broadcaster */
async function postTwitchChat(donorName: string, deliveryUrl: string): Promise<void> {
  const token = process.env.TWITCH_USER_ACCESS_TOKEN;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const broadcasterId = process.env.TWITCH_BROADCASTER_ID;

  if (!token || !clientId || !broadcasterId) {
    console.warn("[chat] Twitch chat not configured — skipping notification");
    return;
  }

  const message = `@${donorName} your build is ready! Repo + live preview: ${deliveryUrl}`;

  const res = await fetch("https://api.twitch.tv/helix/chat/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Client-Id": clientId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: broadcasterId,
      message,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[chat] Twitch chat post failed (${res.status}):`, body);
  } else {
    console.log(`[chat] Twitch chat notified: ${message}`);
  }
}

/** Post a message to Kick chat */
async function postKickChat(donorName: string, deliveryUrl: string): Promise<void> {
  const token = process.env.KICK_USER_ACCESS_TOKEN;
  const channelId = process.env.KICK_BROADCASTER_ID;

  if (!token || !channelId) {
    console.warn("[chat] Kick chat not configured — skipping notification");
    return;
  }

  const message = `@${donorName} your build is ready! Repo + live preview: ${deliveryUrl}`;

  const res = await fetch(`https://api.kick.com/public/v1/chat`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ broadcaster_user_id: Number(channelId), content: message, type: "message" }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[chat] Kick chat post failed (${res.status}):`, body);
  } else {
    console.log(`[chat] Kick chat notified: ${message}`);
  }
}

/** Notify the donor in the appropriate platform chat */
export async function notifyDonorInChat(
  source: string,
  donorName: string,
  deliveryUrl: string
): Promise<void> {
  try {
    if (source === "twitch") await postTwitchChat(donorName, deliveryUrl);
    else if (source === "kick") await postKickChat(donorName, deliveryUrl);
  } catch (err) {
    // Never let a chat failure break the build pipeline
    console.error("[chat] Notification error:", err);
  }
}
