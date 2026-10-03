/**
 * Calculates SOS dispatch priority based on emergency parameters and geographic risk.
 * 
 * Rules:
 * - Critical: trapped, anyone injured, or inside a CRITICAL zone.
 * - High: medical help, or evacuation in a HIGH zone, or missing person.
 * - Medium: food / water, or need shelter.
 * - Low: general inquiries / non-urgent requests.
 * 
 * @param {object} params
 * @param {string} params.type - Emergency type ('trapped', 'evacuation', 'medical', 'food_water', 'shelter', 'missing')
 * @param {boolean} params.anyone_injured - Flag if anyone is injured
 * @param {string} params.zone_risk - Risk level of the zone ('critical', 'high', 'medium', 'low')
 * @param {number} [params.people_count=1] - Number of persons in distress
 * @param {string} [params.special_needs] - Optional details (e.g. 'Elderly, Infant, Diabetic')
 * @returns {string} 'critical' | 'high' | 'medium' | 'low'
 */
export const calculatePriority = ({
  type = '',
  anyone_injured = false,
  zone_risk = 'low',
  people_count = 1,
  special_needs = ''
}) => {
  const normType = String(type).toLowerCase().trim().replace(/[\s-]/g, '_');
  const normRisk = String(zone_risk).toLowerCase().trim();
  const specialLower = String(special_needs).toLowerCase();

  // 1. Critical Priority
  // Condition: trapped, anyone injured, or inside a CRITICAL zone
  if (
    normType.includes('trapped') ||
    Boolean(anyone_injured) === true ||
    normRisk === 'critical' ||
    specialLower.includes('trapped') ||
    specialLower.includes('drowning') ||
    specialLower.includes('submerged')
  ) {
    return 'critical';
  }

  // 2. High Priority
  // Condition: medical or evacuation in a HIGH zone, or missing person
  if (
    normType.includes('medical') ||
    (normType.includes('evac') && normRisk === 'high') ||
    normType.includes('missing') ||
    specialLower.includes('pregnant') ||
    specialLower.includes('infant') ||
    specialLower.includes('oxygen') ||
    (people_count >= 6 && normRisk === 'high')
  ) {
    return 'high';
  }

  // 3. Medium Priority
  // Condition: food/water/shelter, or general evacuation outside critical/high zones
  if (
    normType.includes('food') ||
    normType.includes('water') ||
    normType.includes('shelter') ||
    normType.includes('supplies') ||
    normType.includes('evac')
  ) {
    return 'medium';
  }

  // 4. Low Priority
  return 'low';
};

export default { calculatePriority };
