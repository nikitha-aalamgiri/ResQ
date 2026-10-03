import React from 'react';
import { Plus, Minus, Navigation, MapPin } from 'lucide-react';

export const Legend = ({
  onZoomIn,
  onZoomOut,
  onLocateUser,
  locating = false,
  className = '',
  compact = false,
}) => {
  const legendItems = [
    { label: 'High Risk (Flooded)', type: 'color', color: '#B42318' },
    { label: 'Warning Zone', type: 'color', color: '#B54708' },
    { label: 'Safe Zone', type: 'color', color: '#3B7A57' },
    {
      label: 'Shelter',
      type: 'icon',
      badgeColor: '#3B7A57',
      svg: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
    },
    {
      label: 'Hospital',
      type: 'icon',
      badgeColor: '#B42318',
      svg: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>`
    },
    {
      label: 'Blocked Road',
      type: 'road',
      color: '#B42318',
    },
    {
      label: 'Your Location',
      type: 'user',
    }
  ];

  return (
    <div className={`flex flex-col gap-2 select-none ${className}`}>
      {/* Zoom and Locate Controls Floating Bar */}
      {(onZoomIn || onZoomOut || onLocateUser) && (
        <div className="flex items-center gap-1 bg-surface border border-app-border rounded-md p-1 shadow-none w-fit">
          {onZoomIn && (
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1.5 text-navy-ink hover:bg-app-bg rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep"
              title="Zoom In"
              aria-label="Zoom in"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {onZoomOut && (
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1.5 text-navy-ink hover:bg-app-bg rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep"
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          {onLocateUser && (
            <button
              type="button"
              onClick={onLocateUser}
              disabled={locating}
              className={`p-1.5 text-navy-ink hover:bg-teal-light hover:text-teal-deep rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep ${
                locating ? 'animate-pulse text-teal-deep' : ''
              }`}
              title="Center on My Location (GPS)"
              aria-label="My location"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Visual Legend Card */}
      <div className="bg-surface border border-app-border rounded-md p-3 max-w-[280px] text-xs space-y-2">
        <div className="font-semibold text-navy-ink text-[11px] uppercase tracking-wider border-b border-app-border pb-1">
          Map Legend
        </div>
        <div className="grid grid-cols-1 gap-1.5 pt-0.5">
          {legendItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {item.type === 'color' && (
                <span
                  className="w-3.5 h-2.5 rounded-sm border border-black/15 shrink-0"
                  style={{ backgroundColor: item.color }}
                ></span>
              )}
              {item.type === 'icon' && (
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-white"
                  style={{ backgroundColor: item.badgeColor }}
                  dangerouslySetInnerHTML={{ __html: item.svg }}
                />
              )}
              {item.type === 'road' && (
                <div className="w-4 h-1 border-b-2 border-dashed border-[#B42318] shrink-0" />
              )}
              {item.type === 'user' && (
                <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 rounded-full bg-teal-deep/25 border border-teal-deep absolute"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-deep"></div>
                </div>
              )}
              <span className="text-[11px] text-navy-ink leading-none">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Legend;
