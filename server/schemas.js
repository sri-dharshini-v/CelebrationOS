/**
 * CelebrationOS Event Plan Schemas & Reference Data
 * Designed for Google GenAI structured output validation
 */

import { Type } from '@google/genai';

/**
 * Structured Response Schema for Google GenAI (@google/genai)
 */
export const EVENT_PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    eventDetails: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        eventType: { type: Type.STRING },
        date: { type: Type.STRING },
        location: { type: Type.STRING },
        guestCount: { type: Type.NUMBER },
        totalBudget: { type: Type.NUMBER },
        currency: { type: Type.STRING },
        theme: { type: Type.STRING },
        language: { type: Type.STRING },
        notes: { type: Type.STRING }
      },
      required: ['title', 'eventType', 'date', 'guestCount', 'totalBudget', 'currency', 'language']
    },
    budgetCategories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          allocatedAmount: { type: Type.NUMBER },
          percentage: { type: Type.NUMBER },
          priority: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                status: { type: Type.STRING },
                isFrozen: { type: Type.BOOLEAN },
                notes: { type: Type.STRING }
              },
              required: ['id', 'name', 'estimatedCost', 'status', 'isFrozen']
            }
          }
        },
        required: ['id', 'name', 'allocatedAmount', 'percentage', 'items']
      }
    },
    milestones: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          timeframe: { type: Type.STRING },
          order: { type: Type.NUMBER },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                status: { type: Type.STRING },
                isFrozen: { type: Type.BOOLEAN },
                dueDate: { type: Type.STRING }
              },
              required: ['id', 'title', 'category', 'status', 'isFrozen']
            }
          }
        },
        required: ['id', 'title', 'timeframe', 'order', 'tasks']
      }
    },
    protectedRituals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          significance: { type: Type.STRING },
          estimatedDuration: { type: Type.STRING },
          isProtected: { type: Type.BOOLEAN },
          preservationNotes: { type: Type.STRING },
          alternativesIfBudgetConstrained: { type: Type.STRING }
        },
        required: ['id', 'name', 'isProtected']
      }
    },
    recommendations: {
      type: Type.OBJECT,
      properties: {
        venues: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              style: { type: Type.STRING },
              capacity: { type: Type.NUMBER },
              estimatedCostRange: { type: Type.STRING },
              keyQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['name', 'style', 'capacity', 'estimatedCostRange']
          }
        },
        catering: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              menuType: { type: Type.STRING },
              description: { type: Type.STRING },
              estimatedCostPerGuest: { type: Type.NUMBER },
              signatureItems: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              dietaryAccommodations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['menuType', 'description', 'estimatedCostPerGuest']
          }
        },
        decor: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              themeConcept: { type: Type.STRING },
              colorPalette: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    hex: { type: Type.STRING }
                  },
                  required: ['name', 'hex']
                }
              },
              focalPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              diyVsRentalTips: { type: Type.STRING }
            },
            required: ['themeConcept', 'colorPalette', 'focalPoints']
          }
        }
      },
      required: ['venues', 'catering', 'decor']
    },
    sacrificesAndTradeoffs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          impact: { type: Type.STRING }
        },
        required: ['category', 'description', 'impact']
      }
    }
  },
  required: ['eventDetails', 'budgetCategories', 'milestones', 'protectedRituals', 'recommendations', 'sacrificesAndTradeoffs']
};

/**
 * High-quality Mock Plans in English, Tamil, and Hindi
 * Used for testing without API keys and resilient fallbacks
 */
export const MOCK_EVENT_PLANS = {
  en: {
    eventDetails: {
      title: "Royal Sunset Wedding Celebration",
      eventType: "wedding",
      date: "2027-02-14",
      location: "Chennai, India",
      guestCount: 250,
      totalBudget: 1500000,
      currency: "INR",
      theme: "Royal Heritage & Floral Elegance",
      language: "en",
      notes: "Traditional South Indian wedding with evening reception."
    },
    budgetCategories: [
      {
        id: "cat_venue",
        name: "Venue & Infrastructure",
        allocatedAmount: 450000,
        percentage: 30,
        priority: "essential",
        items: [
          { id: "item_v1", name: "Heritage Banquet Hall Rental", estimatedCost: 350000, status: "booked", isFrozen: false, notes: "AC Hall with 400 capacity" },
          { id: "item_v2", name: "Generator & Backup Power", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "8 hours backup" },
          { id: "item_v3", name: "Bridal Suites (2 Rooms)", estimatedCost: 50000, status: "booked", isFrozen: false, notes: "Morning prep" }
        ]
      },
      {
        id: "cat_catering",
        name: "Catering & Beverages",
        allocatedAmount: 525000,
        percentage: 35,
        priority: "essential",
        items: [
          { id: "item_c1", name: "Traditional Plantain Leaf Feast (Morning)", estimatedCost: 225000, status: "pending", isFrozen: false, notes: "250 guests @ 900/leaf" },
          { id: "item_c2", name: "Grand Evening Reception Buffet", estimatedCost: 250000, status: "pending", isFrozen: false, notes: "Live counters & desserts" },
          { id: "item_c3", name: "Welcome Drinks & Fresh Juices", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "Tender coconut & mocktails" }
        ]
      },
      {
        id: "cat_decor",
        name: "Decor & Flowers",
        allocatedAmount: 225000,
        percentage: 15,
        priority: "recommended",
        items: [
          { id: "item_d1", name: "Mandapam Flower Architecture", estimatedCost: 120000, status: "pending", isFrozen: false, notes: "Jasmine and marigold floral canopy" },
          { id: "item_d2", name: "Reception Stage Backdrop", estimatedCost: 75000, status: "pending", isFrozen: false, notes: "Warm LED chandeliers & drape" },
          { id: "item_d3", name: "Entrance Archway & Pathway", estimatedCost: 30000, status: "pending", isFrozen: false, notes: "Floral brass urulis" }
        ]
      },
      {
        id: "cat_photo",
        name: "Photography & Videography",
        allocatedAmount: 180000,
        percentage: 12,
        priority: "recommended",
        items: [
          { id: "item_p1", name: "Traditional & Candid Photography", estimatedCost: 100000, status: "paid", isFrozen: true, notes: "Advance deposit paid to Studio" },
          { id: "item_p2", name: "4K Cinematic Teaser & Film", estimatedCost: 80000, status: "booked", isFrozen: false, notes: "Drone coverage included" }
        ]
      },
      {
        id: "cat_contingency",
        name: "Contingency & Miscellaneous",
        allocatedAmount: 120000,
        percentage: 8,
        priority: "essential",
        items: [
          { id: "item_m1", name: "Emergency Buffer Fund", estimatedCost: 80000, status: "pending", isFrozen: false, notes: "Unplanned vendor extras" },
          { id: "item_m2", name: "Guest Transport & Valet", estimatedCost: 40000, status: "pending", isFrozen: false, notes: "Shuttle cabs for elders" }
        ]
      }
    ],
    milestones: [
      {
        id: "m_6m",
        title: "6 Months Out - Foundation",
        timeframe: "6 months before",
        order: 1,
        tasks: [
          { id: "t_v_book", title: "Book Heritage Hall with advance payment", category: "vendors", status: "completed", isFrozen: true, dueDate: "6 months before" },
          { id: "t_guest_list", title: "Finalize primary family guest list", category: "planning", status: "completed", isFrozen: true, dueDate: "6 months before" }
        ]
      },
      {
        id: "m_1m",
        title: "1 Month Out - Details & Coordination",
        timeframe: "1 month before",
        order: 2,
        tasks: [
          { id: "t_menu_tasting", title: "Conduct catering tasting session", category: "vendors", status: "in_progress", isFrozen: false, dueDate: "4 weeks before" },
          { id: "t_attire", title: "Finalize traditional attire and jewelry fittings", category: "planning", status: "todo", isFrozen: false, dueDate: "3 weeks before" }
        ]
      },
      {
        id: "m_day",
        title: "Day of Event - Auspicious Execution",
        timeframe: "Day of Event",
        order: 3,
        tasks: [
          { id: "t_muhurtham", title: "Conduct Muhurtham ceremony at scheduled lagna timing", category: "rituals", status: "todo", isFrozen: false, dueDate: "Day of Event 07:30 AM" },
          { id: "t_feast", title: "Serve morning traditional banquet", category: "logistics", status: "todo", isFrozen: false, dueDate: "Day of Event 11:30 AM" }
        ]
      }
    ],
    protectedRituals: [
      {
        id: "r_muhurtham",
        name: "Muhurtham (Auspicious Tying of the Mangalsutra)",
        significance: "Core sacred Vedic ceremony performed at the astrologically precise moment.",
        estimatedDuration: "1.5 hours",
        isProtected: true,
        preservationNotes: "Must never be shortened or rescheduled; takes precedence over decor and entertainment.",
        alternativesIfBudgetConstrained: "Keep full priest rituals intact while scaling floral decor at the altar to local marigolds."
      },
      {
        id: "r_kasi_yathrai",
        name: "Kasi Yathra Tradition",
        significance: "Playful traditional mock pilgrimage ceremony by the groom.",
        estimatedDuration: "30 minutes",
        isProtected: true,
        preservationNotes: "Requires traditional parasol, scripture, and walking stick.",
        alternativesIfBudgetConstrained: "Use heirloom ceremonial items rather than purchasing new customized props."
      }
    ],
    recommendations: {
      venues: [
        {
          name: "Emerald Palms Heritage Convention Hall",
          style: "Traditional Courtyard with Pillar Architecture",
          capacity: 350,
          estimatedCostRange: "350,000 - 450,000 INR",
          keyQuestions: [
            "Are outside South Indian traditional caterers allowed without royalty fees?",
            "What is the generator fuel backup duration during peak load?",
            "Is sacred fire (Havan/Homam) permitted inside the mandapam area?"
          ]
        }
      ],
      catering: [
        {
          menuType: "Grand Dakshin Sadya (Traditional Banana Leaf)",
          description: "Authentic multi-course South Indian feast prepared by certified master cooks.",
          estimatedCostPerGuest: 900,
          signatureItems: ["Mysore Pak", "Elaneer Payasam", "Medu Vada with 3 Chutneys", "Avial"],
          dietaryAccommodations: ["100% Pure Vegetarian", "Jain (No onion/garlic) section available", "Diabetic dessert counter"]
        }
      ],
      decor: [
        {
          themeConcept: "Temple Sanctuary & Sunset Radiance",
          colorPalette: [
            { name: "Auspicious Marigold", hex: "#FFAA00" },
            { name: "Temple Crimson", hex: "#9E0031" },
            { name: "Royal Gold", hex: "#FFD700" },
            { name: "Banana Leaf Green", hex: "#2D6A4F" }
          ],
          focalPoints: ["Brass Nilavilakku lamps with jasmine garlands", "Floral Bell hanging canopy over Mandapam"],
          diyVsRentalTips: "Rent brass vessels and lamps from local temple suppliers rather than purchasing new."
        }
      ]
    },
    sacrificesAndTradeoffs: []
  },

  ta: {
    eventDetails: {
      title: "ராஜ தோரணத் திருமண விழா",
      eventType: "wedding",
      date: "2027-02-14",
      location: "சென்னை, தமிழ்நாடு",
      guestCount: 250,
      totalBudget: 1500000,
      currency: "INR",
      theme: "பாரம்பரிய செட்டிநாட்டுப் பொலிவு",
      language: "ta",
      notes: "முழு பாரம்பரிய முறைப்படி நடக்கும் தமிழ் திருமண விழா."
    },
    budgetCategories: [
      {
        id: "cat_venue",
        name: "திருமண மண்டபம் & உட்கட்டமைப்பு",
        allocatedAmount: 450000,
        percentage: 30,
        priority: "essential",
        items: [
          { id: "item_v1", name: "பாரம்பரிய மண்டப வாடகை", estimatedCost: 350000, status: "booked", isFrozen: false, notes: "400 பேர் அமரக்கூடிய அரங்கம்" },
          { id: "item_v2", name: "மின்சார ஜெனரேட்டர் வசதி", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "தடையில்லா மின்சாரம்" },
          { id: "item_v3", name: "மணமக்கள் ஓய்வறைகள்", estimatedCost: 50000, status: "booked", isFrozen: false, notes: "அனைத்து வசதிகளுடன்" }
        ]
      },
      {
        id: "cat_catering",
        name: "விருந்து உணவு & பானங்கள்",
        allocatedAmount: 525000,
        percentage: 35,
        priority: "essential",
        items: [
          { id: "item_c1", name: "பாரம்பரிய தலைவாழை இலை விருந்து", estimatedCost: 225000, status: "pending", isFrozen: false, notes: "250 விருந்தினர்கள்" },
          { id: "item_c2", name: "மாலை வரவேற்பு சுவைமிகு பஃபே", estimatedCost: 250000, status: "pending", isFrozen: false, notes: "நேரடி உணவு கவுண்டர்கள்" },
          { id: "item_c3", name: "இளநீர் மற்றும் வரவேற்பு பானங்கள்", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "இயற்கையான இளநீர்" }
        ]
      },
      {
        id: "cat_decor",
        name: "மலர் அலங்காரம் & மேடை",
        allocatedAmount: 225000,
        percentage: 15,
        priority: "recommended",
        items: [
          { id: "item_d1", name: "மணவறை மல்லிகைப் பூ பந்தல்", estimatedCost: 120000, status: "pending", isFrozen: false, notes: "மதுரை மல்லிகை மற்றும் சாமந்தி" },
          { id: "item_d2", name: "வரவேற்பு மேடை பின்னணி", estimatedCost: 75000, status: "pending", isFrozen: false, notes: "மங்கள விளக்குகள்" },
          { id: "item_d3", name: "நுழைவு வாயில் அலங்காரம்", estimatedCost: 30000, status: "pending", isFrozen: false, notes: "பித்தளை உருளிகள்" }
        ]
      },
      {
        id: "cat_photo",
        name: "புகைப்படம் & காணொளி",
        allocatedAmount: 180000,
        percentage: 12,
        priority: "recommended",
        items: [
          { id: "item_p1", name: "பாரம்பரிய & நவீன புகைப்படம்", estimatedCost: 100000, status: "paid", isFrozen: true, notes: "முன்பணம் செலுத்தப்பட்டது" },
          { id: "item_p2", name: "4K சினிமா முறை காணொளி", estimatedCost: 80000, status: "booked", isFrozen: false, notes: "ட்ரோன் ஒளிப்பதிவு" }
        ]
      },
      {
        id: "cat_contingency",
        name: "அவசரத் தேவை & இதர செலவுகள்",
        allocatedAmount: 120000,
        percentage: 8,
        priority: "essential",
        items: [
          { id: "item_m1", name: "அவசர சேமிப்பு நிதி", estimatedCost: 80000, status: "pending", isFrozen: false, notes: "எதிர்பாராத செலவுகள்" },
          { id: "item_m2", name: "விருந்தினர் வாகன வசதி", estimatedCost: 40000, status: "pending", isFrozen: false, notes: "முதியோருக்கான போக்குவரத்து" }
        ]
      }
    ],
    milestones: [
      {
        id: "m_6m",
        title: "6 மாதங்கள் முன் - அடித்தளம்",
        timeframe: "6 மாதங்களுக்கு முன்",
        order: 1,
        tasks: [
          { id: "t_v_book", title: "மண்டபம் முன்பதிவு செய்து முன்பணம் செலுத்துதல்", category: "vendors", status: "completed", isFrozen: true, dueDate: "6 மாதங்கள் முன்" },
          { id: "t_guest_list", title: "குடும்ப விருந்தினர் பட்டியலை இறுதி செய்தல்", category: "planning", status: "completed", isFrozen: true, dueDate: "6 மாதங்கள் முன்" }
        ]
      },
      {
        id: "m_1m",
        title: "1 மாதம் முன் - ஏற்பாடுகள்",
        timeframe: "1 மாதத்திற்கு முன்",
        order: 2,
        tasks: [
          { id: "t_menu_tasting", title: "சமையல் கலைஞருடன் உணவு ருசி பார்த்தல்", category: "vendors", status: "in_progress", isFrozen: false, dueDate: "4 வாரங்கள் முன்" },
          { id: "t_attire", title: "முகூர்த்த பட்டுப்புடவை & வேட்டி பொருத்தம் பார்த்தல்", category: "planning", status: "todo", isFrozen: false, dueDate: "3 வாரங்கள் முன்" }
        ]
      },
      {
        id: "m_day",
        title: "திருமண நாள் - சுப முகூர்த்தம்",
        timeframe: "நிகழ்வு நாள்",
        order: 3,
        tasks: [
          { id: "t_muhurtham", title: "சுப லக்ன நேரத்தில் மாங்கல்ய தாரணம் நடத்துதல்", category: "rituals", status: "todo", isFrozen: false, dueDate: "காலை 07:30" },
          { id: "t_feast", title: "அனைவருக்கும் தலைவாழை இலை விருந்து பரிமாறுதல்", category: "logistics", status: "todo", isFrozen: false, dueDate: "காலை 11:30" }
        ]
      }
    ],
    protectedRituals: [
      {
        id: "r_muhurtham",
        name: "சுப முகூர்த்தம் (மாங்கல்ய தாரணம்)",
        significance: "திருமணத்தின் மிக முக்கியமான புனித சடங்கு; சுப முகூர்த்த நேரத்தில் மட்டுமே நிகழ வேண்டும்.",
        estimatedDuration: "1.5 மணி நேரம்",
        isProtected: true,
        preservationNotes: "எக்காரணம் கொண்டும் குறைக்கவோ மாற்றவோ கூடாது. பிற ஆடம்பரங்களை விட இதற்கு முதலிடம்.",
        alternativesIfBudgetConstrained: "சடங்குகளை முழுமையாக வைத்துக்கொண்டு, வெளிநாட்டு மலர்களுக்குப் பதிலாக நாட்டுப் பூக்களைப் பயன்படுத்தலாம்."
      },
      {
        id: "r_kasi_yathrai",
        name: "காசி யாத்திரை சடங்கு",
        significance: "மணமகனின் பாரம்பரிய ஆன்மீகப் பயணம் மற்றும் வரவேற்பு சடங்கு.",
        estimatedDuration: "30 நிமிடங்கள்",
        isProtected: true,
        preservationNotes: "பாரம்பரிய குடை மற்றும் விசிறி தேவைப்படுகிறது.",
        alternativesIfBudgetConstrained: "குடும்பத்தில் உள்ள பாரம்பரிய பொருட்களைப் பயன்படுத்தலாம்."
      }
    ],
    recommendations: {
      venues: [
        {
          name: "ஸ்ரீ சாய் பாரம்பரிய திருமண மண்டபம்",
          style: "பாரம்பரிய தூண்கள் மற்றும் அகன்ற உள்முற்றம்",
          capacity: 350,
          estimatedCostRange: "350,000 - 450,000 INR",
          keyQuestions: [
            "வெளிப்புற பாரம்பரிய சமையல் கலைஞர்களுக்கு அனுமதி உண்டா?",
            "ஹோமம் வளர்க்க மண்டபத்தில் பாதுகாப்பு வசதி உள்ளதா?",
            "மின்சார ஜெனரேட்டர் கட்டணம் வாடகையில் அடங்குமா?"
          ]
        }
      ],
      catering: [
        {
          menuType: "முழுமையான தலைவாழை இலை விருந்து",
          description: "பாரம்பரிய முறையில் அனுபவம் வாய்ந்த சமையல் வல்லுநர்களால் தயாரிக்கப்படும் அறுசுவை விருந்து.",
          estimatedCostPerGuest: 900,
          signatureItems: ["நெய் மைசூர் பாக்", "இளநீர் பாயாசம்", "பருப்பு வடை", "அவியல்"],
          dietaryAccommodations: ["100% தூய சைவ உணவு", "வெங்காயம் பூண்டு இல்லாத உணவு பிரிவு"]
        }
      ],
      decor: [
        {
          themeConcept: "கோவில் மண்டப பொலிவு",
          colorPalette: [
            { name: "மங்கள சாமந்தி மஞ்சள்", hex: "#FFAA00" },
            { name: "குங்குமச் சிவப்பு", hex: "#9E0031" },
            { name: "தங்க நிறம்", hex: "#FFD700" },
            { name: "வாழை இலை பச்சை", hex: "#2D6A4F" }
          ],
          focalPoints: ["பித்தளை விளக்குகள் மற்றும் மல்லிகைப் பூ மாலைகள்", "மணவறை மலர் தோரணங்கள்"],
          diyVsRentalTips: "பித்தளை குத்துவிளக்குகளை விலைக்கு வாங்காமல் வாடகைக்கு எடுக்கலாம்."
        }
      ]
    },
    sacrificesAndTradeoffs: []
  },

  hi: {
    eventDetails: {
      title: "शाही मंगल विवाह उत्सव",
      eventType: "wedding",
      date: "2027-02-14",
      location: "जयपुर, राजस्थान",
      guestCount: 250,
      totalBudget: 1500000,
      currency: "INR",
      theme: "शाही राजस्थानी परंपरा",
      language: "hi",
      notes: "वैदिक रीति-रिवाजों और पारंपरिक संगीत के साथ भव्य विवाह।"
    },
    budgetCategories: [
      {
        id: "cat_venue",
        name: "विवाह स्थल एवं सुविधाएं",
        allocatedAmount: 450000,
        percentage: 30,
        priority: "essential",
        items: [
          { id: "item_v1", name: "हेरिटेज मैरिज लॉन किराया", estimatedCost: 350000, status: "booked", isFrozen: false, notes: "400 मेहमानों की क्षमता" },
          { id: "item_v2", name: "जनरेटर एवं बैकअप पावर", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "अबाध विद्युत आपूर्ति" },
          { id: "item_v3", name: "दूल्हा-दुल्हन सुइट रूम", estimatedCost: 50000, status: "booked", isFrozen: false, notes: "तैयारी हेतु" }
        ]
      },
      {
        id: "cat_catering",
        name: "खान-पान एवं मिष्ठान",
        allocatedAmount: 525000,
        percentage: 35,
        priority: "essential",
        items: [
          { id: "item_c1", name: "शाही पारंपरिक राजस्थानी भोजन", estimatedCost: 225000, status: "pending", isFrozen: false, notes: "दाल बाटी चूरमा व पारंपरिक व्यंजन" },
          { id: "item_c2", name: "शाम का भव्य रिसेप्शन बुफे", estimatedCost: 250000, status: "pending", isFrozen: false, notes: "लाइव चाट काउंटर" },
          { id: "item_c3", name: "स्वागत पेय व शरबत", estimatedCost: 50000, status: "pending", isFrozen: false, notes: "केसरिया ठंडाई व जूस" }
        ]
      },
      {
        id: "cat_decor",
        name: "सजावट एवं मंडप",
        allocatedAmount: 225000,
        percentage: 15,
        priority: "recommended",
        items: [
          { id: "item_d1", name: "वैदिक मंडप पुष्प सज्जा", estimatedCost: 120000, status: "pending", isFrozen: false, notes: "गेंदा एवं गुलाब की लड़ियां" },
          { id: "item_d2", name: "स्टेज बैकड्रॉप व प्रकाश व्यवस्था", estimatedCost: 75000, status: "pending", isFrozen: false, notes: "पारंपरिक झूमर" },
          { id: "item_d3", name: "प्रवेश द्वार तोरण", estimatedCost: 30000, status: "pending", isFrozen: false, notes: "पीतल की उरली व दीपक" }
        ]
      },
      {
        id: "cat_photo",
        name: "फोटोग्राफी एवं वीडियोग्राफी",
        allocatedAmount: 180000,
        percentage: 12,
        priority: "recommended",
        items: [
          { id: "item_p1", name: "कैंडिड व पारंपरिक फोटोग्राफी", estimatedCost: 100000, status: "paid", isFrozen: true, notes: "अग्रिम भुगतान किया गया" },
          { id: "item_p2", name: "4K सिनेमैटिक वेडिंग फिल्म", estimatedCost: 80000, status: "booked", isFrozen: false, notes: "ड्रोन कवरेज सहित" }
        ]
      },
      {
        id: "cat_contingency",
        name: "आपातकालीन व विविध व्यय",
        allocatedAmount: 120000,
        percentage: 8,
        priority: "essential",
        items: [
          { id: "item_m1", name: "आपातकालीन रिजर्व फंड", estimatedCost: 80000, status: "pending", isFrozen: false, notes: "अचानक आए खर्चे" },
          { id: "item_m2", name: "मेहमान परिवहन व पार्किंग", estimatedCost: 40000, status: "pending", isFrozen: false, notes: "शटल वाहन" }
        ]
      }
    ],
    milestones: [
      {
        id: "m_6m",
        title: "6 माह पूर्व - प्रारंभिक तैयारी",
        timeframe: "6 माह पूर्व",
        order: 1,
        tasks: [
          { id: "t_v_book", title: "स्थल बुकिंग एवं अग्रिम भुगतान", category: "vendors", status: "completed", isFrozen: true, dueDate: "6 माह पूर्व" },
          { id: "t_guest_list", title: "मेहमान सूची को अंतिम रूप देना", category: "planning", status: "completed", isFrozen: true, dueDate: "6 माह पूर्व" }
        ]
      },
      {
        id: "m_1m",
        title: "1 माह पूर्व - व्यवस्था समन्वय",
        timeframe: "1 माह पूर्व",
        order: 2,
        tasks: [
          { id: "t_menu_tasting", title: "हलवाई व केटरर के साथ मेनू चखना", category: "vendors", status: "in_progress", isFrozen: false, dueDate: "4 सप्ताह पूर्व" },
          { id: "t_attire", title: "पारंपरिक पोशाक व आभूषण फिटिंग", category: "planning", status: "todo", isFrozen: false, dueDate: "3 सप्ताह पूर्व" }
        ]
      },
      {
        id: "m_day",
        title: "विवाह दिवस - शुभ फेरे",
        timeframe: "कार्यक्रम दिवस",
        order: 3,
        tasks: [
          { id: "t_saptapadi", title: "शुभ मुहूर्त में सप्तपदी व पाणिग्रहण संस्कार", category: "rituals", status: "todo", isFrozen: false, dueDate: "शुभ लग्न समय" },
          { id: "t_feast", title: "भोज सेवा का शुभारंभ", category: "logistics", status: "todo", isFrozen: false, dueDate: "दोपहर 01:00" }
        ]
      }
    ],
    protectedRituals: [
      {
        id: "r_saptapadi",
        name: "सप्तपदी एवं पाणिग्रहण (पवित्र सात फेरे)",
        significance: "अग्नि को साक्षी मानकर लिए जाने वाले सात पवित्र वचन; विवाह का मुख्य वैदिक अंग।",
        estimatedDuration: "1.5 घंटे",
        isProtected: true,
        preservationNotes: "इसे कभी भी कम या रद्द नहीं किया जा सकता।",
        alternativesIfBudgetConstrained: "मंडप की विदेशी सजावट कम करके स्थानीय फूलों का उपयोग करें, परंतु हवन व वैदिक मंत्रोच्चार पूरा रखें।"
      },
      {
        id: "r_kanyadaan",
        name: "कन्यादान संस्कार",
        significance: "माता-पिता द्वारा अपनी पुत्री का हाथ वर को सौंपने की पावन परंपरा।",
        estimatedDuration: "45 मिनट",
        isProtected: true,
        preservationNotes: "शास्त्रसम्मत विधि से संपन्न हो।",
        alternativesIfBudgetConstrained: "सभी पूजन सामग्रियां पारंपरिक व सरल रखी जाएं।"
      }
    ],
    recommendations: {
      venues: [
        {
          name: "रॉयल हैरिटेज पैलेस एवं लॉन",
          style: "राजपूताना झरोखे व खुला आंगन",
          capacity: 350,
          estimatedCostRange: "350,000 - 450,000 INR",
          keyQuestions: [
            "क्या हवन की अग्नि प्रज्वलित करने की पूर्ण अनुमति है?",
            "क्या बाहरी हलवाई को रसोई उपयोग करने की अनुमति है?",
            "पार्किंग व सुरक्षा गार्ड की क्या व्यवस्था है?"
          ]
        }
      ],
      catering: [
        {
          menuType: "पारंपरिक मारवाड़ी एवं उत्तर भारतीय भोज",
          description: "शुद्ध देशी घी में तैयार पारंपरिक मिष्ठान व व्यंजन।",
          estimatedCostPerGuest: 900,
          signatureItems: ["केसरिया बाटी", "गट्टे की सब्जी", "मावा कचौड़ी", "केसर जलेबी"],
          dietaryAccommodations: ["100% शुद्ध शाकाहारी", "जैन भोजन (बिना प्याज-लहसुन) की अलग व्यवस्था"]
        }
      ],
      decor: [
        {
          themeConcept: "राजपुताना शान व गेंदा बहार",
          colorPalette: [
            { name: "शाही केसरिया", hex: "#FF7700" },
            { name: "गुलाबी नगरी पिंक", hex: "#E75480" },
            { name: "सुनहरा स्वर्ण", hex: "#DAA520" },
            { name: "पन्ना हरा", hex: "#006400" }
          ],
          focalPoints: ["पीतल के दीपस्तंभ एवं गेंदे की लड़ियां", "शाही राजस्थानी मंडप छांव"],
          diyVsRentalTips: "पारंपरिक कठपुतलियां व लहरिया दुपट्टे किराए पर लें।"
        }
      ]
    },
    sacrificesAndTradeoffs: []
  }
};
