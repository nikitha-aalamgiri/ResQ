/**
 * FloodResQ Static Bundled Emergency Content
 * Available immediately upon fresh app install even prior to first network sync.
 */

export const STATIC_CONTACTS = [
  {
    number: '112',
    service_key: 'national_emergency',
    label_key: 'offline.contacts.c112_label',
    agency_key: 'offline.contacts.c112_agency',
    desc_key: 'offline.contacts.c112_desc',
    category: 'primary',
    demo: true
  },
  {
    number: '108',
    service_key: 'ambulance',
    label_key: 'offline.contacts.c108_label',
    agency_key: 'offline.contacts.c108_agency',
    desc_key: 'offline.contacts.c108_desc',
    category: 'primary',
    demo: true
  },
  {
    number: '101',
    service_key: 'fire_rescue',
    label_key: 'offline.contacts.c101_label',
    agency_key: 'offline.contacts.c101_agency',
    desc_key: 'offline.contacts.c101_desc',
    category: 'primary',
    demo: true
  },
  {
    number: '1098',
    service_key: 'childline',
    label_key: 'offline.contacts.c1098_label',
    agency_key: 'offline.contacts.c1098_agency',
    desc_key: 'offline.contacts.c1098_desc',
    category: 'primary',
    demo: true
  },
  {
    number: '040-23454088',
    service_key: 'ghmc_control',
    label_key: 'offline.contacts.ghmc_label',
    agency_key: 'offline.contacts.ghmc_agency',
    desc_key: 'offline.contacts.ghmc_desc',
    category: 'municipal',
    demo: true
  }
];

export const STATIC_INSTRUCTIONS = [
  {
    key: 'move_to_higher_ground',
    category: 'evacuation',
    severity: 'critical',
    title_key: 'offline.safety.move_to_higher_ground_title',
    desc_key: 'offline.safety.move_to_higher_ground_desc',
  },
  {
    key: 'disconnect_utilities',
    category: 'safety',
    severity: 'warning',
    title_key: 'offline.safety.disconnect_utilities_title',
    desc_key: 'offline.safety.disconnect_utilities_desc',
  },
  {
    key: 'avoid_flood_waters',
    category: 'safety',
    severity: 'critical',
    title_key: 'offline.safety.avoid_flood_waters_title',
    desc_key: 'offline.safety.avoid_flood_waters_desc',
  },
  {
    key: 'prepare_emergency_kit',
    category: 'preparedness',
    severity: 'info',
    title_key: 'offline.safety.prepare_emergency_kit_title',
    desc_key: 'offline.safety.prepare_emergency_kit_desc',
  },
  {
    key: 'stay_informed',
    category: 'advisory',
    severity: 'info',
    title_key: 'offline.safety.stay_informed_title',
    desc_key: 'offline.safety.stay_informed_desc',
  },
];

/**
 * Seeds static contacts and instructions into IndexedDB if table is empty.
 */
export async function seedStaticContent(dbInstance) {
  try {
    const contactCount = await dbInstance.contacts.count();
    if (contactCount === 0) {
      await dbInstance.contacts.bulkPut(STATIC_CONTACTS);
      console.info('[OfflineDB] Seeded static emergency contacts.');
    }

    const instructionCount = await dbInstance.instructions.count();
    if (instructionCount === 0) {
      await dbInstance.instructions.bulkPut(STATIC_INSTRUCTIONS);
      console.info('[OfflineDB] Seeded static flood safety instructions.');
    }
  } catch (err) {
    console.warn('[OfflineDB] Error seeding static emergency content:', err);
  }
}
