import React, { useState } from 'react';
import { Plus, Minus, Navigation, RotateCcw, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useLang } from '../../context/LangContext';

export const Legend = ({
  onZoomIn,
  onZoomOut,
  onLocateUser,
  onResetView,
  locating = false,
  className = '',
  compact = false,
}) => {
  const { t } = useLang();

  // Collapsible state: starts collapsed on mobile (<640px), open on desktop (Part A Requirement 5)
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 640;
    }
    return true;
  });

  const legendItems = [
    { label: t('map.highRisk') || 'High Risk (Flooded)', type: 'color', color: '#B42318' },
    { label: t('map.warningZone') || 'Warning Zone', type: 'color', color: '#B54708' },
    { label: t('map.safeZone') || 'Safe Zone', type: 'color', color: '#3B7A57' },
    {
      label: t('map.shelter') || 'Relief Shelter',
      type: 'icon',
      badgeColor: '#3B7A57',
      svg: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
    },
    {
      label: t('map.hospital') || 'Hospital',
      type: 'icon',
      badgeColor: '#B42318',
      svg: `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>`
    },
    {
      label: t('map.blockedRoad') || 'Blocked Road',
      type: 'road',
      color: '#B42318',
    },
    {
      label: t('map.yourLocation') || 'Your Location',
      type: 'user',
    }
  ];

  return (
    <div className={`flex flex-col items-end gap-2 select-none ${className}`}>
      {/* Zoom, Locate & Reset Controls Floating Bar */}
      {(onZoomIn || onZoomOut || onLocateUser || onResetView) && (
        <div className="flex items-center gap-1 bg-surface border border-app-border rounded-md p-1 shadow-sm w-fit">
          {onZoomIn && (
            <button
              type="button"
              onClick={onZoomIn}
              className="p-1.5 text-navy-ink hover:bg-app-bg rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep"
              title={t('map.zoomIn') || 'Zoom In'}
              aria-label={t('map.zoomIn') || 'Zoom In'}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
          {onZoomOut && (
            <button
              type="button"
              onClick={onZoomOut}
              className="p-1.5 text-navy-ink hover:bg-app-bg rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep"
              title={t('map.zoomOut') || 'Zoom Out'}
              aria-label={t('map.zoomOut') || 'Zoom Out'}
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
              title={t('map.centerLocation') || 'Center on My Location (GPS)'}
              aria-label={t('map.centerLocation') || 'Center on My Location (GPS)'}
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
          {onResetView && (
            <button
              type="button"
              onClick={onResetView}
              className="p-1.5 text-navy-ink hover:bg-app-bg rounded transition-colors focus:outline-none focus:ring-1 focus:ring-teal-deep"
              title={t('map.resetView') || 'Reset Map View'}
              aria-label={t('map.resetView') || 'Reset Map View'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Legend Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface border border-app-border rounded-md text-xs font-semibold text-navy-ink shadow-sm hover:bg-app-bg transition-colors"
        aria-expanded={isOpen}
        aria-label={t('map.legend') || 'Toggle Map Legend'}
      >
        <Layers className="w-3.5 h-3.5 text-teal-deep" />
        <span>{t('map.legend') || 'Legend'}</span>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-text" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-text" />}
      </button>

      {/* Collapsible Visual Legend Card with internal scroll */}
      {isOpen && (
        <div className="bg-surface border border-app-border rounded-md p-3 max-w-[280px] w-full text-xs space-y-2 shadow-md animate-in fade-in max-h-60 sm:max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between font-semibold text-navy-ink text-[11px] uppercase tracking-wider border-b border-app-border pb-1">
            <span>{t('map.mapLegend') || 'Map Legend'}</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[10px] text-muted-text hover:text-navy-ink cursor-pointer"
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 pt-0.5">
            {legendItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.type === 'color' && (
                  <span
                    className="w-3.5 h-2.5 rounded-sm border border-black/15 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
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
                    <div className="w-4 h-4 rounded-full bg-teal-deep/25 border border-teal-deep absolute" />
                    <div className="w-2 h-2 rounded-full bg-teal-deep" />
                  </div>
                )}
                <span className="text-[11px] text-navy-ink leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Legend;
