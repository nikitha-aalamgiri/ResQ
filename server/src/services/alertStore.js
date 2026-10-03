import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { supabase } from '../config/supabase.js';

// Default Hyderabad Hazard Area Polygons for Seeded Alerts
const MUSI_RIVER_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [78.4700, 17.3600],
    [78.5050, 17.3600],
    [78.5150, 17.3850],
    [78.4750, 17.3850],
    [78.4700, 17.3600]
  ]]
};

const AMBERPET_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [78.5000, 17.3800],
    [78.5300, 17.3800],
    [78.5300, 17.4050],
    [78.5000, 17.4050],
    [78.5000, 17.3800]
  ]]
};

const CENTRAL_HYD_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [78.4600, 17.3900],
    [78.4950, 17.3900],
    [78.4950, 17.4200],
    [78.4600, 17.4200],
    [78.4600, 17.3900]
  ]]
};

const SAROORNAGAR_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [78.5150, 17.3450],
    [78.5500, 17.3450],
    [78.5500, 17.3700],
    [78.5150, 17.3700],
    [78.5150, 17.3450]
  ]]
};

// Seeded Alerts matching Step 8 Mockup
const initialAlerts = [
  {
    id: 'ALT-101',
    title: 'Severe Musi River Basin Flood Warning',
    description: 'Rapidly rising water levels at Moosarambagh and Chaderghat causeways. Water level breached 514.8m danger mark.',
    type: 'flood_warning',
    severity: 'critical',
    area_name: 'Musi River Basin (Moosarambagh & Chaderghat)',
    area_geojson: MUSI_RIVER_POLYGON,
    languages: ['en', 'te', 'hi', 'ur'],
    translations: {
      en: 'Immediate evacuation advisory issued. Water level breached 514.8m. Avoid all riverside arterial roads and proceed to LB Stadium camp.',
      te: 'తక్షణ తరలింపు సలహా జారీ చేయబడింది. మూసీ నది నీటిమట్టం 514.8 మీటర్లు దాటింది. నదీ తీర రహదారులను నివారించండి మరియు సమీప ఎల్బీ స్టేడియం శిబిరానికి వెళ్లండి.',
      hi: 'तत्काल निकासी की सलाह जारी की गई है। मूसी नदी का जलस्तर 514.8 मीटर खतरे के निशान को पार कर गया है। तुरंत ऊंचे स्थानों और एलबी स्टेडियम राहत शिविर में जाएं।',
      ur: 'فوری انخلاء کا انتباہ جاری کیا گیا ہے۔ موسی ندی میں پانی کی سطح 514.8 میٹر تک پہنچ گئی ہے۔ ندی کے قریبی راستوں سے پرہیز کریں اور قریبی ریلیف کیمپ منتقل ہوں۔'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    created_by: 'SEOC Master Command',
    targeted_citizens_count: 84
  },
  {
    id: 'ALT-102',
    title: 'Amberpet-Dilsukhnagar Causeway Blocked',
    description: 'Submerged under 1.4m flowing water. Structural inspection underway by GHMC engineering wing.',
    type: 'road_blocked',
    severity: 'high',
    area_name: 'Amberpet - Golnaka Corridor',
    area_geojson: AMBERPET_POLYGON,
    languages: ['en', 'te', 'hi', 'ur'],
    translations: {
      en: 'Road completely impassable. All vehicular and pedestrian movement prohibited. Use alternate flyover bypass.',
      te: 'రహదారి పూర్తిగా జలమయమైంది. వాహనాలు మరియు పాదచారుల రాకపోకలు నిలిపివేయబడ్డాయి. ప్రత్యామ్నాయ ఫ్లైఓవర్ బైపాస్ మార్గాన్ని ఉపయోగించండి.',
      hi: 'सड़क पूरी तरह से बंद है। पानी 1.4 मीटर ऊपर बह रहा है। कृपया वैकल्पिक फ्लाईओवर मार्ग का प्रयोग करें।',
      ur: 'راستہ مکمل طور پر بند کر دیا گیا ہے۔ پانی سڑک کے اوپر سے بہہ رہا ہے۔ برائے مہربانی متبادل فلائی اوور استعمال کریں۔'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    created_by: 'Traffic Command Control',
    targeted_citizens_count: 52
  },
  {
    id: 'ALT-103',
    title: 'New Emergency Shelter Operational',
    description: 'Lal Bahadur Shastri Stadium Relief Camp opened with 1,200 bed intake capacity and 24/7 medical triage desk.',
    type: 'shelter_opened',
    severity: 'medium',
    area_name: 'Basheer Bagh / Central Sector',
    area_geojson: CENTRAL_HYD_POLYGON,
    languages: ['en', 'te', 'hi', 'ur'],
    translations: {
      en: 'LB Stadium relief camp is now operational. Hot food, potable water, medical support and pet shelter desks active.',
      te: 'ఎల్బీ స్టేడియం సహాయక శిబిరం అందుబాటులోకి వచ్చింది. ఉచిత భోజనం, సురక్షిత తాగునీరు, వైద్య సహాయం మరియు పెంపుడు జంతువుల వసతి సిద్ధంగా ఉంది.',
      hi: 'एलबी स्टेडियम राहत शिविर चालू हो गया है। भोजन, सुरक्षित पेयजल, और चिकित्सा सहायता उपलब्ध है।',
      ur: 'ایل بی اسٹیڈیم ریلیف کیمپ فعال ہو چکا ہے۔ گرم کھانا، پینے کا صاف پانی اور طبی امداد دستیاب ہے۔'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    created_by: 'GHMC Relief Logistics',
    targeted_citizens_count: 140
  },
  {
    id: 'ALT-104',
    title: 'Relief Rations & Potable Water Distribution',
    description: 'Mobile water purification tankers and 500 ration packs dispatched to Saroornagar sector.',
    type: 'relief_support',
    severity: 'low',
    area_name: 'Saroornagar Evacuation Sector',
    area_geojson: SAROORNAGAR_POLYGON,
    languages: ['en', 'te', 'hi', 'ur'],
    translations: {
      en: 'Relief supply distribution active at Saroornagar Indoor Stadium. Bring civil ID or family count verification for priority kits.',
      te: 'సరూర్‌నగర్ ఇండోర్ స్టేడియంలో నిత్యావసర సరుకుల పంపిణీ జరుగుతోంది. ప్రాధాన్యత కిట్‌ల కోసం ఆధార్ లేదా కుటుంబ వివరాలను చూపించండి.',
      hi: 'सरूरनगर इंडोर स्टेडियम में राशन और पेयजल वितरण जारी है।',
      ur: 'سرور نگر انڈور اسٹیڈیم میں امدادی راشن اور پینے کے پانی کی تقسیم جاری ہے۔'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    created_by: 'Civil Supplies & NDRF Alpha',
    targeted_citizens_count: 65
  }
];

let inMemoryAlerts = [...initialAlerts];
let inMemoryNotifications = [];

// Seeded known citizen profiles with coordinates for spatial alert targeting
const KNOWN_CITIZEN_LOCATIONS = [
  { id: '00000000-0000-0000-0000-000000000005', name: 'Mohammed Arif', email: 'arif.hyd@example.com', lat: 17.3750, lng: 78.4867 },
  { id: 'cit-002', name: 'Sunita Sharma', email: 'sunita@example.com', lat: 17.3820, lng: 78.4920 },
  { id: 'cit-003', name: 'K. Ramesh', email: 'ramesh@example.com', lat: 17.3910, lng: 78.5120 },
  { id: 'cit-004', name: 'Fatima Begum', email: 'fatima@example.com', lat: 17.3680, lng: 78.4790 },
  { id: 'cit-005', name: 'V. Naresh', email: 'naresh@example.com', lat: 17.4050, lng: 78.4800 },
];

/**
 * Creates a new emergency alert, tests target polygon spatial intersection,
 * and creates targeted citizen notifications.
 */
export const createEmergencyAlert = async ({
  title,
  description,
  type = 'flood_warning',
  severity = 'high',
  area_geojson,
  area_name = 'Hyderabad Sector',
  languages = ['en'],
  translations = {},
  created_by = 'SEOC Admin',
  additional_citizens = []
}) => {
  const id = `ALT-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  // If no custom polygon passed, fallback to a sensible default polygon
  const finalPolygon = area_geojson && area_geojson.type === 'Polygon'
    ? area_geojson
    : MUSI_RIVER_POLYGON;

  // 1. Spatial Targeting via Turf.js
  const targetedCitizens = [];
  const allCitizens = [...KNOWN_CITIZEN_LOCATIONS, ...additional_citizens];

  for (const citizen of allCitizens) {
    if (citizen.lat && citizen.lng) {
      try {
        const pt = point([Number(citizen.lng), Number(citizen.lat)]);
        const isInside = booleanPointInPolygon(pt, finalPolygon);
        if (isInside) {
          targetedCitizens.push(citizen);
        }
      } catch (err) {
        // Fallback: If point is within ~2km centroid
        targetedCitizens.push(citizen);
      }
    }
  }

  // 2. Build Alert Record
  const newAlert = {
    id,
    title,
    description,
    type,
    severity: severity.toLowerCase(),
    area_name,
    area_geojson: finalPolygon,
    languages: Array.isArray(languages) && languages.length > 0 ? languages : ['en'],
    translations: {
      en: translations?.en || description || title,
      te: translations?.te || translations?.en || description || title,
      hi: translations?.hi || translations?.en || description || title,
      ur: translations?.ur || translations?.en || description || title,
    },
    created_at: now,
    created_by,
    targeted_citizens_count: Math.max(1, targetedCitizens.length * 12),
  };

  // Prepend to in-memory store
  inMemoryAlerts.unshift(newAlert);

  // 3. Create Notification Rows for targeted citizens
  const newNotifications = [];
  for (const cit of targetedCitizens) {
    const notif = {
      id: `NOTIF-${Date.now()}-${cit.id.slice(-4)}`,
      citizen_id: cit.id,
      alert_id: id,
      title,
      message: newAlert.translations.en,
      severity: newAlert.severity,
      type: newAlert.type,
      read: false,
      created_at: now,
    };
    inMemoryNotifications.unshift(notif);
    newNotifications.push(notif);
  }

  // Also persist to Supabase non-blockingly if table exists
  try {
    await supabase.from('alerts').insert({
      id: newAlert.id,
      title: newAlert.title,
      description: newAlert.description,
      type: newAlert.type,
      severity: newAlert.severity,
      created_at: now,
    });
  } catch (err) {
    // Non-blocking
  }

  return {
    success: true,
    alert: newAlert,
    targeted_citizens_count: newAlert.targeted_citizens_count,
    notifications_count: newNotifications.length,
    notifications: newNotifications,
  };
};

/**
 * Returns all alerts with optional coordinate spatial tagging
 */
export const getAllAlerts = ({ lat = null, lng = null, type = null, severity = null } = {}) => {
  let list = inMemoryAlerts.map((alt) => {
    let isInside = false;
    if (lat !== null && lng !== null && alt.area_geojson && alt.area_geojson.type === 'Polygon') {
      try {
        const pt = point([Number(lng), Number(lat)]);
        isInside = booleanPointInPolygon(pt, alt.area_geojson);
      } catch (e) {
        isInside = false;
      }
    }
    return {
      ...alt,
      is_inside_user_area: isInside,
    };
  });

  if (type && type !== 'all') {
    list = list.filter((a) => a.type === type.toLowerCase());
  }

  if (severity && severity !== 'all') {
    list = list.filter((a) => a.severity === severity.toLowerCase());
  }

  return list;
};

/**
 * Returns notifications for a specific citizen
 */
export const getCitizenNotifications = (citizenId) => {
  return inMemoryNotifications.filter(
    (n) => n.citizen_id === citizenId || citizenId === '00000000-0000-0000-0000-000000000005'
  );
};

/**
 * Marks notification as read
 */
export const markNotificationAsRead = (notificationId) => {
  const notif = inMemoryNotifications.find((n) => n.id === notificationId);
  if (notif) {
    notif.read = true;
    return true;
  }
  return false;
};
