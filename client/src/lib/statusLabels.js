/**
 * Helper to map database status, priority, and role values to localized i18n keys
 */

export function getStatusLabel(status, t) {
  if (!status) return '';
  const normalized = String(status).toLowerCase().replace(/[\s-]/g, '_');
  const key = `status.${normalized}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return String(status).replace(/_/g, ' ').toUpperCase();
}

export function getPriorityLabel(priority, t) {
  if (!priority) return '';
  const normalized = String(priority).toLowerCase().replace(/[\s-]/g, '_');
  const key = `priority.${normalized}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return String(priority).toUpperCase();
}

export function getShelterStatusLabel(status, t) {
  if (!status) return '';
  const normalized = String(status).toLowerCase().replace(/[\s-]/g, '_');
  const key = `status.${normalized}`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return status;
}

export function getRoleLabel(role, t) {
  if (!role) return '';
  const normalized = String(role).toLowerCase().replace(/[\s-]/g, '_');
  const key = `auth.${normalized}Role`;
  const translated = t(key);
  if (translated && translated !== key) return translated;
  return role;
}
