// GenAI client module for FoundIt.
// Uses Google Gemini API when VITE_GEMINI_API_KEY is configured,
// or provides intelligent campus generative fallback so features work out of the box.
//
// Architecture: Strategy pattern — each AI feature has a Gemini path and a
// deterministic fallback, selected at runtime based on key availability.

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
    console.warn('[FoundIt GenAI] Gemini call failed, using fallback:', err);
    return null;
  }
}

/** Call Gemini with image (base64) for vision tasks */
async function callGeminiVision(prompt, imageBase64, mimeType = 'image/jpeg') {
  const key = getGeminiKey();
  if (!key) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const payload = {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBase64 } },
        ],
      }],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Gemini Vision error ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt GenAI] Vision call failed:', err);
    return null;
  }
}

function parseJSON(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/```json/g, '').replace(/```/g, '').trim());
  } catch { return null; }
}

// ─── 1. AI Post Assistant ────────────────────────────────────────────────────

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

    const parsed = parseJSON(await callGemini(prompt, 'Respond only with pure JSON.'));
    if (parsed) return parsed;
  }

  await new Promise((r) => setTimeout(r, 600));

  const words = `${title} ${description}`.toLowerCase();
  let inferredCategory = category || 'Accessories';
  let inferredPrice = 0;

  if (/calc|laptop|charger|phone|headphone|earbud|lamp|macbook|ipad|dell|mouse/i.test(words)) {
    inferredCategory = 'Electronics'; inferredPrice = 500;
  } else if (/id|card|rfid|license|wallet|pan|aadhar|badge/i.test(words)) {
    inferredCategory = 'ID & Cards';
  } else if (/cycle|bike|bicycle|scooter|helmet|lock/i.test(words)) {
    inferredCategory = 'Vehicles & Cycles'; inferredPrice = 2500;
  } else if (/book|notes|textbook|kreyszig|syllabus|binder|novel/i.test(words)) {
    inferredCategory = 'Books & Notes'; inferredPrice = 300;
  } else if (/jacket|hoodie|cap|shoes|umbrella|bag|backpack/i.test(words)) {
    inferredCategory = 'Clothing & Gear'; inferredPrice = 450;
  }

  const cleanTitle = title.trim() || 'Campus Belonging';
  const capitalizedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
  const tags = [inferredCategory.split(' ')[0], ...(words.match(/[a-z0-9]{4,}/g) || [])]
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);

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

// ─── 2. AI Campus Search & Assistant ─────────────────────────────────────────

export async function askCampusAI(query, allItems = []) {
  const key = getGeminiKey();

  if (key) {
    const itemsSummary = allItems.slice(0, 15).map((it) => ({
      id: it.id, title: it.title, type: it.type, category: it.category,
      location: it.location, price: it.price, reporter: it.reporter,
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

    const parsed = parseJSON(await callGemini(prompt, 'Respond only with pure JSON.'));
    if (parsed) return parsed;
  }

  await new Promise((r) => setTimeout(r, 700));
  const qLower = query.toLowerCase();
  const qTokens = qLower.match(/[a-z0-9]{3,}/g) || [];
  const matches = allItems.filter((item) => {
    const hay = `${item.title} ${item.description} ${item.location} ${item.category} ${item.type}`.toLowerCase();
    return qTokens.some((token) => hay.includes(token));
  });
  const matchedIds = matches.slice(0, 3).map((m) => m.id);
  const answer = matches.length > 0
    ? `Found ${matches.length} relevant report${matches.length > 1 ? 's' : ''}! For example: "${matches[0].title}" reported at ${matches[0].location} by ${matches[0].reporter}.`
    : `I couldn't find any direct matches for "${query}". You can post a new report or check with the campus Security Desk.`;

  return { answer, matchedIds, tip: 'Remember to verify student credentials before meeting up in campus public zones.' };
}

// ─── 3. AI Verification Questions ────────────────────────────────────────────

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

    const parsed = parseJSON(await callGemini(prompt, 'Respond with JSON.'));
    if (parsed?.questions?.length) return parsed.questions;
  }

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
    'Approximately what time and desk location did you last have it?',
  ];
}

// ─── 4. AI Image Recognition (Gemini Vision) ────────────────────────────────

export async function recognizeItemFromImage(imageFile) {
  if (!imageFile) return null;

  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = `Analyze this image of a lost/found item on a university campus.
Return pure JSON:
{
  "title": "Descriptive item title with brand/color",
  "category": "One of: Electronics, ID & Cards, Accessories, Books & Notes, Vehicles & Cycles, Clothing & Gear",
  "description": "2-3 sentences describing the item's appearance, distinguishing features",
  "color": "Primary color",
  "brand": "Brand if identifiable, or null",
  "condition": "One of: Like New, Good Condition, Used - Works Fine, For Parts",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const raw = await callGeminiVision(prompt, base64, imageFile.type || 'image/jpeg');
  const parsed = parseJSON(raw);
  if (parsed) return parsed;

  return {
    title: 'Item (auto-detected)',
    category: 'Accessories',
    description: 'Item uploaded with photo. Please add details manually.',
    color: null, brand: null, condition: 'Good Condition',
    tags: ['photo-uploaded'],
  };
}

// ─── 5. AI Fraud/Scam Detection ─────────────────────────────────────────────

export async function analyzeListingForFraud(listing) {
  const key = getGeminiKey();

  if (key) {
    const prompt = `Analyze this campus marketplace listing for potential fraud or scam indicators.
Title: ${listing.title}
Description: ${listing.description}
Price: ₹${listing.price}
Category: ${listing.category}
Seller Trust Score: ${listing.trustScore}

Return pure JSON:
{
  "riskLevel": "low|medium|high",
  "riskScore": 0-100,
  "flags": ["list of specific concerns"],
  "recommendation": "Brief safety advice for the buyer",
  "priceAnalysis": "Whether the price seems fair, too low (scam bait), or too high"
}`;

    const parsed = parseJSON(await callGemini(prompt, 'Respond with JSON.'));
    if (parsed) return parsed;
  }

  const price = Number(listing.price) || 0;
  const trust = listing.trustScore ?? 50;
  const flags = [];
  let riskScore = 10;

  if (price > 0 && price < 50 && listing.category === 'Electronics') {
    flags.push('Unusually low price for electronics');
    riskScore += 30;
  }
  if (trust < 40) { flags.push('Low seller trust score'); riskScore += 20; }
  if ((listing.description || '').length < 20) { flags.push('Very short description'); riskScore += 15; }
  if (/urgent|immediately|today only|dm only|whatsapp/i.test(listing.description)) {
    flags.push('Pressure language detected');
    riskScore += 25;
  }

  return {
    riskLevel: riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low',
    riskScore: Math.min(riskScore, 100),
    flags: flags.length ? flags : ['No concerns detected'],
    recommendation: riskScore > 30 ? 'Meet in a public campus area and verify the item before paying.' : 'Listing looks safe. Always meet on campus.',
    priceAnalysis: price === 0 ? 'Free item — giveaway' : 'Price appears reasonable for campus marketplace',
  };
}

// ─── 6. AI Similar Item Recommendations ──────────────────────────────────────

export function findSimilarItems(targetItem, allItems, limit = 4) {
  if (!targetItem || !allItems.length) return [];

  const targetTokens = new Set(
    `${targetItem.title} ${targetItem.description} ${targetItem.category}`
      .toLowerCase().match(/[a-z0-9]{3,}/g) || []
  );

  return allItems
    .filter((item) => item.id !== targetItem.id)
    .map((item) => {
      const itemTokens = new Set(
        `${item.title} ${item.description} ${item.category}`
          .toLowerCase().match(/[a-z0-9]{3,}/g) || []
      );
      const intersection = [...targetTokens].filter((t) => itemTokens.has(t)).length;
      const union = new Set([...targetTokens, ...itemTokens]).size;
      const similarity = union > 0 ? Math.round((intersection / union) * 100) : 0;
      const categoryBonus = item.category === targetItem.category ? 20 : 0;
      return { ...item, similarityScore: Math.min(similarity + categoryBonus, 100) };
    })
    .filter((item) => item.similarityScore > 10)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

// ─── 7. AI Review Sentiment Analysis ─────────────────────────────────────────

export async function analyzeReviewSentiment(reviewText) {
  const key = getGeminiKey();

  if (key) {
    const prompt = `Analyze the sentiment of this campus marketplace review:
"${reviewText}"

Return pure JSON:
{
  "sentiment": "positive|neutral|negative",
  "score": 0.0-1.0,
  "summary": "One-line summary of the review sentiment",
  "toxicity": false,
  "keywords": ["key", "themes"]
}`;

    const parsed = parseJSON(await callGemini(prompt, 'Respond with JSON.'));
    if (parsed) return parsed;
  }

  const positive = /good|great|excellent|fast|helpful|recommended|honest|trustworthy|friendly|smooth/i;
  const negative = /bad|terrible|scam|fake|rude|slow|broken|fraud|dishonest|avoid/i;
  const toxic = /stupid|idiot|hate|trash|garbage/i;

  const isPositive = positive.test(reviewText);
  const isNegative = negative.test(reviewText);

  return {
    sentiment: isNegative ? 'negative' : isPositive ? 'positive' : 'neutral',
    score: isNegative ? 0.2 : isPositive ? 0.85 : 0.5,
    summary: isNegative ? 'Negative experience reported' : isPositive ? 'Positive interaction' : 'Neutral feedback',
    toxicity: toxic.test(reviewText),
    keywords: (reviewText.match(/[a-z]{4,}/gi) || []).slice(0, 5),
  };
}

// ─── 8. Weather-Aware Lost Item Alerts (OpenMeteo API — free) ────────────────

export async function getWeatherContext(latitude = 9.95, longitude = 76.25) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,rain,weathercode&timezone=Asia/Kolkata`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const data = await res.json();
    const current = data.current;

    const weatherCodes = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 51: 'Light drizzle', 61: 'Light rain', 63: 'Moderate rain',
      65: 'Heavy rain', 71: 'Light snow', 80: 'Rain showers', 95: 'Thunderstorm',
    };

    const isRainy = [51, 61, 63, 65, 80, 95].includes(current.weathercode);
    const weatherDesc = weatherCodes[current.weathercode] || 'Unknown';

    return {
      temperature: current.temperature_2m,
      weather: weatherDesc,
      isRainy,
      rain: current.rain,
      advice: isRainy
        ? 'Rainy weather — outdoor items may be water-damaged. Check covered areas first.'
        : current.temperature_2m > 35
          ? 'Hot weather — check shaded areas and AC rooms for items left behind.'
          : 'Good weather for campus searches. Check open areas and walkways.',
      icon: isRainy ? '🌧️' : current.temperature_2m > 35 ? '☀️' : '⛅',
    };
  } catch (err) {
    return {
      temperature: null, weather: 'Unavailable', isRainy: false, rain: 0,
      advice: 'Weather data unavailable. Check common campus lost-and-found areas.',
      icon: '🌤️',
    };
  }
}

// ─── 9. AI Description Enhancer for SEO/Searchability ────────────────────────

export async function enhanceDescription(title, description, category) {
  const key = getGeminiKey();
  if (!key) return null;

  const prompt = `Improve this campus lost & found item description for better searchability and clarity.
Title: ${title}
Original: ${description}
Category: ${category}

Return pure JSON:
{
  "enhanced": "Improved 2-3 sentence description with specific details, colors, brand hints",
  "searchKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

  return parseJSON(await callGemini(prompt, 'Respond with JSON.'));
}

// ─── 10. AI Match Explanation ────────────────────────────────────────────────

export async function explainMatch(lostItem, foundItem, matchScore) {
  const key = getGeminiKey();

  if (key) {
    const prompt = `Explain why these two campus items might be the same thing.
Lost: ${lostItem.title} — ${lostItem.description} (at ${lostItem.location})
Found: ${foundItem.title} — ${foundItem.description} (at ${foundItem.location})
Match Score: ${matchScore}%

Return pure JSON:
{
  "explanation": "2-3 sentence explanation of why these items likely match",
  "confidence": "high|medium|low",
  "verifyTips": ["What to check to confirm the match"]
}`;

    const parsed = parseJSON(await callGemini(prompt, 'Respond with JSON.'));
    if (parsed) return parsed;
  }

  return {
    explanation: `These items share similar characteristics: both are in the ${lostItem.category} category and were reported in nearby locations. The ${matchScore}% match score is based on keyword overlap, category, location proximity, and timing.`,
    confidence: matchScore > 75 ? 'high' : matchScore > 50 ? 'medium' : 'low',
    verifyTips: ['Compare photos if available', 'Ask about distinguishing marks', 'Verify serial numbers or unique features'],
  };
}
