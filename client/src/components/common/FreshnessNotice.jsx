import React from 'react';
import { getFreshness, formatSyncTime } from '../../offline/freshness';
import { useLang } from '../../context/LangContext';
import { AlertTriangle, Clock } from 'lucide-react';

/**
 * FreshnessNotice: Displays data freshness timestamp and warning badges.
 * Enforces zero-compromise accuracy: never presents cached records as live or real-time.
 * 
 * @param {Object} props
 * @param {string} props.category - dataset key ('shelters', 'alerts', etc.)
 * @param {string|Date|number} props.updatedAt - timestamp
 * @param {string} [props.className='']
 */
export const FreshnessNotice = ({ category, updatedAt, className = '' }) => {
  const { t, lang } = useLang();
  const freshness = getFreshness(category, updatedAt);
  const formattedTime = formatSyncTime(updatedAt, lang) || t('offline.neverSynchronized');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Timestamp indicator */}
      <div className="flex items-center gap-1.5 text-xs text-muted-text">
        <Clock className="w-3.5 h-3.5 shrink-0 text-muted-text" />
        <span>
          {t('offline.lastUpdated')}: <strong className="font-semibold text-navy-ink">{formattedTime}</strong>
        </span>
      </div>

      {/* Staleness Warning Banner */}
      {(freshness.level === 'stale' || freshness.level === 'very_stale') && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold ${
            freshness.level === 'very_stale'
              ? 'bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318]'
              : 'bg-[#FEF6EE] border border-[#F9DBAF] text-[#B54708]'
          }`}
          role="status"
        >
          <AlertTriangle
            className={`w-4 h-4 shrink-0 ${
              freshness.level === 'very_stale' ? 'text-[#B42318]' : 'text-[#B54708]'
            }`}
          />
          <span>{t('offline.informationMayBeOutdated')}</span>
        </div>
      )}
    </div>
  );
};
