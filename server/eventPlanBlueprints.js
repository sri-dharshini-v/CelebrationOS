import { filterRitualsForEvent } from '../public/js/eventRituals.js';
import { round2 } from './invariants.js';

const text = (en, hi, ta) => ({ en, hi, ta });

const EVENT_BLUEPRINTS = {
  wedding: {
    categories: [
      {
        id: 'venue',
        weight: 0.25,
        name: text('Ceremony & Reception Venue', 'विवाह एवं स्वागत स्थल', 'திருமணம் மற்றும் வரவேற்பு இடம்'),
        items: [
          text('Ceremony and reception space', 'विवाह एवं स्वागत स्थल', 'திருமணம் மற்றும் வரவேற்பு இடம்'),
          text('Guest seating and accessibility', 'अतिथि बैठने और पहुंच की व्यवस्था', 'விருந்தினர் இருக்கை மற்றும் அணுகல் வசதி')
        ]
      },
      {
        id: 'catering',
        weight: 0.3,
        name: text('Wedding Catering', 'विवाह भोज व्यवस्था', 'திருமண விருந்தோம்பல்'),
        items: [
          text('Ceremony refreshments', 'समारोह के जलपान', 'திருமண நிகழ்வு சிற்றுண்டி'),
          text('Reception meal and service', 'स्वागत भोज और सेवा', 'வரவேற்பு விருந்து மற்றும் சேவை')
        ]
      },
      {
        id: 'decor',
        weight: 0.16,
        name: text('Ceremony & Reception Decor', 'विवाह एवं स्वागत सजावट', 'திருமணம் மற்றும் வரவேற்பு அலங்காரம்'),
        items: [
          text('Ceremony backdrop and florals', 'समारोह मंच और फूलों की सजावट', 'திருமண மேடை மற்றும் மலர் அலங்காரம்'),
          text('Reception tables and lighting', 'स्वागत समारोह मेज और रोशनी', 'வரவேற்பு மேசைகள் மற்றும் விளக்குகள்')
        ]
      },
      {
        id: 'photography',
        weight: 0.19,
        name: text('Photography & Attire', 'फोटोग्राफी एवं परिधान', 'புகைப்படம் மற்றும் ஆடை'),
        items: [
          text('Ceremony and reception photography', 'विवाह एवं स्वागत फोटोग्राफी', 'திருமணம் மற்றும் வரவேற்பு புகைப்படம்'),
          text('Couple attire and preparation', 'जोड़े के परिधान और तैयारी', 'இணையரின் ஆடை மற்றும் தயாரிப்பு')
        ]
      },
      {
        id: 'coordination',
        weight: 0.1,
        name: text('Wedding Coordination & Transport', 'विवाह समन्वय एवं परिवहन', 'திருமண ஒருங்கிணைப்பு மற்றும் போக்குவரத்து'),
        items: [
          text('Vendor and ceremony coordination', 'विक्रेता एवं समारोह समन्वय', 'விற்பனையாளர் மற்றும் நிகழ்வு ஒருங்கிணைப்பு'),
          text('Guest transport and contingency', 'अतिथि परिवहन और आकस्मिक व्यवस्था', 'விருந்தினர் போக்குவரத்து மற்றும் அவசரத் திட்டம்')
        ]
      }
    ],
    milestones: [
      {
        title: text('Plan the Ceremony & Reception', 'विवाह एवं स्वागत की योजना', 'திருமணம் மற்றும் வரவேற்புத் திட்டம்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Choose ceremony and reception format', 'विवाह एवं स्वागत का स्वरूप चुनें', 'திருமணம் மற்றும் வரவேற்பு முறையைத் தேர்ந்தெடுக்கவும்'),
          text('Shortlist a venue for the guest count', 'अतिथि संख्या के अनुसार स्थल चुनें', 'விருந்தினர் எண்ணிக்கைக்கு ஏற்ற இடத்தைத் தேர்ந்தெடுக்கவும்')
        ]
      },
      {
        title: text('Confirm Wedding Vendors', 'विवाह सेवा प्रदाताओं की पुष्टि', 'திருமண சேவை வழங்குநர்களை உறுதிசெய்க'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Finalize the meal, service, and dietary needs', 'भोज, सेवा और खान-पान की जरूरतें तय करें', 'உணவு, சேவை மற்றும் உணவு விருப்பங்களை உறுதிசெய்க'),
          text('Confirm photography coverage and schedule', 'फोटोग्राफी और समय-सारणी तय करें', 'புகைப்பட நேரம் மற்றும் ஏற்பாடுகளை உறுதிசெய்க')
        ]
      },
      {
        title: text('Ceremony & Reception Day', 'विवाह एवं स्वागत का दिन', 'திருமணம் மற்றும் வரவேற்பு நாள்'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Prepare the ceremony space and guest arrival', 'समारोह स्थल और अतिथि आगमन तैयार करें', 'திருமண இடம் மற்றும் விருந்தினர் வருகையைத் தயார்செய்க'),
          text('Host the reception, meal, and couple photography', 'स्वागत, भोज और जोड़े की फोटोग्राफी आयोजित करें', 'வரவேற்பு, விருந்து மற்றும் இணையர் புகைப்படத்தை ஒருங்கிணைக்கவும்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('A venue with separate ceremony and reception areas', 'विवाह और स्वागत के लिए अलग स्थान वाला स्थल', 'திருமணம் மற்றும் வரவேற்புக்கு தனித்தனி பகுதிகள் கொண்ட இடம்'),
      venueQuestions: [
        text('Can the ceremony and reception schedules be accommodated?', 'क्या विवाह और स्वागत की समय-सारणी संभव है?', 'திருமணம் மற்றும் வரவேற்பு நேர அட்டவணைக்கு இடவசதி உள்ளதா?'),
        text('What accessibility, setup, and vendor rules apply?', 'पहुंच, सजावट और विक्रेता संबंधी नियम क्या हैं?', 'அணுகல், ஏற்பாடு மற்றும் விற்பனையாளர் விதிகள் என்ன?')
      ],
      cateringMenu: text('Wedding meal and reception service', 'विवाह भोज एवं स्वागत सेवा', 'திருமண விருந்து மற்றும் வரவேற்பு உணவு'),
      cateringDescription: text('Plan service timing around the ceremony and reception; confirm dietary needs with the hosts.', 'विवाह एवं स्वागत के समय के अनुसार भोजन रखें और मेजबानों से खान-पान की जरूरतें पूछें।', 'திருமணம் மற்றும் வரவேற்பு நேரத்திற்கேற்ப உணவு வழங்கி, உணவு விருப்பங்களை உறுதிசெய்க.'),
      decorTheme: text('Ceremony-to-reception decor plan', 'विवाह से स्वागत तक सजावट योजना', 'திருமணத்திலிருந்து வரவேற்பு வரை அலங்காரத் திட்டம்'),
      decorPoints: [
        text('Ceremony focal area', 'विवाह समारोह का मुख्य मंच', 'திருமண நிகழ்வின் முக்கிய மேடை'),
        text('Reception tables and guest lighting', 'स्वागत मेज और अतिथि प्रकाश व्यवस्था', 'வரவேற்பு மேசைகள் மற்றும் விளக்குகள்')
      ]
    }
  },
  birthday: {
    categories: [
      {
        id: 'venue',
        weight: 0.18,
        name: text('Birthday Venue & Setup', 'जन्मदिन स्थल एवं व्यवस्था', 'பிறந்தநாள் இடம் மற்றும் ஏற்பாடு'),
        items: [
          text('Party venue or home setup', 'पार्टी स्थल या घर की व्यवस्था', 'விழா இடம் அல்லது வீட்டில் ஏற்பாடு'),
          text('Seating and guest comfort', 'बैठने और अतिथि सुविधा', 'இருக்கை மற்றும் விருந்தினர் வசதி')
        ]
      },
      {
        id: 'cake_food',
        weight: 0.3,
        name: text('Cake, Food & Drinks', 'केक, भोजन एवं पेय', 'கேக், உணவு மற்றும் பானங்கள்'),
        items: [
          text('Birthday cake and candles', 'जन्मदिन केक और मोमबत्तियां', 'பிறந்தநாள் கேக் மற்றும் மெழுகுவர்த்திகள்'),
          text('Party food and refreshments', 'पार्टी भोजन और जलपान', 'விருந்து உணவு மற்றும் சிற்றுண்டி')
        ]
      },
      {
        id: 'decor',
        weight: 0.18,
        name: text('Birthday Decorations', 'जन्मदिन सजावट', 'பிறந்தநாள் அலங்காரம்'),
        items: [
          text('Theme backdrop and balloons', 'थीम मंच और गुब्बारे', 'கருப்பொருள் பின்னணி மற்றும் பலூன்கள்'),
          text('Tableware and party lighting', 'मेज सजावट और पार्टी रोशनी', 'மேசை அலங்காரம் மற்றும் விழா விளக்குகள்')
        ]
      },
      {
        id: 'activities',
        weight: 0.22,
        name: text('Games & Entertainment', 'खेल एवं मनोरंजन', 'விளையாட்டு மற்றும் பொழுதுபோக்கு'),
        items: [
          text('Age-appropriate games and activities', 'उम्र के अनुसार खेल और गतिविधियां', 'வயதுக்கேற்ற விளையாட்டுகள் மற்றும் செயல்பாடுகள்'),
          text('Music and activity supplies', 'संगीत और गतिविधि सामग्री', 'இசை மற்றும் செயல்பாட்டு பொருட்கள்')
        ]
      },
      {
        id: 'photos',
        weight: 0.12,
        name: text('Birthday Photos & Keepsakes', 'जन्मदिन फोटोग्राफी एवं स्मृति-चिह्न', 'பிறந்தநாள் புகைப்படம் மற்றும் நினைவுப் பொருட்கள்'),
        items: [
          text('Party photography', 'पार्टी फोटोग्राफी', 'விழா புகைப்படம்'),
          text('Guest keepsakes', 'अतिथि स्मृति-चின்ன', 'விருந்தினர் நினைவுப் பொருட்கள்')
        ]
      }
    ],
    milestones: [
      {
        title: text('Set the Birthday Plan', 'जन्मदिन की योजना बनाएं', 'பிறந்தநாள் திட்டத்தைத் தொடங்குங்கள்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Choose a party format and guest list', 'पार्टी का स्वरूप और अतिथि सूची चुनें', 'விழா முறை மற்றும் விருந்தினர் பட்டியலைத் தேர்ந்தெடுக்கவும்'),
          text('Plan cake, food, and age-appropriate activities', 'केक, भोजन और उम्र के अनुसार गतिविधियां तय करें', 'கேக், உணவு மற்றும் வயதுக்கேற்ற செயல்பாடுகளைத் திட்டமிடுங்கள்')
        ]
      },
      {
        title: text('Prepare the Party', 'पार्टी की तैयारी', 'விருந்துக்குத் தயாராகுங்கள்'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Confirm cake, dietary needs, and food quantities', 'केक, खान-पान और भोजन की मात्रा तय करें', 'கேக், உணவு விருப்பங்கள் மற்றும் அளவை உறுதிசெய்க'),
          text('Set up decorations, games, and music', 'सजावट, खेल और संगीत की तैयारी करें', 'அலங்காரம், விளையாட்டு மற்றும் இசையைத் தயார்செய்க')
        ]
      },
      {
        title: text('Birthday Party Day', 'जन्मदिन पार्टी का दिन', 'பிறந்தநாள் விழா நாள்'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Welcome guests and host games or activities', 'अतिथियों का स्वागत और खेल आयोजित करें', 'விருந்தினர்களை வரவேற்று விளையாட்டுகளை நடத்துங்கள்'),
          text('Serve food and celebrate with the cake moment', 'भोजन परोसें और केक के साथ जन्मदिन मनाएं', 'உணவு பரிமாறி கேக் நிகழ்வுடன் பிறந்தநாளைக் கொண்டாடுங்கள்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('A flexible party space with room for games', 'खेलों के लिए जगह वाला लचीला पार्टी स्थल', 'விளையாட்டுகளுக்கு இடமுள்ள நெகிழ்வான விழா இடம்'),
      venueQuestions: [
        text('Is there room for the planned games and cake moment?', 'क्या खेल और केक कार्यक्रम के लिए पर्याप्त जगह है?', 'திட்டமிட்ட விளையாட்டுகளுக்கும் கேக் நிகழ்வுக்கும் இடமுண்டா?'),
        text('Can decorations and outside food be brought in?', 'क्या सजावट और बाहर का भोजन लाया जा सकता है?', 'அலங்காரம் மற்றும் வெளியிலிருந்து உணவு கொண்டுவரலாமா?')
      ],
      cateringMenu: text('Birthday cake and party menu', 'जन्मदिन केक एवं पार्टी मेनू', 'பிறந்தநாள் கேக் மற்றும் விருந்து உணவு'),
      cateringDescription: text('Choose cake and food portions for the guest count and dietary needs.', 'अतिथि संख्या और खान-पान की जरूरत के अनुसार केक और भोजन चुनें।', 'விருந்தினர் எண்ணிக்கை மற்றும் உணவு விருப்பத்திற்கேற்ப கேக், உணவைத் தேர்ந்தெடுக்கவும்.'),
      decorTheme: text('Birthday theme and photo backdrop', 'जन्मदिन थीम और फोटो मंच', 'பிறந்தநாள் கருப்பொருள் மற்றும் புகைப்படப் பின்னணி'),
      decorPoints: [
        text('Cake and candle area', 'केक और मोमबत्ती का स्थान', 'கேக் மற்றும் மெழுகுவர்த்தி பகுதி'),
        text('Games and photo backdrop', 'खेल और फोटो मंच', 'விளையாட்டு மற்றும் புகைப்படப் பின்னணி')
      ]
    }
  },
  community: {
    categories: [
      {
        id: 'venue',
        weight: 0.23,
        name: text('Community Space & Access', 'सामुदायिक स्थल एवं पहुंच', 'சமூக இடம் மற்றும் அணுகல்'),
        items: [
          text('Shared gathering space', 'सामुदायिक सभा स्थल', 'சமூகக் கூடும் இடம்'),
          text('Seating, access, and basic facilities', 'बैठक, पहुंच और मूलभूत सुविधाएं', 'இருக்கை, அணுகல் மற்றும் அடிப்படை வசதிகள்')
        ]
      },
      {
        id: 'shared_food',
        weight: 0.27,
        name: text('Shared Food & Refreshments', 'साझा भोजन एवं जलपान', 'பகிர்ந்து உண்ணும் உணவு மற்றும் சிற்றுண்டி'),
        items: [
          text('Shared meal or potluck supplies', 'साझा भोजन या पॉटलक सामग्री', 'பகிர்வு உணவு அல்லது அனைவரும் கொண்டுவரும் உணவு'),
          text('Water and serving supplies', 'पानी और परोसने की सामग्री', 'தண்ணீர் மற்றும் பரிமாறும் பொருட்கள்')
        ]
      },
      {
        id: 'programme',
        weight: 0.2,
        name: text('Programme & Group Activities', 'कार्यक्रम एवं समूह गतिविधियां', 'நிகழ்ச்சி மற்றும் குழு செயல்பாடுகள்'),
        items: [
          text('Programme materials and signage', 'कार्यक्रम सामग्री और संकेतक', 'நிகழ்ச்சி பொருட்கள் மற்றும் அறிவிப்புப் பலகைகள்'),
          text('Group activity supplies', 'समूह गतिविधि सामग्री', 'குழு செயல்பாட்டு பொருட்கள்')
        ]
      },
      {
        id: 'volunteers',
        weight: 0.2,
        name: text('Volunteer & Event Operations', 'स्वयंसेवक एवं आयोजन संचालन', 'தன்னார்வலர் மற்றும் நிகழ்வு செயல்பாடுகள்'),
        items: [
          text('Volunteer coordination materials', 'स्वयंसेवक समन्वय सामग्री', 'தன்னார்வலர் ஒருங்கிணைப்பு பொருட்கள்'),
          text('Cleanup and waste sorting', 'सफाई और कचरा पृथक्करण', 'சுத்தம் மற்றும் கழிவு வகைப்படுத்தல்')
        ]
      },
      {
        id: 'communications',
        weight: 0.1,
        name: text('Community Communications', 'सामुदायिक सूचना व्यवस्था', 'சமூகத் தொடர்பு ஏற்பாடுகள்'),
        items: [
          text('Invitations and reminders', 'निमंत्रण और स्मरण संदेश', 'அழைப்புகள் மற்றும் நினைவூட்டல்கள்'),
          text('Contingency supplies', 'आकस्मिक सामग्री', 'அவசரத் தேவைக்கான பொருட்கள்')
        ]
      }
    ],
    milestones: [
      {
        title: text('Organize the Community Gathering', 'सामुदायिक सभा का आयोजन', 'சமூகக் கூடுகையை ஏற்பாடு செய்யுங்கள்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Invite participants and collect access or dietary needs', 'प्रतिभागियों को आमंत्रित करें और पहुंच या भोजन संबंधी जरूरतें जानें', 'பங்கேற்பாளர்களை அழைத்து அணுகல் அல்லது உணவு தேவைகளை அறியுங்கள்'),
          text('Build a programme with time for participation', 'भागीदारी के लिए समय सहित कार्यक्रम बनाएं', 'பங்கேற்புக்கு நேரமுள்ள நிகழ்ச்சி நிரலை உருவாக்குங்கள்')
        ]
      },
      {
        title: text('Coordinate Volunteers & Shared Food', 'स्वयंसेवक एवं साझा भोजन समन्वय', 'தன்னார்வலர்கள் மற்றும் பகிர்வு உணவை ஒருங்கிணைக்கவும்'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Assign volunteer roles and setup shifts', 'स्वयंसेवक भूमिकाएं और तैयारी की पाली तय करें', 'தன்னார்வலர் பொறுப்புகள் மற்றும் ஏற்பாட்டு நேரங்களை ஒதுக்குங்கள்'),
          text('Confirm shared food, serving, and cleanup plans', 'साझा भोजन, परोसने और सफाई की योजना तय करें', 'பகிர்வு உணவு, பரிமாறுதல் மற்றும் சுத்தம் செய்வதை உறுதிசெய்க')
        ]
      },
      {
        title: text('Gathering Day Programme', 'सभा दिवस कार्यक्रम', 'கூடுகை நாள் நிகழ்ச்சி'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Welcome participants and run group activities', 'प्रतिभागियों का स्वागत और समूह गतिविधियां आयोजित करें', 'பங்கேற்பாளர்களை வரவேற்று குழு செயல்பாடுகளை நடத்துங்கள்'),
          text('Share food and coordinate volunteers through closing', 'भोजन साझा करें और समापन तक स्वयंसेवकों का समन्वय करें', 'உணவைப் பகிர்ந்து நிறைவு வரை தன்னார்வலர்களை ஒருங்கிணைக்கவும்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('An accessible shared space with flexible seating', 'लचीली बैठक व्यवस्था वाला सुलभ सामुदायिक स्थल', 'நெகிழ்வான இருக்கை வசதியுள்ள அணுகக்கூடிய சமூக இடம்'),
      venueQuestions: [
        text('Can participants access the space and facilities?', 'क्या प्रतिभागी स्थल और सुविधाओं तक पहुंच सकते हैं?', 'பங்கேற்பாளர்கள் இடத்தையும் வசதிகளையும் அணுக முடியுமா?'),
        text('Are shared food service and cleanup permitted?', 'क्या साझा भोजन और सफाई की व्यवस्था संभव है?', 'பகிர்வு உணவு மற்றும் சுத்தம் செய்ய அனுமதி உள்ளதா?')
      ],
      cateringMenu: text('Shared meal or participant-contributed food', 'साझा भोजन या प्रतिभागियों द्वारा लाया गया भोजन', 'பகிர்வு உணவு அல்லது பங்கேற்பாளர்கள் கொண்டுவரும் உணவு'),
      cateringDescription: text('Coordinate portions, dietary needs, water, and serving volunteers with participants.', 'प्रतिभागियों के साथ भोजन की मात्रा, खान-पान, पानी और परोसने वाले स्वयंसेवकों का समन्वय करें।', 'பங்கேற்பாளர்களுடன் உணவு அளவு, விருப்பங்கள், தண்ணீர் மற்றும் பரிமாறும் தன்னார்வலர்களை ஒருங்கிணைக்கவும்.'),
      decorTheme: text('Clear community programme and welcome signage', 'स्पष्ट सामुदायिक कार्यक्रम एवं स्वागत संकेतक', 'தெளிவான சமூக நிகழ்ச்சி மற்றும் வரவேற்பு அறிவிப்புகள்'),
      decorPoints: [
        text('Participant welcome and information point', 'प्रतिभागी स्वागत एवं सूचना केंद्र', 'பங்கேற்பாளர் வரவேற்பு மற்றும் தகவல் மையம்'),
        text('Flexible space for group activities', 'समूह गतिविधियों के लिए खुला स्थान', 'குழு செயல்பாடுகளுக்கான திறந்த இடம்')
      ]
    }
  },
  anniversary: {
    categories: [
      {
        id: 'venue_dinner',
        weight: 0.28,
        name: text('Anniversary Venue & Dinner', 'वर्षगांठ स्थल एवं रात्रिभोज', 'ஆண்டுவிழா இடம் மற்றும் இரவு உணவு'),
        items: [
          text('Dinner or party venue', 'रात्रिभोज या पार्टी स्थल', 'இரவு உணவு அல்லது விழா இடம்'),
          text('Meal service and refreshments', 'भोजन सेवा और जलपान', 'உணவு சேவை மற்றும் சிற்றுண்டி')
        ]
      },
      {
        id: 'memories',
        weight: 0.22,
        name: text('Memories & Photography', 'यादें एवं फोटोग्राफी', 'நினைவுகள் மற்றும் புகைப்படம்'),
        items: [
          text('Couple or family photo collection', 'जोड़े या परिवार की तस्वीरें', 'இணையர் அல்லது குடும்பப் புகைப்படத் தொகுப்பு'),
          text('Memory display or photo session', 'यादों की प्रदर्शनी या फोटो सत्र', 'நினைவுக் காட்சி அல்லது புகைப்பட அமர்வு')
        ]
      },
      {
        id: 'decor',
        weight: 0.18,
        name: text('Anniversary Decor', 'वर्षगांठ सजावट', 'ஆண்டுவிழா அலங்காரம்'),
        items: [
          text('Personalized table and photo display', 'व्यक्तिगत मेज और फोटो सजावट', 'தனிப்பயன் மேசை மற்றும் புகைப்படக் காட்சி'),
          text('Lighting and flowers', 'रोशनी और फूल', 'விளக்குகள் மற்றும் மலர்கள்')
        ]
      },
      {
        id: 'activities',
        weight: 0.2,
        name: text('Celebration & Shared Activities', 'उत्सव एवं साझा गतिविधियां', 'கொண்டாட்டம் மற்றும் பகிர்வு செயல்பாடுகள்'),
        items: [
          text('Toasts, speeches, or memory sharing', 'टोस्ट, भाषण या यादें साझा करना', 'வாழ்த்துரை, உரை அல்லது நினைவுகளைப் பகிர்தல்'),
          text('Music and guest activities', 'संगीत और अतिथि गतिविधियां', 'இசை மற்றும் விருந்தினர் செயல்பாடுகள்')
        ]
      },
      {
        id: 'coordination',
        weight: 0.12,
        name: text('Guest Coordination & Keepsakes', 'अतिथि समन्वय एवं स्मृति-चिह्न', 'விருந்தினர் ஒருங்கிணைப்பு மற்றும் நினைவுப் பொருட்கள்'),
        items: [
          text('Guest communication and seating', 'अतिथि सूचना और बैठने की व्यवस्था', 'விருந்தினர் தொடர்பு மற்றும் இருக்கை ஏற்பாடு'),
          text('Keepsakes and contingency', 'स्मृति-चिह्न और आकस्मिक व्यवस्था', 'நினைவுப் பொருட்கள் மற்றும் அவசரத் திட்டம்')
        ]
      }
    ],
    milestones: [
      {
        title: text('Shape the Anniversary Celebration', 'वर्षगांठ उत्सव की रूपरेखा', 'ஆண்டுவிழா கொண்டாட்டத்தைத் திட்டமிடுங்கள்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Choose an intimate dinner or a larger party format', 'निजी रात्रिभोज या बड़ी पार्टी का स्वरूप चुनें', 'நெருக்கமான இரவு உணவு அல்லது பெரிய விழா முறையைத் தேர்ந்தெடுக்கவும்'),
          text('Gather meaningful photos and memories to share', 'साझा करने के लिए खास तस्वीरें और यादें जुटाएं', 'பகிர்வதற்கான முக்கியப் புகைப்படங்கள் மற்றும் நினைவுகளைச் சேகரிக்கவும்')
        ]
      },
      {
        title: text('Prepare the Dinner & Memory Moments', 'रात्रिभोज एवं यादों की तैयारी', 'இரவு உணவு மற்றும் நினைவு தருணங்களைத் தயார்செய்க'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Confirm dinner menu, seating, and guest needs', 'भोजन मेनू, बैठने और अतिथि जरूरतें तय करें', 'உணவு பட்டியல், இருக்கை மற்றும் விருந்தினர் தேவைகளை உறுதிசெய்க'),
          text('Arrange photos, a toast, and optional speeches', 'तस्वीरें, टोस्ट और वैकल्पिक भाषण तय करें', 'புகைப்படங்கள், வாழ்த்துரை மற்றும் விருப்ப உரைகளை ஏற்பாடு செய்யுங்கள்')
        ]
      },
      {
        title: text('Anniversary Celebration Day', 'वर्षगांठ उत्सव का दिन', 'ஆண்டுவிழா கொண்டாட்ட நாள்'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Welcome guests and share the couple or family memories', 'अतिथियों का स्वागत और जोड़े या परिवार की यादें साझा करें', 'விருந்தினர்களை வரவேற்று இணையர் அல்லது குடும்ப நினைவுகளைப் பகிருங்கள்'),
          text('Host dinner, photos, and the planned celebration activities', 'रात्रिभोज, तस्वीरें और उत्सव गतिविधियां आयोजित करें', 'இரவு உணவு, புகைப்படம் மற்றும் திட்டமிட்ட கொண்டாட்டங்களை நடத்துங்கள்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('A dinner or party venue suited to the couple or family', 'जोड़े या परिवार के अनुकूल रात्रिभोज या पार्टी स्थल', 'இணையர் அல்லது குடும்பத்திற்குப் பொருத்தமான இரவு உணவு அல்லது விழா இடம்'),
      venueQuestions: [
        text('Can the venue support a photo or memory display?', 'क्या स्थल फोटो या यादों की प्रदर्शनी के लिए उपयुक्त है?', 'புகைப்படம் அல்லது நினைவுக் காட்சிக்கு இடவசதி உள்ளதா?'),
        text('Can the dinner and any speeches fit the schedule?', 'क्या रात्रिभोज और भाषण समय-सारणी में समा सकते हैं?', 'இரவு உணவு மற்றும் உரைகளை அட்டவணைக்குள் நடத்த முடியுமா?')
      ],
      cateringMenu: text('Anniversary dinner or party menu', 'वर्षगांठ रात्रिभोज या पार्टी मेनू', 'ஆண்டுவிழா இரவு உணவு அல்லது விருந்து'),
      cateringDescription: text('Choose a meal style and service pace that leave time for photos and shared memories.', 'ऐसा भोजन और सेवा चुनें जिसमें तस्वीरों और साझा यादों के लिए समय रहे।', 'புகைப்படங்கள் மற்றும் நினைவுகளைப் பகிர நேரமளிக்கும் உணவு மற்றும் சேவையைத் தேர்ந்தெடுக்கவும்.'),
      decorTheme: text('Personalized anniversary memory display', 'व्यक्तिगत वर्षगांठ स्मृति सजावट', 'தனிப்பயன் ஆண்டுவிழா நினைவுக் காட்சி'),
      decorPoints: [
        text('Couple or family photo display', 'जोड़े या परिवार की तस्वीरों का प्रदर्शन', 'இணையர் அல்லது குடும்பப் புகைப்படக் காட்சி'),
        text('Dinner tables and toast area', 'रात्रिभोज मेज और टोस्ट स्थान', 'இரவு உணவு மேசைகள் மற்றும் வாழ்த்துரை பகுதி')
      ]
    }
  },
  corporate: {
    categories: [
      {
        id: 'venue_av',
        weight: 0.25,
        name: text('Venue, AV & Production', 'स्थल, ऑडियो-विजुअल एवं तकनीकी व्यवस्था', 'இடம், ஒலி-ஒளி மற்றும் தொழில்நுட்பம்'),
        items: [
          text('Meeting venue and room setup', 'बैठक स्थल और कक्ष व्यवस्था', 'கூட்ட இடம் மற்றும் அறை ஏற்பாடு'),
          text('Microphones, display, and AV support', 'माइक्रोफोन, डिस्प्ले और तकनीकी सहायता', 'ஒலிவாங்கி, திரை மற்றும் தொழில்நுட்ப உதவி')
        ]
      },
      {
        id: 'programme',
        weight: 0.2,
        name: text('Agenda & Speaker Support', 'कार्यसूची एवं वक्ता सहायता', 'நிகழ்ச்சி நிரல் மற்றும் பேச்சாளர் உதவி'),
        items: [
          text('Speaker preparation and briefing', 'वक्ता तैयारी और जानकारी', 'பேச்சாளர் தயாரிப்பு மற்றும் விளக்கக் கூட்டம்'),
          text('Agenda materials and presentation support', 'कार्यसूची सामग्री और प्रस्तुति सहायता', 'நிகழ்ச்சி நிரல் மற்றும் விளக்கக்காட்சி உதவி')
        ]
      },
      {
        id: 'registration',
        weight: 0.18,
        name: text('Registration & Professional Logistics', 'पंजीकरण एवं पेशेवर संचालन', 'பதிவு மற்றும் தொழில்முறை ஏற்பாடுகள்'),
        items: [
          text('Registration desk and attendee materials', 'पंजीकरण डेस्क और प्रतिभागी सामग्री', 'பதிவு மேசை மற்றும் பங்கேற்பாளர் பொருட்கள்'),
          text('Signage, badges, and event communications', 'संकेतक, बैज और कार्यक्रम सूचना', 'அறிவிப்புகள், அடையாள அட்டைகள் மற்றும் நிகழ்வு தகவல்')
        ]
      },
      {
        id: 'catering_networking',
        weight: 0.22,
        name: text('Catering & Networking', 'भोजन एवं नेटवर्किंग', 'உணவு மற்றும் தொடர்பாடல்'),
        items: [
          text('Coffee breaks and refreshments', 'कॉफी ब्रेक और जलपान', 'காப்பி இடைவேளை மற்றும் சிற்றுண்டி'),
          text('Networking meal or reception', 'नेटवर्किंग भोजन या स्वागत', 'தொடர்பாடல் உணவு அல்லது வரவேற்பு')
        ]
      },
      {
        id: 'operations',
        weight: 0.15,
        name: text('Staffing & Event Operations', 'कर्मचारी एवं कार्यक्रम संचालन', 'பணியாளர் மற்றும் நிகழ்வு செயல்பாடுகள்'),
        items: [
          text('On-site coordination and staffing', 'कार्यक्रम स्थल समन्वय और कर्मचारी', 'நிகழ்விட ஒருங்கிணைப்பு மற்றும் பணியாளர்'),
          text('Contingency and technical backup', 'आकस्मिक और तकनीकी बैकअप', 'அவசர மற்றும் தொழில்நுட்ப மாற்று ஏற்பாடு')
        ]
      }
    ],
    milestones: [
      {
        title: text('Set the Business Event Objectives', 'व्यावसायिक कार्यक्रम के उद्देश्य तय करें', 'தொழில்முறை நிகழ்வு நோக்கங்களைத் தீர்மானிக்கவும்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Define audience, outcomes, and agenda', 'दर्शक, उद्देश्य और कार्यसूची तय करें', 'பங்கேற்பாளர்கள், நோக்கங்கள் மற்றும் நிகழ்ச்சி நிரலைத் தீர்மானிக்கவும்'),
          text('Confirm speakers, venue, and AV requirements', 'वक्ताओं, स्थल और तकनीकी जरूरतों की पुष्टि करें', 'பேச்சாளர்கள், இடம் மற்றும் தொழில்நுட்பத் தேவைகளை உறுதிசெய்க')
        ]
      },
      {
        title: text('Prepare Registration & Production', 'पंजीकरण एवं तकनीकी तैयारी', 'பதிவு மற்றும் தொழில்நுட்பத் தயாரிப்பு'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Prepare registration, attendee communications, and badges', 'पंजीकरण, प्रतिभागी सूचना और बैज तैयार करें', 'பதிவு, பங்கேற்பாளர் தகவல் மற்றும் அடையாள அட்டைகளைத் தயார்செய்க'),
          text('Test presentations, microphones, and room AV', 'प्रस्तुतियां, माइक्रोफोन और कक्ष तकनीक जांचें', 'விளக்கக்காட்சிகள், ஒலிவாங்கி மற்றும் அறை ஒலி-ஒளியைச் சோதிக்கவும்')
        ]
      },
      {
        title: text('Business Event Agenda Day', 'व्यावसायिक कार्यक्रम का दिन', 'தொழில்முறை நிகழ்வு நாள்'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Register attendees and brief speakers', 'प्रतिभागियों का पंजीकरण और वक्ताओं को जानकारी दें', 'பங்கேற்பாளர்களைப் பதிவு செய்து பேச்சாளர்களுக்கு விளக்கமளிக்கவும்'),
          text('Run the agenda, AV support, and networking breaks', 'कार्यसूची, तकनीकी सहायता और नेटवर्किंग ब्रेक चलाएं', 'நிகழ்ச்சி நிரல், தொழில்நுட்ப உதவி மற்றும் தொடர்பாடல் இடைவேளைகளை நடத்துங்கள்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('A professional venue with reliable AV and registration space', 'विश्वसनीय तकनीक और पंजीकरण स्थान वाला पेशेवर स्थल', 'நம்பகமான ஒலி-ஒளி மற்றும் பதிவு இடமுள்ள தொழில்முறை அரங்கம்'),
      venueQuestions: [
        text('What AV, microphones, and technical support are included?', 'कौन-सी तकनीक, माइक्रोफोन और सहायता शामिल हैं?', 'என்ன ஒலி-ஒளி, ஒலிவாங்கி மற்றும் தொழில்நுட்ப உதவி கிடைக்கும்?'),
        text('Is there a suitable registration and networking area?', 'क्या पंजीकरण और नेटवर्किंग के लिए उपयुक्त स्थान है?', 'பதிவு மற்றும் தொடர்பாடலுக்கு ஏற்ற பகுதி உள்ளதா?')
      ],
      cateringMenu: text('Professional event refreshments and networking service', 'पेशेवर कार्यक्रम जलपान एवं नेटवर्किंग भोजन', 'தொழில்முறை நிகழ்வு சிற்றுண்டி மற்றும் தொடர்பாடல் உணவு'),
      cateringDescription: text('Schedule refreshments and meals around sessions; confirm dietary needs and service timing.', 'सत्रों के अनुसार जलपान और भोजन रखें; खान-पान और सेवा का समय तय करें।', 'அமர்வுகளுக்கேற்ப உணவு இடைவேளைகளைத் திட்டமிட்டு, உணவு விருப்பங்களையும் நேரத்தையும் உறுதிசெய்க.'),
      decorTheme: text('Clear professional event branding and wayfinding', 'स्पष्ट पेशेवर ब्रांडिंग एवं दिशा संकेत', 'தெளிவான தொழில்முறை அடையாளம் மற்றும் வழிகாட்டி'),
      decorPoints: [
        text('Registration and directional signage', 'पंजीकरण एवं दिशा संकेत', 'பதிவு மற்றும் வழிகாட்டி அறிவிப்புகள்'),
        text('Speaker stage and presentation display', 'वक्ता मंच और प्रस्तुति डिस्प्ले', 'பேச்சாளர் மேடை மற்றும் விளக்கத் திரை')
      ]
    }
  },
  other: {
    categories: [
      {
        id: 'venue',
        weight: 0.25,
        name: text('Venue & Essential Setup', 'स्थल एवं आवश्यक व्यवस्था', 'இடம் மற்றும் அடிப்படை ஏற்பாடு'),
        items: [
          text('Space suited to the described event', 'वर्णित कार्यक्रम के अनुकूल स्थान', 'விவரிக்கப்பட்ட நிகழ்வுக்குப் பொருத்தமான இடம்'),
          text('Seating, access, and basic facilities', 'बैठक, पहुंच और मूलभूत सुविधाएं', 'இருக்கை, அணுகல் மற்றும் அடிப்படை வசதிகள்')
        ]
      },
      {
        id: 'programme',
        weight: 0.25,
        name: text('Programme & Activities', 'कार्यक्रम एवं गतिविधियां', 'நிகழ்ச்சி மற்றும் செயல்பாடுகள்'),
        items: [
          text('Materials for the described activities', 'वर्णित गतिविधियों की सामग्री', 'விவரிக்கப்பட்ட செயல்பாடுகளுக்கான பொருட்கள்'),
          text('Schedule and participant communications', 'समय-सारणी और प्रतिभागी सूचना', 'நேர அட்டவணை மற்றும் பங்கேற்பாளர் தகவல்')
        ]
      },
      {
        id: 'hospitality',
        weight: 0.25,
        name: text('Food & Hospitality', 'भोजन एवं आतिथ्य', 'உணவு மற்றும் விருந்தோம்பல்'),
        items: [
          text('Food or refreshments for participants', 'प्रतिभागियों के लिए भोजन या जलपान', 'பங்கேற்பாளர்களுக்கான உணவு அல்லது சிற்றுண்டி'),
          text('Serving and dietary accommodations', 'परोसने और खान-पान की व्यवस्था', 'பரிமாறுதல் மற்றும் உணவு விருப்ப ஏற்பாடுகள்')
        ]
      },
      {
        id: 'operations',
        weight: 0.25,
        name: text('Coordination & Contingency', 'समन्वय एवं आकस्मिक व्यवस्था', 'ஒருங்கிணைப்பு மற்றும் அவசரத் திட்டம்'),
        items: [
          text('Event coordination and staffing', 'कार्यक्रम समन्वय और कर्मचारी', 'நிகழ்வு ஒருங்கிணைப்பு மற்றும் பணியாளர்'),
          text('Equipment and contingency supplies', 'उपकरण और आकस्मिक सामग्री', 'கருவிகள் மற்றும் அவசரத் தேவைக்கான பொருட்கள்')
        ]
      }
    ],
    milestones: [
      {
        title: text('Understand the Event Brief', 'कार्यक्रम विवरण समझें', 'நிகழ்வு விவரத்தைப் புரிந்துகொள்ளுங்கள்'),
        timeframe: text('Planning', 'योजना चरण', 'திட்டமிடல்'),
        tasks: [
          text('Confirm the purpose and activities for: ', 'उद्देश्य और गतिविधियां तय करें: ', 'நோக்கம் மற்றும் செயல்பாடுகளை உறுதிசெய்க: '),
          text('Estimate attendance, access, and resource needs', 'उपस्थिति, पहुंच और संसाधन जरूरतें तय करें', 'வருகை, அணுகல் மற்றும் வளத் தேவைகளை மதிப்பிடுங்கள்')
        ]
      },
      {
        title: text('Coordinate the Event Details', 'कार्यक्रम के विवरण समन्वित करें', 'நிகழ்வு விவரங்களை ஒருங்கிணைக்கவும்'),
        timeframe: text('Before the event', 'कार्यक्रम से पहले', 'நிகழ்வுக்கு முன்'),
        tasks: [
          text('Confirm venue, supplies, and participant updates', 'स्थल, सामग्री और प्रतिभागी सूचना तय करें', 'இடம், பொருட்கள் மற்றும் பங்கேற்பாளர் தகவலை உறுதிசெய்க'),
          text('Prepare the schedule around the user-described activities', 'उपयोगकर्ता की गतिविधियों के अनुसार समय-सारणी बनाएं', 'பயனர் விவரித்த செயல்பாடுகளுக்கேற்ப அட்டவணையைத் தயார்செய்க')
        ]
      },
      {
        title: text('Event Day Operations', 'कार्यक्रम दिवस संचालन', 'நிகழ்வு நாள் செயல்பாடுகள்'),
        timeframe: text('Event day', 'कार्यक्रम का दिन', 'நிகழ்வு நாள்'),
        tasks: [
          text('Welcome participants and run the planned programme', 'प्रतिभागियों का स्वागत और नियोजित कार्यक्रम चलाएं', 'பங்கேற்பாளர்களை வரவேற்று திட்டமிட்ட நிகழ்ச்சியை நடத்துங்கள்'),
          text('Coordinate hospitality, activities, and closing', 'आतिथ्य, गतिविधियों और समापन का समन्वय करें', 'விருந்தோம்பல், செயல்பாடுகள் மற்றும் நிறைவை ஒருங்கிணைக்கவும்')
        ]
      }
    ],
    recommendations: {
      venueStyle: text('Choose a venue based on the activity and access needs in the event description', 'कार्यक्रम विवरण की गतिविधि और पहुंच जरूरतों के अनुसार स्थल चुनें', 'நிகழ்வு விவரத்தில் உள்ள செயல்பாடு மற்றும் அணுகல் தேவைக்கேற்ப இடத்தைத் தேர்ந்தெடுக்கவும்'),
      venueQuestions: [
        text('Can the space support the activities described by the user?', 'क्या स्थल उपयोगकर्ता द्वारा वर्णित गतिविधियों के अनुकूल है?', 'பயனர் விவரித்த செயல்பாடுகளுக்கு இடம் பொருத்தமானதா?'),
        text('What facilities, access, and equipment are available?', 'कौन-सी सुविधाएं, पहुंच और उपकरण उपलब्ध हैं?', 'என்ன வசதிகள், அணுகல் மற்றும் கருவிகள் கிடைக்கின்றன?')
      ],
      cateringMenu: text('Food or refreshments suited to the described event', 'वर्णित कार्यक्रम के अनुकूल भोजन या जलपान', 'விவரிக்கப்பட்ட நிகழ்வுக்குப் பொருத்தமான உணவு அல்லது சிற்றுண்டி'),
      cateringDescription: text('Set quantities and service around the event description, attendance, and stated dietary needs.', 'कार्यक्रम विवरण, उपस्थिति और बताई गई खान-पान की जरूरतों के अनुसार भोजन और सेवा तय करें।', 'நிகழ்வு விவரம், வருகை மற்றும் உணவு தேவைகளுக்கேற்ப அளவு மற்றும் சேவையைத் திட்டமிடுங்கள்.'),
      decorTheme: text('Practical setup for the described event', 'वर्णित कार्यक्रम के लिए व्यावहारिक व्यवस्था', 'விவரிக்கப்பட்ட நிகழ்வுக்கான நடைமுறை ஏற்பாடு'),
      decorPoints: [
        text('Participant information and wayfinding', 'प्रतिभागी सूचना और दिशा संकेत', 'பங்கேற்பாளர் தகவல் மற்றும் வழிகாட்டி'),
        text('Activity space and essential equipment', 'गतिविधि स्थल और आवश्यक उपकरण', 'செயல்பாட்டு இடம் மற்றும் தேவையான கருவிகள்')
      ]
    }
  }
};

const EVENT_INSTRUCTIONS = {
  wedding: 'Wedding: make a ceremony-and-reception plan with a wedding venue, ceremony/reception catering, photography, attire/decor, and a timed ceremony and reception timeline. Add cultural rituals only when explicitly selected or stated by the user; never infer them from language, location, or presumed religion.',
  birthday: 'Birthday: make a birthday-specific plan with cake and candles, birthday decorations, age-appropriate games/activities, party food, and a birthday party timeline. Do not include wedding ceremonies, wedding vendors, or wedding traditions.',
  community: 'Community gathering: make a community programme focused on participant involvement, accessible shared space, shared food, volunteer roles, group activities, and cleanup. Do not include wedding ceremonies or assume religious customs.',
  anniversary: 'Anniversary: make a couple/family celebration plan with a dinner or party, shared memories and photos, personal decor, toasts or optional speeches, and an anniversary-specific timeline. Do not include wedding ceremonies unless explicitly described as a user-selected custom.',
  corporate: 'Corporate event: make a professional plan with registration, agenda, speakers, AV and presentation checks, networking, catering breaks, staffing, and professional logistics. Do not include wedding or birthday traditions.',
  other: 'Other event: infer the programme, supplies, venue, and hospitality from the user-provided event title, notes, theme, and description. Do not force wedding, birthday, religious, or corporate content unless the user describes it.'
};

function localized(value, language) {
  return value[language] || value.en;
}

function normalizedType(eventType) {
  return EVENT_BLUEPRINTS[eventType] ? eventType : 'other';
}

export function getEventPlanningInstructions(eventType, language = 'en') {
  const instruction = EVENT_INSTRUCTIONS[normalizedType(eventType)];
  return `${instruction}\nUse a distinctive event-specific budget, categories, recommendations, and a sequenced timeline. Match the requested output language (${language}) without assuming cultural or religious practices.`;
}

export function applyEventPlanBlueprint(plan, {
  eventType,
  title,
  notes = '',
  guestCount,
  totalBudget,
  currency,
  language = 'en',
  protectedRituals = []
}) {
  const type = normalizedType(eventType);
  const blueprint = EVENT_BLUEPRINTS[type];
  const budget = round2(Number(totalBudget));
  const guestTotal = Math.max(1, Number(guestCount) || 1);
  const categoryAmounts = [];
  let allocatedSoFar = 0;

  blueprint.categories.forEach((category, index) => {
    const amount = index === blueprint.categories.length - 1
      ? round2(budget - allocatedSoFar)
      : round2(budget * category.weight);
    categoryAmounts.push(amount);
    allocatedSoFar = round2(allocatedSoFar + amount);
  });

  plan.budgetCategories = blueprint.categories.map((category, categoryIndex) => {
    const categoryAmount = categoryAmounts[categoryIndex];
    let itemAllocated = 0;
    const items = category.items.map((name, itemIndex) => {
      const estimatedCost = itemIndex === category.items.length - 1
        ? round2(categoryAmount - itemAllocated)
        : round2(categoryAmount / category.items.length);
      itemAllocated = round2(itemAllocated + estimatedCost);
      return {
        id: `item_${type}_${category.id}_${itemIndex + 1}`,
        name: localized(name, language),
        estimatedCost,
        status: 'pending',
        isFrozen: false,
        notes: localized(name, language)
      };
    });

    return {
      id: `cat_${type}_${category.id}`,
      name: localized(category.name, language),
      allocatedAmount: categoryAmount,
      percentage: budget ? round2(categoryAmount / budget * 100) : 0,
      priority: categoryIndex < 2 ? 'essential' : 'recommended',
      items
    };
  });

  const eventNotes = typeof notes === 'string' ? notes.trim() : '';
  const chosenRituals = filterRitualsForEvent(protectedRituals, eventType)
    .filter(ritual => ritual.isProtected);
  plan.milestones = blueprint.milestones.map((milestone, index) => ({
    id: `m_${type}_${index + 1}`,
    title: localized(milestone.title, language),
    timeframe: localized(milestone.timeframe, language),
    order: index + 1,
    tasks: milestone.tasks.map((task, taskIndex) => ({
      id: `t_${type}_${index + 1}_${taskIndex + 1}`,
      title: localized(task, language) +
        (type === 'other' && index === 0 && taskIndex === 0 ? title : ''),
      category: 'planning',
      status: 'todo',
      isFrozen: false,
      dueDate: localized(milestone.timeframe, language)
    }))
  }));

  if (type === 'other' && eventNotes) {
    plan.milestones[1].tasks.push({
      id: 't_other_user_brief',
      title: `${localized(text('Use the event details provided: ', 'उपयोगकर्ता के कार्यक्रम विवरण का उपयोग करें: ', 'பயனர் வழங்கிய நிகழ்வு விவரங்களைப் பயன்படுத்தவும்: '), language)}${eventNotes}`,
      category: 'planning',
      status: 'todo',
      isFrozen: false,
      dueDate: localized(blueprint.milestones[1].timeframe, language)
    });
  }

  chosenRituals.forEach((ritual, index) => {
    const ceremonyMilestone = type === 'wedding'
      ? plan.milestones[2]
      : plan.milestones[plan.milestones.length - 1];
    ceremonyMilestone.tasks.push({
      id: `t_selected_ritual_${index + 1}`,
      ritualId: ritual.id,
      title: ritual.name,
      category: 'rituals',
      status: 'todo',
      isFrozen: false,
      dueDate: ceremonyMilestone.timeframe
    });
  });

  const venueCategory = blueprint.categories.findIndex(category =>
    category.id.includes('venue') || category.id === 'venue_av' || category.id === 'production'
  );
  const cateringCategory = blueprint.categories.findIndex(category =>
    category.id.includes('catering') || category.id.includes('food') ||
    category.id.includes('dinner') || category.id === 'shared_food' ||
    category.id === 'hospitality'
  );
  const venueAmount = categoryAmounts[Math.max(0, venueCategory)];
  const cateringAmount = categoryAmounts[Math.max(0, cateringCategory)];
  const cateringDefinition = blueprint.categories[cateringCategory];
  const recommendations = blueprint.recommendations;

  plan.recommendations = {
    venues: [{
      name: localized(recommendations.venueStyle, language),
      style: localized(recommendations.venueStyle, language),
      capacity: guestTotal,
      estimatedCostRange: `${round2(venueAmount * 0.8)} - ${round2(venueAmount)} ${currency}`,
      keyQuestions: recommendations.venueQuestions.map(question => localized(question, language))
    }],
    catering: [{
      menuType: localized(recommendations.cateringMenu, language),
      description: localized(recommendations.cateringDescription, language),
      estimatedCostPerGuest: round2(cateringAmount / guestTotal),
      signatureItems: (cateringDefinition?.items || []).map(item => localized(item, language)),
      dietaryAccommodations: []
    }],
    decor: [{
      themeConcept: localized(recommendations.decorTheme, language),
      colorPalette: [
        { name: 'Celebration accent', hex: '#C99A4A' },
        { name: 'Complementary accent', hex: '#668F96' }
      ],
      focalPoints: recommendations.decorPoints.map(point => localized(point, language)),
      diyVsRentalTips: localized(
        text('Confirm what is included with the venue before renting additional items.', 'अतिरिक्त सामग्री किराए पर लेने से पहले स्थल में शामिल सुविधाएं पूछें।', 'கூடுதல் பொருட்களை வாடகைக்கு எடுக்கும் முன் இடத்தில் சேர்க்கப்பட்டுள்ளவற்றை உறுதிசெய்க.'),
        language
      )
    }]
  };
}
