import React, { useState, useEffect } from 'react';
import { useConnection } from '../../context/ConnectionContext';
import { useLang } from '../../context/LangContext';
import { syncAll } from '../../offline/syncService';
import { setLastKnownLocation, getLastSync } from '../../offline/db';
import { formatSyncTime } from '../../offline/freshness';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../ui';
import {
  DownloadCloud,
  CheckCircle2,
  Loader2,
  HardDrive,
  AlertTriangle,
  Info,
  Layers,
  MapPin,
} from 'lucide-react';

const CHECKLIST_ITEMS = [
  { id: 'contacts', labelKey: 'offline.checklistContacts' },
  { id: 'instructions', labelKey: 'offline.checklistInstructions' },
  { id: 'shelters', labelKey: 'offline.checklistShelters' },
  { id: 'hospitals', labelKey: 'offline.checklistHospitals' },
  { id: 'floodZones', labelKey: 'offline.checklistFloodZones' },
  { id: 'safeZones', labelKey: 'offline.checklistSafeZones' },
  { id: 'blockedRoads', labelKey: 'offline.checklistBlockedRoads' },
  { id: 'alerts', labelKey: 'offline.checklistAlerts' },
  { id: 'map', labelKey: 'offline.checklistMap' },
];

export const PrepareOfflineCard = ({ className = '' }) => {
  const { online, lastSyncAt, setLastSyncAt } = useConnection();
  const { t, lang } = useLang();

  const [status, setStatus] = useState('idle'); // 'idle' | 'preparing' | 'ready' | 'error'
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [activeStep, setActiveStep] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [persistedSyncTime, setPersistedSyncTime] = useState(lastSyncAt);

  useEffect(() => {
    getLastSync().then((ts) => {
      if (ts) {
        setPersistedSyncTime(ts);
        setStatus('ready');
      }
    });
  }, []);

  const handlePrepare = async () => {
    setStatus('preparing');
    setErrorMessage('');
    const finished = new Set();
    setCompletedSteps(finished);

    let userLat = 17.3850;
    let userLng = 78.4867;

    // 1. Capture last known location if permitted
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          userLat = pos.coords.latitude;
          userLng = pos.coords.longitude;
          await setLastKnownLocation({
            lat: userLat,
            lng: userLng,
            accuracy: pos.coords.accuracy,
            timestamp: new Date().toISOString(),
          });
        },
        () => {
          // GPS fallback to Hyderabad center
        },
        { timeout: 4000 }
      );
    }

    try {
      const result = await syncAll({
        lat: userLat,
        lng: userLng,
        onProgress: (cat, stepStatus) => {
          setActiveStep(cat);
          if (stepStatus === 'done') {
            finished.add(cat);
            setCompletedSteps(new Set(finished));
          }
        },
      });

      if (result.success) {
        // Mark all checklist steps completed
        CHECKLIST_ITEMS.forEach((item) => finished.add(item.id));
        setCompletedSteps(new Set(finished));
        const now = result.lastSync || new Date().toISOString();
        setPersistedSyncTime(now);
        setLastSyncAt(now);
        setStatus('ready');
      } else {
        setStatus('error');
        setErrorMessage(result.error || t('offline.syncFailed'));
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || t('offline.syncFailed'));
    } finally {
      setActiveStep(null);
    }
  };

  const formattedTime = persistedSyncTime
    ? formatSyncTime(persistedSyncTime, lang)
    : t('offline.neverSynchronized');

  return (
    <Card className={`border-app-border bg-surface ${className}`}>
      <CardHeader className="bg-[#FAF9F6] pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-teal-light text-teal-deep border border-[#c4dcde]">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base text-navy-ink font-semibold">
                {t('offline.prepareTitle')}
              </CardTitle>
              <CardDescription className="text-xs text-muted-text">
                {t('offline.prepareDesc')}
              </CardDescription>
            </div>
          </div>
          {status === 'ready' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EDF6F1] border border-[#C3E4D1] text-[#3B7A57] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('offline.readyBadge')}</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-5 space-y-4">
        {/* Checklist Container */}
        {(status === 'preparing' || status === 'ready') && (
          <div className="bg-app-bg/50 border border-app-border rounded-lg p-3.5 space-y-2">
            <div className="text-[11px] font-semibold text-muted-text uppercase font-mono tracking-wider mb-2">
              {t('offline.emergencyChecklistTitle')}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CHECKLIST_ITEMS.map((item) => {
                const isDone = completedSteps.has(item.id) || status === 'ready';
                const isActive = activeStep === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-navy-ink font-medium"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#3B7A57] shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-teal-deep animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-app-border shrink-0" />
                    )}
                    <span className={isDone ? 'text-navy-ink' : 'text-muted-text'}>
                      {t(item.labelKey)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Readiness Status or Note */}
        {status === 'ready' && (
          <div className="space-y-1.5 text-xs text-muted-text">
            <p className="font-medium text-navy-ink flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#3B7A57]" />
              <span>{t('offline.readyForOffline')}</span>
              <span className="text-muted-text">&mdash;</span>
              <span>{t('offline.lastSynchronized')}: {formattedTime}</span>
            </p>
            <p className="text-[11px] text-muted-text flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-muted-text shrink-0 mt-0.5" />
              <span>{t('offline.mapTilesNote')}</span>
            </p>
          </div>
        )}

        {/* Error message */}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-2.5 rounded bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            variant="teal"
            size="sm"
            onClick={handlePrepare}
            disabled={status === 'preparing' || !online}
            className="flex items-center gap-2"
          >
            {status === 'preparing' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('offline.preparing')}</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>
                  {status === 'ready' ? t('offline.updateButton') : t('offline.prepareButton')}
                </span>
              </>
            )}
          </Button>

          {!online && (
            <span className="text-xs text-[#B54708] font-medium">
              {t('offline.connectToSync')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
