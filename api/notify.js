// Vercel serverless function — sends FCM push notifications
// Called by Firestore trigger via the app when a message is saved

const SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "skychat-aad20",
  private_key_id: "d1317761fa350a785def28a2d765895440fe7a8b",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQD0crD7mDsQwftZ\n1P4v7nQ1NV0IEZ7bJjsgL3Om5umJ3Mk+YPmGKBVslpE8Wkwd3REkPFxAMsmPOhYL\nQRPUPidVZ1m9SPsjLCaDzdEbccm5uS4R8E9RzH68/TpWIpXX0E4R3hbV+KNKLoxN\n+kC7rXkKcLI7hIC+8iZPr9I3zXJr1zzXEXe0sssXgpj0sE+cJnlNJb5/xv/0+7vM\neRCIO0VKjn8zI7PxUk0qy0NZOS2/v7RwfiZ1HfspLE+sOE9FxSlKiFaEvQ1icNH1\nhwezgyu2Sf6ZRDQmRCGHe8cjO36pSZOwijsJlzJrMow1ohSP3iggwBY6FzoLsCS/\nVe40TUWdAgMBAAECggEAD5QN6zbK0C5V7FC/3ez1Jcfvv296CiQqq/TXir6CtHO9\nioFnyDDemVPoz78Ubz8dqXYZo0i+oidU7M+EqefHyMWkSS/GZiSD6YNGF9joVB2f\noz/cmjgCqAd+U9YdP7VJfbzY2Tbg1yiAw15sXi7iZ3PXqVCFhkW3LdMPaK7Uji03\n5u/b63a9dH4cEVLRPDYQk+eJ+dOL2tdL4zZAcl6miXZYqjxTaxzGlHvJ6KrZeyr/\ngy9rvBBwbByPpVWV6ufNdoI67IIeNzmOPZODxhepUpemNUwn4eSaTf9Ht/hqCr9q\nFJxMVfKCmCutwID4hfqndEXu6beSdMh7pk80wkQniQKBgQD/wPSsc3UfpVeTZY0C\n/vGUi26/WkYwzkZ+SHNYfK86LVDY5FfSXRyjr8jFjxCzB1HW8/zZ++3W3neci+fI\n/Xzim6S3QMgsAupUWFem15Hk4jIXrJopMo7c6LyIVeBT79269FCf0oQqonxD9g8h\nLHXZGkq6eIFZM+Kwc2nJtW+2tQKBgQD0rvLcvAn6a12Un6s3I5NZvQi0NmS4YykF\nZoLKQeDZfA9MYmFkxHjRgUetuCHMp34p2PtHaEaKXSVsm9Aowh8dba+XuM0Pq4ir\nMtL5+Gw1DY7uoBCsgpSZ+zrFOFt3rep9pUMycC8ylj7A0rejgoN4n3NJ3plTX/Nj\npcNOaDj8SQKBgG9pGezJuvrXJwhBk6T7dDd2af8Xjz4RjanTW9PvNNIODYr+Jbew\n8hnoKHjPMsIabS9LSBmZYmlYrhhW5dirfCynCqD9qnVpq7Ska0J148smMhYYDWvm\n508aX46wgjFua1PWvAxzQznjYGimlr6nxIqXpngGqKo4LQcar7m7vPeFAoGAJ3Db\n7QDSiu8rkn16V9UAN4LlGEd8TMyPHDO9+WRNHkGFJcbl9BxHbV3tc+8uY5LMH2q+\ndnA0jrEdCzjCgQ9pfJDlsQs04sW/rfjvUSPeLV8WHxjmFyilU3zPqGLBO7VpCv/M\nqSC0Ou9FBkfxGgY7swHgz5N2G55n2TQrG0RpiyECgYBFqOhUdCmor8tuZ/Ch8Hq5\nfLRwrMCdGtOXyHEPJmac7HS/TxgnuwM4+dgBq0zhoM6qW3CF9/SWZ4XoEMS6S2xo\n6aL1LLXvLFqH9CuVdfOewptKma39DSYy7Hx7jFxoQxkQKnV4L3++zJPO0J1FbaMZ\nPj5OXSCvLRtCxSLYH8Tg7g==\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@skychat-aad20.iam.gserviceaccount.com",
  client_id: "117047208555966596281",
  token_uri: "https://oauth2.googleapis.com/token"
};

// Get OAuth2 access token from Google
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: SERVICE_ACCOUNT.token_uri,
    iat: now,
    exp: now + 3600
  };

  const encode = obj => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import private key and sign
  const pemContents = SERVICE_ACCOUNT.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const privateKey = await crypto.subtle.importKey(
    'pkcs8', binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', privateKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;

  const tokenRes = await fetch(SERVICE_ACCOUNT.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, title, body, sender } = req.body;
    if (!token) return res.status(400).json({ error: 'No token provided' });

    const accessToken = await getAccessToken();

    const message = {
      message: {
        token,
        notification: { title, body },
        android: { priority: 'high', notification: { sound: 'default', channel_id: 'skychat' } },
        apns: {
          payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } },
          headers: { 'apns-priority': '10' }
        },
        data: { sender: sender || '' }
      }
    };

    const fcmRes = await fetch(
      `https://fcm.googleapis.com/v1/projects/skychat-aad20/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(message)
      }
    );

    const fcmData = await fcmRes.json();
    if (!fcmRes.ok) return res.status(fcmRes.status).json({ error: fcmData.error?.message || 'FCM error' });
    return res.status(200).json({ success: true, messageId: fcmData.name });

  } catch (error) {
    console.error('Notify error:', error);
    return res.status(500).json({ error: error.message });
  }
}
