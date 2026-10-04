import React, { useState, useEffect } from 'react';
import { db, getLastSync } from '../../offline/db';
import { getFreshness, formatSyncTime } from '../../offline/freshness';
import { useLang } from '../../context/LangContext';
import { useConnection } from '../../context/ConnectionContext';
import { PrepareOfflineCard } from '../../components/offline/PrepareOfflineCard';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from '../../components/ui';
import {
  Database,
  Building2,
  PlusCircle,
  AlertTriangle,
  Shield,
  Compass,
  Phone,
  BookOpen,
  RefreshCw,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';

export const OfflineDataPage = () => {
  const { t, lang } = useLang();
  const { online, lastSyncAt } = useConnection();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = [
        {
          id: 'shelters',
          name: t('offline.categories.shelters'),
          icon: Building2,
          count: await db.shelters.count(),
          updatedAt: await getLastSync('shelters'),
        },
        {
          id: 'hospitals',
          name: t('offline.categories.hospitals'),
          icon: PlusCircle,
          count: await db.hospitals.count(),
          updatedAt: await getLastSync('hospitals'),
        },
        {
          id: 'floodZones',
          name: t('offline.categories.floodZones'),
          icon: Compass,
          count: await db.floodZones.count(),
          updatedAt: await getLastSync('floodZones'),
        },
        {
          id: 'safeZones',
          name: t('offline.categories.safeZones'),
          icon: Shield,
          count: await db.safeZones.count(),
          updatedAt: await getLastSync('safeZones'),
        },
        {
          id: 'blockedRoads',
          name: t('offline.categories.blockedRoads'),
          icon: AlertTriangle,
          count: await db.blockedRoads.count(),
          updatedAt: await getLastSync('blockedRoads'),
        },
        {
          id: 'alerts',
          name: t('offline.categories.alerts'),
          icon: AlertTriangle,
          count: await db.alerts.count(),
          updatedAt: await getLastSync('alerts'),
        },
        {
          id: 'contacts',
          name: t('offline.categories.contacts'),
          icon: Phone,
          count: await db.contacts.count(),
          updatedAt: await getLastSync('contacts'),
        },
        {
          id: 'instructions',
          name: t('offline.categories.instructions'),
          icon: BookOpen,
          count: await db.instructions.count(),
          updatedAt: await getLastSync('instructions'),
        },
      ];

      setCategories(items);
    } catch (err) {
      console.warn('[OfflineDataPage] Error loading category counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lastSyncAt]);

  const renderFreshnessChip = (category, updatedAt) => {
    const freshness = getFreshness(category, updatedAt);

    if (category === 'contacts' || category === 'instructions') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDF6F1] text-[#3B7A57] border border-[#C3E4D1]">
          {t('offline.alwaysFresh')}
        </span>
      );
    }

    if (freshness.level === 'fresh') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EDF6F1] text-[#3B7A57] border border-[#C3E4D1]">
          {t('offline.fresh')}
        </span>
      );
    }

    if (freshness.level === 'stale') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#F9DBAF]">
          {t('offline.stale')}
        </span>
      );
    }

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
        {t('offline.veryStale')}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-navy-ink font-sans">
            {t('offline.offlineDataTitle')}
          </h1>
          <p className="text-xs md:text-sm text-muted-text mt-0.5">
            {t('offline.offlineDataSubtitle')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('offline.refreshStats')}</span>
        </Button>
      </div>

      {/* Prepare for Offline Card */}
      <PrepareOfflineCard />

      {/* Per-Category Inspection Table */}
      <Card className="border-app-border bg-surface">
        <CardHeader className="bg-[#FAF9F6] pb-3">
          <CardTitle className="text-sm md:text-base font-semibold text-navy-ink flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-deep" />
            <span>{t('offline.datasetsTableTitle')}</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-text">
            {t('offline.datasetsTableDesc')}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-app-border">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const formattedTime = cat.updatedAt
                ? formatSyncTime(cat.updatedAt, lang)
                : t('offline.neverSynchronized');

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3.5 md:p-4 hover:bg-app-bg/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-surface border border-app-border text-teal-deep shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-navy-ink">
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-muted-text">
                        {t('offline.lastUpdated')}: {formattedTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-medium text-navy-ink bg-app-bg px-2.5 py-1 rounded border border-app-border">
                      {cat.count} {t('offline.items')}
                    </span>
                    {renderFreshnessChip(cat.id, cat.updatedAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
