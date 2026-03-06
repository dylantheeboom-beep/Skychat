export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { text, fromLang, context, apiKey, mode, transcript, lang, words } = req.body;

    const callClaude = async (system, userMsg, maxTokens = 350) => {
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

    // ── TRANSLATE ─────────────────────────────────────────────────────────
    if (mode === 'translate') {
      const isEnToTh = fromLang === 'en';
      const system = isEnToTh
        ? `You are a translator for a couple's chat app. The man is Australian (casual English), the woman is Thai from the Isaan/Northern region (speaks Isaan-influenced Thai, not formal Bangkok Thai).
Translate English to Thai naturally. Use informal, warm Thai that feels natural to an Isaan speaker — avoid overly formal Bangkok Thai phrasing.
Return JSON only, no markdown:
{"translation":"Thai text","romanization":"phonetic romanization","confidence":"high|medium|low","note_en":"brief cultural note in English if useful, else empty","note_th":"same note in Thai if useful, else empty"}`
        : `You are a translator for a couple's chat app. The woman is Thai from Isaan/Northern Thailand, the man is Australian.
Translate Thai (possibly Isaan-influenced) to natural casual Australian English.
Account for Isaan dialect differences from Central Thai where relevant.
Return JSON only, no markdown:
{"translation":"English text","confidence":"high|medium|low","note_en":"brief cultural/dialect note in English if useful, else empty","note_th":"same note in Thai if useful, else empty"}`;

      let result = await callClaude(system, `Translate: "${text}"${context ? `\nContext: ${context}` : ''}`);
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json(JSON.parse(result)); }
      catch { return res.status(200).json({ translation: result, confidence: 'medium', note_en: '', note_th: '' }); }
    }

    // ── TRANSCRIBE ────────────────────────────────────────────────────────
    if (mode === 'transcribe') {
      const cleaned = await callClaude(
        `Clean up this ${lang === 'th' ? 'Thai (possibly Isaan dialect)' : 'Australian English'} speech transcript. Fix errors, punctuation. Return ONLY the cleaned text.`,
        `Clean: "${transcript}"`
      );
      return res.status(200).json({ transcript: cleaned.trim() });
    }

    // ── LEARN THAI WORD ───────────────────────────────────────────────────
    if (mode === 'learn_thai') {
      let result = await callClaude(
        `You are a Thai language teacher. The student is Australian learning Thai, his girlfriend is from Isaan/Northern Thailand.
Note any Isaan dialect variations that are relevant.
Return JSON only, no markdown:
{"thai":"","romanization":"","meaning_en":"meaning in English","meaning_th":"ความหมายเป็นภาษาไทย","example_thai":"","example_english":"","example_romanization":"","tone_note":"","isaan_note":"any Isaan variation if relevant, else empty"}`,
        `Explain Thai word/phrase: "${text}". Context: "${context || ''}"`, 500
      );
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json({ result: JSON.parse(result) }); }
      catch { return res.status(200).json({ result: {} }); }
    }

    // ── LEARN ENGLISH WORD ────────────────────────────────────────────────
    if (mode === 'learn_english') {
      let result = await callClaude(
        `You are an English teacher for Thai speakers from Isaan/Northern Thailand.
Explain English words in a way that's accessible and warm. Include Thai explanations.
Return JSON only, no markdown:
{"word":"","pronunciation_tip":"","meaning_en":"","meaning_th":"ความหมายเป็นภาษาไทย","example_english":"","example_thai":"","australian_note":"any Australian English slang notes if relevant, else empty"}`,
        `Explain English word/phrase: "${text}". Context: "${context || ''}"`, 500
      );
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json({ result: JSON.parse(result) }); }
      catch { return res.status(200).json({ result: {} }); }
    }

    // ── MANUAL ADD SINGLE WORD ────────────────────────────────────────────
    if (mode === 'add_word') {
      const isLearningThai = fromLang === 'en'; // Dylan adding Thai, her adding English
      let result = await callClaude(
        isLearningThai
          ? `Thai language teacher. Student is Australian, girlfriend is Isaan Thai. Return JSON only: {"thai":"","romanization":"","meaning_en":"","meaning_th":"","example_thai":"","example_english":"","example_romanization":"","tone_note":"","isaan_note":""}`
          : `English teacher for Isaan Thai speaker. Return JSON only: {"word":"","pronunciation_tip":"","meaning_en":"","meaning_th":"","example_english":"","example_thai":"","australian_note":""}`,
        `Explain: "${text}"`, 500
      );
      result = result.replace(/```json|```/g, '').trim();
      try { return res.status(200).json({ result: JSON.parse(result), mode: isLearningThai ? 'learn_thai' : 'learn_english' }); }
      catch { return res.status(200).json({ result: {}, mode: 'learn_thai' }); }
    }

    // ── BULK ADD WORDS ────────────────────────────────────────────────────
    if (mode === 'add_words_bulk') {
      const wordList = words || [];
      const isLearningThai = fromLang === 'en';
      const results = [];
      for (const w of wordList.slice(0, 20)) {
        let result = await callClaude(
          isLearningThai
            ? `Thai language teacher. Return JSON only: {"thai":"","romanization":"","meaning_en":"","meaning_th":"","example_thai":"","example_english":"","example_romanization":"","tone_note":"","isaan_note":""}`
            : `English teacher for Thai speaker. Return JSON only: {"word":"","pronunciation_tip":"","meaning_en":"","meaning_th":"","example_english":"","example_thai":"","australian_note":""}`,
          `Explain: "${w}"`, 400
        );
        result = result.replace(/```json|```/g, '').trim();
        try { results.push({ ...JSON.parse(result), mode: isLearningThai ? 'learn_thai' : 'learn_english' }); }
        catch { results.push({ thai: w, meaning_en: w, mode: 'learn_thai' }); }
      }
      return res.status(200).json({ results });
    }

    return res.status(400).json({ error: 'Invalid mode' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
