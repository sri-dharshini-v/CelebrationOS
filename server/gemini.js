/**
 * CelebrationOS Gemini AI Generation Service
 * 
 * Powered by Google GenAI SDK (@google/genai)
 * Enforces structured outputs, multilingual prompts, and backend invariant validation.
 */

import { GoogleGenAI } from '@google/genai';
import { EVENT_PLAN_RESPONSE_SCHEMA, MOCK_EVENT_PLANS } from './schemas.js';
import { validateAndNormalizePlan, round2 } from './invariants.js';

/**
 * Checks if a valid, non-placeholder Gemini API key is configured
 */
export function isGeminiKeyConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key_here');
}

/**
 * Builds culturally tailored system instructions based on the requested language
 */
function buildSystemInstruction(language = 'en') {
  if (language === 'ta') {
    return `நீங்கள் CelebrationOS-இன் முதன்மை செயற்கை நுண்ணறிவு விழா திட்டமிடுபவர்.
அனைத்து தலைப்புகள், செலவுப் பிரிவுகள், சடங்கு விளக்கங்கள், கால அட்டவணைகள் மற்றும் பரிந்துரைகளை தூய, எழிலான தமிழ் மொழியில் (தமிழ் யுனிகோட்) எழுதவும்.
இந்திய கலாச்சாரம், தமிழ்ப் பாரம்பரிய சடங்குகள் (முகூர்த்தம், காசி யாத்திரை, நாதஸ்வரம்) மற்றும் குடும்ப மதிப்பீடுகளுக்கு முதலிடம் வழங்கவும்.`;
  }

  if (language === 'hi') {
    return `आप CelebrationOS के मुख्य जेनरटिव एआई उत्सव और आयोजन योजनाकार हैं।
सभी शीर्षक, बजट श्रेणियां, धार्मिक व पारंपरिक अनुष्ठान विवरण, समय-सीमा और सिफारिशें स्पष्ट एवं सुरुचिपूर्ण हिन्दी (देवनागरी) में लिखें।
भारतीय संस्कृति, पारम्परिक वैदिक रीति-रिवाजों (शुभ लग्न, फेरे, कन्यादान) तथा पारिवारिक प्राथमिकताओं को पूरा महत्व दें।`;
  }

  return `You are CelebrationOS's elite GenAI celebration and event architect.
Plan weddings, birthdays, and community gatherings with meticulous detail, respect for cultural traditions, realistic budgets, and balanced schedules.`;
}

/**
 * Generates an event plan using either real Gemini API or the built-in mock fallback
 */
export async function generateEventPlan(eventRequest, options = {}) {
  const {
    title = 'Celebration Event',
    eventType = 'wedding',
    date = '2027-02-14',
    location = 'Local City',
    guestCount = 200,
    totalBudget = 1000000,
    currency = 'INR',
    theme = 'Modern Classic',
    notes = '',
    language = 'en',
    protectedRituals = []
  } = eventRequest;

  const baselinePlan = options.baselinePlan || null;
  const forceMock = options.forceMock || !isGeminiKeyConfigured();

  let rawPlan = null;

  if (forceMock) {
    // -------------------------------------------------------------
    // Resilient Mock Mode (Active when no API key is provided)
    // -------------------------------------------------------------
    const langKey = (language === 'ta' || language === 'hi') ? language : 'en';
    const baseMock = JSON.parse(JSON.stringify(MOCK_EVENT_PLANS[langKey]));

    // Personalize mock plan to match incoming user specifications
    baseMock.eventDetails.title = title || baseMock.eventDetails.title;
    baseMock.eventDetails.eventType = eventType || baseMock.eventDetails.eventType;
    baseMock.eventDetails.date = date || baseMock.eventDetails.date;
    baseMock.eventDetails.location = location || baseMock.eventDetails.location;
    baseMock.eventDetails.guestCount = Number(guestCount) || baseMock.eventDetails.guestCount;
    baseMock.eventDetails.totalBudget = Number(totalBudget) || baseMock.eventDetails.totalBudget;
    baseMock.eventDetails.currency = currency || baseMock.eventDetails.currency;
    baseMock.eventDetails.theme = theme || baseMock.eventDetails.theme;
    baseMock.eventDetails.language = langKey;
    baseMock.eventDetails.notes = notes || baseMock.eventDetails.notes;

    // Scale budget categories proportionally to the user's totalBudget
    const scaleFactor = baseMock.eventDetails.totalBudget / 1500000;
    baseMock.budgetCategories.forEach(cat => {
      cat.allocatedAmount = round2(cat.allocatedAmount * scaleFactor);
      cat.items.forEach(item => {
        item.estimatedCost = round2(item.estimatedCost * scaleFactor);
      });
    });

    // If user provided protected rituals, preserve them
    if (Array.isArray(protectedRituals) && protectedRituals.length > 0) {
      protectedRituals.forEach(rit => {
        if (!baseMock.protectedRituals.some(r => r.id === rit.id)) {
          baseMock.protectedRituals.push({
            id: rit.id || `r_${Date.now()}`,
            name: rit.name || 'Traditional Ritual',
            significance: rit.significance || 'Cultural Heritage',
            estimatedDuration: rit.estimatedDuration || '1 hour',
            isProtected: true,
            preservationNotes: 'User-specified sacred ceremony.',
            alternativesIfBudgetConstrained: 'Scale decor while keeping priest and ceremonial materials complete.'
          });
        }
      });
    }

    rawPlan = baseMock;
  } else {
    // -------------------------------------------------------------
    // Real Google Gemini Generation (@google/genai)
    // -------------------------------------------------------------
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemPrompt = buildSystemInstruction(language);

      const userPrompt = `
Generate a complete, structured CelebrationOS plan for the following event:
- Title: ${title}
- Event Type: ${eventType}
- Date: ${date}
- Location: ${location}
- Guest Count: ${guestCount}
- Total Budget: ${totalBudget} ${currency}
- Theme: ${theme}
- Special Notes & Traditions: ${notes}
- Language: ${language}
${protectedRituals.length > 0 ? `- User Protected Rituals: ${JSON.stringify(protectedRituals)}` : ''}

Strict Requirements:
1. Output language must be strictly ${language.toUpperCase()}.
2. Budget categories must sum up to exactly ${totalBudget}.
3. Include realistic milestones, checklists, and cultural rituals.
4. Provide customized recommendations for venue, catering, and decoration.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: EVENT_PLAN_RESPONSE_SCHEMA
        }
      });

      const textResponse = response.text;
      rawPlan = JSON.parse(textResponse);
    } catch (apiError) {
      console.warn('[Gemini Service] Gemini API call failed, falling back to mock mode:', apiError.message);
      return generateEventPlan(eventRequest, { ...options, forceMock: true });
    }
  }

  // ---------------------------------------------------------------
  // Backend Invariant Enforcement: Never Trust Raw LLM Math
  // ---------------------------------------------------------------
  const validation = validateAndNormalizePlan(rawPlan, {
    baselinePlan,
    autoReconcile: true
  });

  return {
    success: validation.isValid,
    plan: validation.normalizedPlan,
    isMock: forceMock,
    warnings: validation.warnings,
    violations: validation.violations,
    errors: validation.errors
  };
}
