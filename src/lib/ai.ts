import { looksReal } from './config'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  The skill coach — Google Gemini over plain fetch
 *
 *  SERVER ONLY. `GEMINI_API_KEY` has no NEXT_PUBLIC_ prefix on purpose: a key in
 *  a client bundle is a key anyone can spend.
 *
 *  No SDK. One HTTPS call with `fetch` does everything we need and keeps
 *  package.json untouched, which matters for a project that has to install on
 *  campus wifi.
 *
 *  Getting a key takes about two minutes and costs nothing — README →
 *  "The free AI skill coach" has the click-by-click.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_KEY = process.env.GEMINI_API_KEY ?? ''

/** True when a usable key is present. `/learn` falls back to a canned path otherwise. */
export const hasGemini = looksReal(API_KEY) && !API_KEY.includes('YOUR')

/**
 * gemini-2.5-flash is the right pick here: it is on the free tier, it is fast
 * enough that a learner is not left staring at a spinner, and a study plan does
 * not need a frontier model.
 */
const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export interface CoachRequest {
  skill: string
  goal: string
  /** Hours a week the learner can actually give it. */
  hours: number
}

const SYSTEM_PROMPT = `You are a patient teacher writing for a student in Varanasi, India who wants to learn a skill well enough to be paid for it on a local gig marketplace.

Rules:
- Answer as a numbered plan of exactly 5 steps.
- Each step: a bold short title, then 2-3 sentences of plain instruction.
- Name specific FREE resources by name (YouTube channels, freeCodeCamp, official docs, NPTEL, Khan Academy). Never link to anything paid.
- Step 5 must describe a small portfolio piece they can show a hirer, and roughly what that skill earns per gig in rupees.
- No preamble, no sign-off, no markdown headings. Plain text with numbers.
- Under 400 words total.`

function buildPrompt(req: CoachRequest): string {
  return [
    `Skill to learn: ${req.skill}`,
    `What they want to be able to do: ${req.goal}`,
    `Time available: about ${req.hours} hours a week`,
  ].join('\n')
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

/**
 * Ask Gemini for a learning path.
 *
 * Returns null rather than throwing when the key is absent, so the caller can
 * fall through to the built-in curriculum without a try/catch around normal
 * behaviour. Genuine failures (network, quota, a blocked prompt) throw with a
 * message worth showing.
 */
export async function askCoach(req: CoachRequest): Promise<string | null> {
  if (!hasGemini) return null

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(req) }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 900 },
    }),
    // A learner will wait a few seconds, not thirty.
    signal: AbortSignal.timeout(20_000),
  })

  const data = (await response.json().catch(() => ({}))) as GeminiResponse

  if (!response.ok) {
    const detail = data.error?.message ?? `HTTP ${response.status}`
    if (response.status === 429) {
      throw new Error('Gemini’s free-tier rate limit kicked in. Wait a minute and ask again.')
    }
    if (response.status === 400 && /API key/i.test(detail)) {
      throw new Error('Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.')
    }
    throw new Error(`Gemini said: ${detail}`)
  }

  if (data.promptFeedback?.blockReason) {
    throw new Error('Gemini declined that request. Try describing the skill differently.')
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim()

  return text ? text : null
}
