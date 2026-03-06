export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, fromLang, context, apiKey, mode, transcript, lang } = req.body;

    const callClaude = async (system, userMsg, maxTokens = 300) => {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: userMsg }]
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error?.message || 'API error');
      return d.content?.[0]?.text || '';
    };

    if (mode === 'translate') {
      const isEnToTh = fromLang === 'en';
      const system = isEnToTh
        ? `Translator for couple's chat. Australian man to Thai woman. Translate English to Thai naturally and conversationally. Return JSON only: {"translation":"Thai text","romanization":"phonetic romanization","confidence":"high|medium|low","note":""}`
        : `Translator for couple's chat. Thai woman to Australian man. Translate Thai to English naturally. Return JSON only: {"translation":"English text","confidence":"high|medium|low","note":""}`;

      let result = await callClaude(system, `Translate: "${text}"${context ? `\nContext: ${context}` : ''}`);
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json(JSON.parse(result)); }
      catch { return res.status(200).json({ translation: result, confidence: 'medium' }); }
    }

    if (mode === 'transcribe') {
      const cleaned = await callClaude(
        `Clean up this ${lang === 'th' ? 'Thai' : 'English'} speech transcript. Fix obvious errors and punctuation. Return ONLY the cleaned text, nothing else.`,
        `Clean: "${transcript}"`
      );
      return res.status(200).json({ transcript: cleaned.trim() });
    }

    if (mode === 'learn_thai') {
      let result = await callClaude(
        'Thai language teacher. Return JSON only, no markdown: {"thai":"","romanization":"","meaning":"","example_thai":"","example_english":"","tone_note":""}',
        `Explain Thai word: "${text}". Context: "${context || ''}"`, 400
      );
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json({ result: JSON.parse(result) }); }
      catch { return res.status(200).json({ result: {} }); }
    }

    if (mode === 'learn_english') {
      let result = await callClaude(
        'English teacher for Thai speakers. Return JSON only, no markdown: {"word":"","thai_meaning":"","example_english":"","example_thai":"","pronunciation_tip":""}',
        `Explain English word: "${text}". Context: "${context || ''}"`, 400
      );
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json({ result: JSON.parse(result) }); }
      catch { return res.status(200).json({ result: {} }); }
    }

    return res.status(400).json({ error: 'Invalid mode' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

