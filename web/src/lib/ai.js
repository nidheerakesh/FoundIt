// GenAI client module for FoundIt.
// Uses Google Gemini API when VITE_GEMINI_API_KEY is configured,
// or provides intelligent campus generative fallback so features work out of the box.

const GEMINI_API_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) ||
  (typeof window !== 'undefined' && window.__FOUNDIT_GEMINI_KEY__) ||
  '';

export function getGeminiKey() {
  return GEMINI_API_KEY || (typeof window !== 'undefined' ? window.localStorage.getItem('foundit_gemini_key') || '' : '');
}

export function setGeminiKey(key) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('foundit_gemini_key', key.trim());
    window.__FOUNDIT_GEMINI_KEY__ = key.trim();
  }
}

/** Call Google Gemini REST endpoint directly */
async function callGemini(prompt, systemInstruction = '') {
  const key = getGeminiKey();
  if (!key) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
    };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt GenAI] Gemini API call failed, using intelligent fallback:', err);
    return null;
  }
}

/**
 * 1. AI Post Assistant: Takes rough input and outputs a polished, categorized report with tags.
 */
export async function generatePostAssistance({ title = '', description = '', category = '', type = 'lost' }) {
  const key = getGeminiKey();

  if (key) {
    const prompt = `You are an AI assistant for FoundIt, a university campus lost & found and student marketplace.
The user wants to create a ${type} report with:
Raw Title: "${title}"
Raw Description: "${description}"
Initial Category: "${category}"

Return a valid JSON object ONLY (no markdown code blocks, no other text) with this format:
{
  "title": "A concise, specific title with brand/color/type",
  "category": "One of: Electronics, ID & Cards, Accessories, Books & Notes, Vehicles & Cycles, Clothing & Gear",
  "description": "Clear, detailed 2-3 sentence description emphasizing distinguishing marks or condition",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "suggestedPrice": 0
}`;

    const raw = await callGemini(prompt, 'Respond only with pure JSON.');
    if (raw) {
      try {
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      } catch (e) {
        // Fall through to fallback
      }
    }
  }

  // Simulated AI response delay for realistic UX
  await new Promise((r) => setTimeout(r, 600));

  const words = `${title} ${description}`.toLowerCase();
  let inferredCategory = category || 'Accessories';
  let inferredPrice = 0;

  if (/calc|laptop|charger|phone|headphone|earbud|lamp|macbook|ipad|dell|mouse/i.test(words)) {
    inferredCategory = 'Electronics';
    inferredPrice = 500;
  } else if (/id|card|rfid|license|wallet|pan|aadhar|badge/i.test(words)) {
    inferredCategory = 'ID & Cards';
    inferredPrice = 0;
  } else if (/cycle|bike|bicycle|scooter|helmet|lock/i.test(words)) {
    inferredCategory = 'Vehicles & Cycles';
    inferredPrice = 2500;
  } else if (/book|notes|textbook|kreyszig|syllabus|binder|novel/i.test(words)) {
    inferredCategory = 'Books & Notes';
    inferredPrice = 300;
  } else if (/jacket|hoodie|cap|shoes|umbrella|bag|backpack/i.test(words)) {
    inferredCategory = 'Clothing & Gear';
    inferredPrice = 450;
  }

  const cleanTitle = title.trim() || 'Campus Belonging';
  const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  const tags = [
    inferredCategory.split(' ')[0],
    ...words.match(/[a-z0-9]{4,}/g) || [],
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

  return {
    title: `${capitalizedTitle} (${inferredCategory})`,
    category: inferredCategory,
    description: description.trim()
      ? `${description.trim()} Please check with the security desk or verified owner.`
      : `Reported as ${type} on campus. Includes identifying physical markings and standard campus serial cues.`,
    tags,
    suggestedPrice: inferredPrice,
  };
}

/**
 * 2. AI Campus Search & Assistant: Answers natural language questions across the items feed.
 */
export async function askCampusAI(query, allItems = []) {
  const key = getGeminiKey();

  if (key) {
    const itemsSummary = allItems.slice(0, 15).map((it) => ({
      id: it.id,
      title: it.title,
      type: it.type,
      category: it.category,
      location: it.location,
      price: it.price,
      reporter: it.reporter,
    }));

    const prompt = `You are FoundIt AI, the intelligent campus assistant.
The student asks: "${query}"

Here are current items in the campus database:
${JSON.stringify(itemsSummary, null, 2)}

Provide a helpful, friendly 2-3 sentence answer addressing their query, citing specific item names and locations when relevant. Return pure JSON:
{
  "answer": "Your friendly answer",
  "matchedIds": ["id1", "id2"],
  "tip": "Helpful safety or recovery advice"
}`;

    const raw = await callGemini(prompt, 'Respond only with pure JSON.');
    if (raw) {
      try {
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
      } catch (e) {
        // Fall through
      }
    }
  }

  // Fallback intelligent semantic matching
  await new Promise((r) => setTimeout(r, 700));

  const qLower = query.toLowerCase();
  const qTokens = qLower.match(/[a-z0-9]{3,}/g) || [];

  const matches = allItems.filter((item) => {
    const hay = `${item.title} ${item.description} ${item.location} ${item.category} ${item.type}`.toLowerCase();
    return qTokens.some((token) => hay.includes(token));
  });

  const matchedIds = matches.slice(0, 3).map((m) => m.id);

  let answer = '';
  if (matches.length > 0) {
    const top = matches[0];
    answer = `Found ${matches.length} relevant report${matches.length > 1 ? 's' : ''} on campus! For example: "${top.title}" reported at ${top.location} by ${top.reporter}.`;
  } else {
    answer = `I couldn't find any direct matches in the live feed for "${query}". You can post a new report or check with the campus Security Desk.`;
  }

  return {
    answer,
    matchedIds,
    tip: 'Remember to verify student credentials before meeting up in campus public zones.',
  };
}

/**
 * 3. AI Verification Questions Generator: Creates 3 specific verification questions for true ownership.
 */
export async function generateVerificationQuestions(targetItem, candidateItem) {
  const key = getGeminiKey();

  if (key) {
    const prompt = `Create 3 discerning verification questions to ask a claimant to verify they are the true owner of this item.
Item: ${targetItem.title}
Description: ${targetItem.description}
Candidate match: ${candidateItem?.title || ''}

Return pure JSON:
{
  "questions": [
    "Question 1 about a specific hidden mark or sticker",
    "Question 2 about color, scratches, or accessory",
    "Question 3 about date, time or location details"
  ]
}`;

    const raw = await callGemini(prompt, 'Respond with JSON.');
    if (raw) {
      try {
        const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed.questions?.length) return parsed.questions;
      } catch (e) {
        // Fall through
      }
    }
  }

  // Fallback questions based on category
  const cat = targetItem?.category || 'General';
  if (cat === 'Electronics') {
    return [
      'Can you describe the device wallpaper, lock screen, or battery percentage when lost?',
      'Are there any serial numbers, unique scratches, or protective cover colors?',
      'Does it have any personalized cable, charger, or stickers attached?',
    ];
  } else if (cat === 'ID & Cards') {
    return [
      'What is the exact name, roll number, or department printed on the card?',
      'What color is the lanyard strap or protective plastic case?',
      'Were there any cash, receipts, or other cards stored in the sleeve?',
    ];
  }

  return [
    `Can you describe any unique stickers, dents, or distinguishing marks on the ${targetItem?.title || 'item'}?`,
    'What exact brand, model, or capacity is the item?',
    `Approximately what time and desk location did you last have it?`,
  ];
}
