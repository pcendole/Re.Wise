import { isSupabaseConfigured, getCurrentSession } from './supabase';

export interface RawExtractedCard {
  cardType: 'basic' | 'cloze';
  front: string;
  back: string;
  extraContext?: string;
  tags?: string[];
}

export interface GenerateCardsOptions {
  text?: string;
  imageBase64?: string;
  mimeType?: string;
  cardStyle?: 'mixed' | 'basic' | 'cloze';
  targetSubject?: string;
}

export interface AiQuotaStatus {
  date: string;
  used: number;
  limit: number;
  hasCustomKey: boolean;
  canGenerate: boolean;
}

const QUOTA_KEY = 'rewise_ai_daily_quota';
const API_KEY_STORAGE = 'rewise_gemini_api_key';
const ENDPOINT_STORAGE = 'rewise_gemini_endpoint_override';
const DAILY_FREE_LIMIT = 5;

export function getCustomApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function setCustomApiKey(key: string): void {
  if (key) localStorage.setItem(API_KEY_STORAGE, key.trim());
  else localStorage.removeItem(API_KEY_STORAGE);
}

export function getEndpointOverride(): string {
  return localStorage.getItem(ENDPOINT_STORAGE) || import.meta.env.VITE_GEMINI_ENDPOINT_OVERRIDE || '';
}

export function setEndpointOverride(url: string): void {
  if (url) localStorage.setItem(ENDPOINT_STORAGE, url.trim());
  else localStorage.removeItem(ENDPOINT_STORAGE);
}

export function getAiQuotaStatus(): AiQuotaStatus {
  const customKey = getCustomApiKey();
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    const parsed = raw ? JSON.parse(raw) : { date: today, used: 0 };
    const used = parsed.date === today ? parsed.used : 0;
    const hasCustomKey = Boolean(customKey);
    return {
      date: today,
      used,
      limit: DAILY_FREE_LIMIT,
      hasCustomKey,
      canGenerate: hasCustomKey || used < DAILY_FREE_LIMIT,
    };
  } catch {
    return { date: today, used: 0, limit: DAILY_FREE_LIMIT, hasCustomKey: Boolean(customKey), canGenerate: true };
  }
}

export function incrementAiQuota(): void {
  const today = new Date().toISOString().slice(0, 10);
  const current = getAiQuotaStatus();
  localStorage.setItem(QUOTA_KEY, JSON.stringify({ date: today, used: current.used + 1 }));
}

export async function computeSha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SYSTEM_INSTRUCTION = `You are an elite competitive exam spaced repetition tutor (NEET PG, USMLE, UPSC CSE, STEM).
Convert the user's study material into atomic flashcards adhering strictly to the Minimum Information Principle:
1. Every card must test exactly ONE isolated memory item or fact. Never bundle multi-sentence lists on one card.
2. Card types:
   - "basic": Clean question in "front", concise direct answer in "back".
   - "cloze": Natural sentence with ONE blank using {{c1::hidden answer}} syntax in "front" and the answer revealed in "back".
3. Provide high-yield memory aids, mnemonics, or textbook pearls in "extraContext".
4. Add 1-3 short high-yield topic tags (e.g. ["Pharmacology", "Autonomic"]).
Return a JSON array of objects conforming to:
[{ "cardType": "basic" | "cloze", "front": string, "back": string, "extraContext": string, "tags": string[] }]`;

export async function extractCardsWithAi(
  options: GenerateCardsOptions
): Promise<{ cards: RawExtractedCard[]; fromCache: boolean }> {
  const contentSeed = (options.text || '') + (options.imageBase64?.slice(0, 500) || '') + (options.cardStyle || '');
  if (!contentSeed.trim()) throw new Error('No text or image provided for card generation.');

  // 1. Deduplication Cache Check
  const hash = await computeSha256(contentSeed);
  const cacheKey = `rewise_aicache_${hash}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as RawExtractedCard[];
      if (Array.isArray(parsed) && parsed.length > 0) return { cards: parsed, fromCache: true };
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  // 2. Daily Free Quota Check
  const quota = getAiQuotaStatus();
  if (!quota.canGenerate) {
    throw new Error(`Daily free limit reached (${DAILY_FREE_LIMIT}/${DAILY_FREE_LIMIT}). Add a Gemini key in settings to unlock unlimited.`);
  }

  const apiKey = getCustomApiKey();
  const endpointOverride = getEndpointOverride();

  // 3. Central Supabase Edge Function Mode
  if (!apiKey && !endpointOverride && isSupabaseConfigured) {
    const session = await getCurrentSession();
    const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-studio`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify(data.cards));
        incrementAiQuota();
        return { cards: data.cards, fromCache: false };
      }
    } else if (res.status === 429) {
      const err = await res.json();
      throw new Error(err.error || 'Daily AI quota exceeded.');
    }
  }

  // 4. Offline Demo Fallback if completely unconfigured
  if (!apiKey && !endpointOverride) {
    const mockCards = generateOfflineFallbackCards(options.text || 'High-Yield Medicine & Science Concepts');
    localStorage.setItem(cacheKey, JSON.stringify(mockCards));
    incrementAiQuota();
    return { cards: mockCards, fromCache: false };
  }

  // 5. Direct Client-Side Gemini Call
  const promptText = `Subject: ${options.targetSubject || 'General Exam'}. Style: ${options.cardStyle || 'mixed'}.\nInput:\n${options.text || 'Extract from image.'}`;
  const contentsParts: any[] = [{ text: promptText }];
  if (options.imageBase64) {
    contentsParts.push({
      inlineData: { mimeType: options.mimeType || 'image/jpeg', data: options.imageBase64.replace(/^data:image\/\w+;base64,/, '') },
    });
  }

  const url = endpointOverride || `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: contentsParts }],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini error (${response.status}): ${(await response.text()).slice(0, 150)}`);

  const data = await response.json();
  const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) throw new Error('No flashcards returned from AI model.');

  let parsedCards: RawExtractedCard[] = [];
  try {
    parsedCards = JSON.parse(textOutput);
  } catch {
    const match = textOutput.match(/\[[\s\S]*\]/);
    if (match) parsedCards = JSON.parse(match[0]);
    else throw new Error('Failed to parse structured JSON from AI.');
  }

  localStorage.setItem(cacheKey, JSON.stringify(parsedCards));
  if (!quota.hasCustomKey) incrementAiQuota();

  return { cards: parsedCards, fromCache: false };
}

function generateOfflineFallbackCards(sampleText: string): RawExtractedCard[] {
  const snippet = sampleText.slice(0, 40).replace(/[\n\r]/g, ' ');
  return [
    {
      cardType: 'basic',
      front: `What is the primary mechanism or definition associated with: "${snippet}"?`,
      back: 'Rapid single-fact active recall target extracted according to the Minimum Information Principle.',
      extraContext: '💡 Offline Demo: Add your free Google Gemini API key in AI Settings for live notes extraction.',
      tags: ['Demo', 'HighYield'],
    },
    {
      cardType: 'cloze',
      front: 'In active recall theory, testing a {{c1::single atomic fact}} yields significantly higher retention.',
      back: 'single atomic fact',
      extraContext: 'Mnemonics and context are shown only after flipping to prevent prompt interference.',
      tags: ['RecallMethod', 'FSRS'],
    },
    {
      cardType: 'basic',
      front: 'Why should complex lists be split into multiple atomic flashcards?',
      back: 'To prevent the Familiarity Trap and ensure cards can be individually scheduled by FSRS difficulty.',
      extraContext: 'Piotr Wozniak 20 Rules of Formulating Knowledge: Rule 4 Minimum Information Principle.',
      tags: ['StudyTechnique'],
    },
  ];
}
