export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, fromLang, toLang, context, apiKey, mode } = req.body;

    let systemPrompt = '';

    if (mode === 'translate') {
      if (fromLang === 'en') {
        systemPrompt = `You are a precise English to Thai translator for a couple's chat app. The man is Australian, the woman is Thai. Translate naturally and conversationally. Return ONLY the Thai translation followed by romanization in parentheses. Format exactly: "Thai text (romanization)". Preserve tone and emotion perfectly.${context ? ` Recent conversation context: ${context}` : ''}`;
      } else {
        systemPrompt = `You are a precise Thai to English translator for a couple's chat app. The woman is Thai, the man is Australian. Translate naturally and conversationally. Return ONLY the English translation. Preserve tone and emotion accurately. If there's important cultural nuance, add a brief note in [brackets].${context ? ` Recent conversation context: ${context}` : ''}`;
      }
    } else if (mode === 'learn_thai') {
      systemPrompt = 'You are a Thai language teacher. Return JSON only, no markdown: {"thai":"","romanization":"","meaning":"","example_thai":"","example_english":"","tone_note":""}';
    } else if (mode === 'learn_english') {
      systemPrompt = 'You are an English language teacher for Thai speakers. Return JSON only, no markdown: {"word":"","thai_meaning":"","example_english":"","example_thai":"","pronunciation_tip":""}';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: mode === 'translate' ? `Translate: "${text}"` : `Explain: "${text}". Context: "${context || ''}"` }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'API error' });
    }

    return res.status(200).json({ result: data.content?.[0]?.text || '' });

  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: error.message });
  }
}

