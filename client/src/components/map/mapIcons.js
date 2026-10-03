import L from 'leaflet';

/**
 * Custom Map Marker Badges using Lucide SVGs with circular white borders
 * Strict adherence to DESIGN.md palette and form factor.
 */

// Helper to wrap SVG in a circular white-border badge
const createMarkerBadgeHtml = (svgContent, bgColor, pulse = false) => {
  return `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      ${pulse ? `
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background-color: rgba(31, 111, 120, 0.2); border: 1.5px solid rgba(31, 111, 120, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      ` : ''}
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background-color: ${bgColor};
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 2px 5px rgba(15, 42, 61, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
      ">
        ${svgContent}
      </div>
    </div>
  `;
};

// 1. Shelter Marker: Green House Icon
export const shelterIcon = L.divIcon({
  className: 'floodwatch-shelter-icon',
  html: createMarkerBadgeHtml(
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    '#3B7A57'
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// 2. Hospital Marker: Red Cross Icon
export const hospitalIcon = L.divIcon({
  className: 'floodwatch-hospital-icon',
  html: createMarkerBadgeHtml(
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
    '#B42318'
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// 3. SOS Marker: Red Exclamation, colored by priority per DESIGN.md
export const createSosIcon = (priority = 'high') => {
  const colors = {
    critical: '#B42318',
    high: '#B54708',
    medium: '#A16207',
    low: '#3B7A57',
  };
  const color = colors[priority] || colors.high;

  return L.divIcon({
    className: `floodwatch-sos-icon-${priority}`,
    html: createMarkerBadgeHtml(
      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      color,
      priority === 'critical'
    ),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

// 4. Rescue Team / Responder Marker: Blue Vehicle / Truck Icon
export const responderIcon = L.divIcon({
  className: 'floodwatch-responder-icon',
  html: createMarkerBadgeHtml(
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`,
    '#1F6F78'
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// 5. Blocked Road Marker: No-Entry Icon
export const blockedRoadIcon = L.divIcon({
  className: 'floodwatch-blocked-road-icon',
  html: createMarkerBadgeHtml(
    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>`,
    '#991E14'
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

// 6. User Location: Blue Dot with a Ring
export const userLocationIcon = L.divIcon({
  className: 'floodwatch-user-location-icon',
  html: `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background-color: rgba(31, 111, 120, 0.25); border: 1.5px solid #1F6F78;"></div>
      <div style="width: 14px; height: 14px; border-radius: 9999px; background-color: #1F6F78; border: 2.5px solid #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 2;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});
