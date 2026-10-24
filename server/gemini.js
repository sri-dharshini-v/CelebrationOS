/**
 * CelebrationOS Gemini AI Generation Service
 * 
 * Powered by Google GenAI SDK (@google/genai)
 * Enforces structured outputs, multilingual prompts, and backend invariant validation.
 */

import { GoogleGenAI } from '@google/genai';
import { performance } from 'node:perf_hooks';
import { EVENT_PLAN_RESPONSE_SCHEMA, MOCK_EVENT_PLANS } from './schemas.js';
import { validateAndNormalizePlan } from './invariants.js';
import { getLanguage } from './languages.js';
import { filterRitualsForEvent, filterRitualTasksForEvent } from '../public/js/eventRituals.js';
import {
  applyEventPlanBlueprint,
  getEventPlanningInstructions
} from './eventPlanBlueprints.js';

/**
 * Checks if a valid, non-placeholder Gemini API key is configured
 */
export function isGeminiKeyConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim() !== '' && key !== 'your_gemini_api_key_here');
}

/**
 * Answers a standalone event-planning question without creating or changing a plan.
 */
export async function answerEventPlanningQuestion({ question, eventType, language }) {
  if (!isGeminiKeyConfigured()) {
    throw new Error('Gemini is not configured.');
  }

  const languageInfo = getLanguage(language);
  if (!languageInfo) {
    throw new Error('Unsupported assistant response language.');
  }
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `You are CelebrationOS's friendly event-planning assistant. Help with event ideas, budget-saving suggestions, schedules, decorations, and checklists for weddings, birthdays, and other celebrations.

The event type is: ${eventType}.
Answer in ${languageInfo.englishName} (${languageInfo.nativeName}), using the ${languageInfo.script} script.
This language and script have not been verified by CelebrationOS. Do not substitute another language; if you cannot respond reliably, say so clearly in ${languageInfo.englishName}.
Be warm, practical, concise, and culturally respectful. Give actionable suggestions, avoid claiming vendor prices or availability are guaranteed, and ask the user to verify local details.

User question:
${question}`
      }]
    }],
    config: {
      systemInstruction: 'You are a helpful event-planning assistant. Keep answers focused on the user’s planning question and do not claim to have changed or saved a plan.',
      maxOutputTokens: 1200,
      thinkingConfig: { thinkingLevel: 'minimal' },
      temperature: 0.5
    }
  });

  const answer = response.text?.trim();
  if (!answer || answer.length > 4000) {
    throw new Error('Gemini returned an invalid assistant response.');
  }
  return answer;
}

/**
 * Builds culturally tailored system instructions based on the requested language
 */
function buildSystemInstruction(language = 'en') {
  const languageInfo = getLanguage(language);
  if (!languageInfo) {
    throw new Error('Unsupported plan output language.');
  }

  if (language === 'ta') {
    return `நீங்கள் CelebrationOS-இன் முதன்மை செயற்கை நுண்ணறிவு விழா திட்டமிடுபவர்.
அனைத்து தலைப்புகள், செலவுப் பிரிவுகள், சடங்கு விளக்கங்கள், கால அட்டவணைகள் மற்றும் பரிந்துரைகளை தூய, எழிலான தமிழ் மொழியில் (தமிழ் யுனிகோட்) எழுதவும்.
பயனர் குறிப்பிட்ட கலாச்சாரம், விருப்பங்கள் மற்றும் நிகழ்வுக்கு பொருந்தும் மரபுகளை மட்டுமே பின்பற்றவும். மொழியின் அடிப்படையில் சடங்குகளை ஊகிக்கவோ சேர்க்கவோ வேண்டாம்.`;
  }

  if (language === 'hi') {
    return `आप CelebrationOS के मुख्य जेनरटिव एआई उत्सव और आयोजन योजनाकार हैं।
सभी शीर्षक, बजट श्रेणियां, धार्मिक व पारंपरिक अनुष्ठान विवरण, समय-सीमा और सिफारिशें स्पष्ट एवं सुरुचिपूर्ण हिन्दी (देवनागरी) में लिखें।
केवल उपयोगकर्ता द्वारा बताई गई संस्कृति, प्राथमिकताओं और कार्यक्रम के लिए उपयुक्त परंपराओं का पालन करें। भाषा के आधार पर कोई रीति-रिवाज न मानें या जोड़ें नहीं।`;
  }

  return `You are CelebrationOS's event-planning assistant. Write all user-facing plan content in ${languageInfo.englishName} (${languageInfo.nativeName}), using the ${languageInfo.script} script.
This language and script have not been verified by CelebrationOS. Do not silently substitute another language; when reliable output is not possible, state that limitation.
Respect only cultural traditions, preferences, and rituals stated by the user and appropriate to the event type. Never infer or add rituals from the selected language. Plan celebrations with realistic budgets and balanced schedules.`;
}

export function buildEventPlanPrompt(eventRequest) {
  const {
    title,
    eventType,
    date,
    location,
    guestCount,
    totalBudget,
    currency,
    theme,
    notes,
    language,
    protectedRituals = []
  } = eventRequest;

  return `
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
${protectedRituals.length > 0 ? `- User-selected protected rituals (include only these): ${JSON.stringify(protectedRituals)}` : '- User-selected protected rituals: none'}

Event-specific plan structure:
${getEventPlanningInstructions(eventType, language)}

Strict Requirements:
1. Output language must be strictly ${language.toUpperCase()}.
2. Budget categories must sum up to exactly ${totalBudget}.
3. Do not assume or add cultural, religious, or regional customs. Include only rituals the user explicitly selected or stated, and only when appropriate to this event type. If none were selected, return an empty protectedRituals array.
4. Provide recommendations that match the event type and user-provided details.
`;
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

  const languageInfo = getLanguage(language);
  if (!languageInfo) {
    throw new Error('Unsupported plan output language.');
  }

  const baselinePlan = options.baselinePlan || null;
  const forceMock = options.forceMock || !isGeminiKeyConfigured();
  const requestedRituals = filterRitualsForEvent(protectedRituals, eventType);
  if (baselinePlan?.eventDetails?.eventType === eventType) {
    const requestedIds = new Set(requestedRituals.map(ritual => ritual.id));
    filterRitualsForEvent(baselinePlan.protectedRituals, eventType)
      .filter(ritual => ritual.isProtected && !requestedIds.has(ritual.id))
      .forEach(ritual => {
        requestedRituals.push(ritual);
        requestedIds.add(ritual.id);
      });
  }

  let rawPlan = null;

  if (forceMock) {
    // -------------------------------------------------------------
    // Resilient Mock Mode (Active when no API key is provided)
    // -------------------------------------------------------------
    const langKey = languageInfo.mockPlanLanguage;
    if (!langKey) {
      const error = new Error(
        `No reviewed mock plan is available for ${languageInfo.englishName}. Configure Gemini or choose English, Tamil, or Hindi for mock generation.`
      );
      error.code = 'language_generation_unavailable';
      throw error;
    }
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

    applyEventPlanBlueprint(baseMock, {
      eventType,
      title: baseMock.eventDetails.title,
      notes,
      guestCount: baseMock.eventDetails.guestCount,
      totalBudget: baseMock.eventDetails.totalBudget,
      currency: baseMock.eventDetails.currency,
      language: langKey,
      protectedRituals: requestedRituals
    });
    baseMock.protectedRituals = requestedRituals.map((ritual, index) => {
      const template = baseMock.protectedRituals.find(item => item.id === ritual.id);
      return {
        ...(template || {}),
        ...ritual,
        id: ritual.id || `r_custom_${Date.now()}_${index}`,
        name: ritual.name || template?.name || 'User-selected tradition',
        significance: ritual.significance || template?.significance || 'User-selected tradition',
        isProtected: true
      };
    });

    rawPlan = baseMock;
  } else {
    // -------------------------------------------------------------
    // Real Google Gemini Generation (@google/genai)
    // -------------------------------------------------------------
    const diagnosticEventType = ['wedding', 'birthday', 'community', 'anniversary', 'corporate'].includes(eventType)
      ? eventType
      : 'other';
    let geminiStartedAt;
    let geminiDurationMs;

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          retryOptions: {
            attempts: 2,
            httpStatusCodes: [503],
            initialDelay: 0.5,
            maxDelay: 2
          }
        }
      });
      const systemPrompt = buildSystemInstruction(language);

      const userPrompt = buildEventPlanPrompt({
        title,
        eventType,
        date,
        location,
        guestCount,
        totalBudget,
        currency,
        theme,
        notes,
        language,
        protectedRituals: requestedRituals
      });

      geminiStartedAt = performance.now();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: EVENT_PLAN_RESPONSE_SCHEMA
        }
      });

      geminiDurationMs = Math.round(performance.now() - geminiStartedAt);
      const textResponse = response.text;
      rawPlan = JSON.parse(textResponse);
      console.info('[Gemini Timing]', JSON.stringify({
        eventType: diagnosticEventType,
        geminiDurationMs,
        fallbackDurationMs: 0,
        fallbackUsed: false
      }));
    } catch (apiError) {
      geminiDurationMs ??= geminiStartedAt === undefined
        ? 0
        : Math.round(performance.now() - geminiStartedAt);
      const safeError = {
        model: 'gemini-3.8-flash',
        status: apiError?.status ?? apiError?.response?.status ?? apiError?.code,
        code: apiError?.error?.code ?? apiError?.code ?? apiError?.status,
        message: typeof apiError?.message === 'string' ? apiError.message.slice(0, 200) : undefined
      };
      console.warn('[Gemini Service] Gemini API call failed:', JSON.stringify(safeError));
      console.warn('[Gemini Service] Gemini API call failed, falling back to mock mode.');
      const fallbackStartedAt = performance.now();
      try {
        return await generateEventPlan(eventRequest, { ...options, forceMock: true });
      } finally {
        console.info('[Gemini Timing]', JSON.stringify({
          eventType: diagnosticEventType,
          geminiDurationMs,
          fallbackDurationMs: Math.round(performance.now() - fallbackStartedAt),
          fallbackUsed: true
        }));
      }
    }
  }

  if (rawPlan && typeof rawPlan === 'object') {
    rawPlan.eventDetails = {
      ...rawPlan.eventDetails,
      title,
      eventType,
      date,
      location,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      theme,
      language: languageInfo.mockPlanLanguage || language,
      notes
    };

    if (languageInfo.mockPlanLanguage) {
      applyEventPlanBlueprint(rawPlan, {
        eventType,
        title,
        notes,
        guestCount,
        totalBudget,
        currency,
        language: languageInfo.mockPlanLanguage,
        protectedRituals: requestedRituals
      });
    }

    rawPlan.protectedRituals = requestedRituals.map((ritual, index) => {
      const template = rawPlan.protectedRituals?.find(item => item.id === ritual.id);
      return {
        ...(template || {}),
        ...ritual,
        id: ritual.id || `r_custom_${Date.now()}_${index}`,
        name: ritual.name || template?.name || 'User-selected tradition',
        significance: ritual.significance || template?.significance || 'User-selected tradition',
        isProtected: true
      };
    });
    filterRitualTasksForEvent(rawPlan, eventType);
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
