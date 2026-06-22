const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Shared guardrail injected into every prompt in this service.
const SAFETY_PREAMBLE = `You are a medical records organization assistant, not a clinician.
Rules you must always follow:
- Do NOT give medical advice, diagnoses, treatment recommendations, or dosage guidance.
- Do NOT speculate about conditions the records don't already state.
- Only summarize, organize, or plain-language-explain what is already written.
- If the input is ambiguous or incomplete, say so rather than guessing.
- Always include a brief reminder to consult a licensed healthcare professional for any
  medical decisions.`;

function formatRecordsForPrompt(records) {
  return records
    .map((r, i) => {
      const date = r.date ? new Date(r.date).toISOString().split('T')[0] : 'unknown date';
      return `${i + 1}. [${r.type}] ${r.title} (${date})${r.description ? ` - ${r.description}` : ''}`;
    })
    .join('\n');
}

/**
 * Summarizes a user's full record set into a short structured overview.
 * Input: array of record rows ({ type, title, description, date })
 * Output: { summary, currentMedications, diagnoses, keyNotes }
 */
async function summarizeRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      summary: 'No records available to summarize.',
      currentMedications: [],
      diagnoses: [],
      keyNotes: [],
    };
  }

  const prompt = `${SAFETY_PREAMBLE}

Here is a patient's medical record list:
${formatRecordsForPrompt(records)}

Respond ONLY with valid JSON in this exact shape, no markdown fences, no extra text:
{
  "summary": "2-4 sentence plain-language overview of this record history",
  "currentMedications": ["list of medications mentioned, empty array if none"],
  "diagnoses": ["list of diagnoses mentioned, empty array if none"],
  "keyNotes": ["short bullet points worth flagging, e.g. upcoming appointments, recent abnormal labs as stated in the records"]
}`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  return safeParseJson(completion.choices[0].message.content);
}

/**
 * Categorizes a raw piece of text into one of the app's record types.
 * Input: raw text (e.g. pasted from a scanned document or doctor's note)
 * Output: { category, confidence, reasoning }
 */
async function organizeRecord(text) {
  if (!text || !text.trim()) {
    throw new Error('text is required');
  }

  const prompt = `${SAFETY_PREAMBLE}

Classify the following text into exactly one category from this list:
consultation, diagnosis, lab, prescription, medication, appointment, other.

Text:
"""${text}"""

Respond ONLY with valid JSON, no markdown fences:
{
  "category": "one of the allowed category values",
  "confidence": "high | medium | low",
  "reasoning": "one short sentence explaining why"
}`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  return safeParseJson(completion.choices[0].message.content);
}

/**
 * Explains medical jargon in plain language.
 * Input: raw medical text
 * Output: { explanation }
 */
async function explainMedicalText(text) {
  if (!text || !text.trim()) {
    throw new Error('text is required');
  }

  const prompt = `${SAFETY_PREAMBLE}

Explain the following medical text in simple, plain language a non-medical person
could understand. Do not add advice, interpretation of severity, or next steps beyond
what is written. Keep it to 3-6 sentences.

Text:
"""${text}"""

Respond ONLY with valid JSON, no markdown fences:
{ "explanation": "your plain-language explanation here" }`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });

  return safeParseJson(completion.choices[0].message.content);
}

function safeParseJson(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error('AI service returned a non-JSON response: ' + cleaned.slice(0, 200));
  }
}

module.exports = { summarizeRecords, organizeRecord, explainMedicalText };
