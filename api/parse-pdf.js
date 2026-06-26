// Vercel serverless function — POST /api/parse-pdf
// Receives plain text extracted client-side from the PDF (via PDF.js),
// sends it to Claude Haiku for fast structured parsing, returns programme JSON.
//
// Required env var: ANTHROPIC_API_KEY

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a fitness coach assistant. Your job is to extract training programmes from PDFs and return them as structured JSON.`;

const USER_PROMPT = `Extract the full training programme from the text below and return it as a JSON array.

Use this exact structure — return ONLY the JSON array with no explanation, no markdown fences, nothing else:

[
  {
    "label": "Day 1",
    "sections": [
      {
        "name": "Section name (e.g. Power, Main Lifts, Accessories, Conditioning)",
        "exercises": [
          {
            "id": "unique_snake_case_id_including_day_number",
            "name": "Exercise name",
            "load": "Load description (e.g. '80kg', 'RPE 8', 'Bodyweight', '5ish kg')",
            "scheme": "Sets × Reps as a string (e.g. '4 × 8', '3 × 5', '12 × 1 EMOM')",
            "notes": "Coaching notes verbatim, or empty string",
            "weighted": true,
            "unit": "kg",
            "sets": 4,
            "prescribedReps": "8"
          }
        ]
      }
    ]
  }
]

Rules:
- Group exercises into logical sections. If the PDF has no sections, use a single section called "Exercises".
- Set weighted=true for any exercise with an external load or an RPE target.
- Set weighted=false for pure bodyweight exercises, cardio, and stretching.
- unit is usually "kg". Use "kg/hand" for carries, "kg/arm" for unilateral dumbbell work, etc.
- sets must be an integer.
- prescribedReps is always a string (e.g. "8", "30s", "2 lengths", "AMRAP").
- If the PDF includes a warmup section, include it as the last day labelled "Warmup".
- IDs must be unique across the whole programme — suffix with the day index if needed.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text field' });
  }

  let anthropicRes;
  try {
    anthropicRes = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${USER_PROMPT}\n\n---\n\n${text}`,
          },
        ],
      }),
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API', detail: err.message });
  }

  if (!anthropicRes.ok) {
    const body = await anthropicRes.text();
    return res.status(502).json({ error: 'Anthropic API error', detail: body });
  }

  const data = await anthropicRes.json();
  const text = data?.content?.[0]?.text ?? '';

  // Parse the JSON Claude returned
  let program;
  try {
    // Claude sometimes wraps in ```json ... ``` even when told not to — strip it just in case
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    program = JSON.parse(cleaned);
  } catch (err) {
    return res.status(422).json({
      error: 'Could not parse AI response as JSON',
      raw: text,
    });
  }

  return res.status(200).json({ program });
};
