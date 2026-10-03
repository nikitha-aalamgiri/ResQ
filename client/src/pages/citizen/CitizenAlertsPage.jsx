import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLang } from '../../context/LangContext';
import { apiFetch } from '../../lib/api';
import { onSOSEvent } from '../../lib/broadcast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Modal,
  Toast
} from '../../components/ui';
import {
  Bell,
  AlertTriangle,
  MapPin,
  ChevronRight,
  Shield,
  Clock,
  Compass,
  Building2,
  Phone,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export const CitizenAlertsPage = () => {
  const { user } = useAuth();
  const { lang, t } = useLang();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [selectedAlertForModal, setSelectedAlertForModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [unreadIds, setUnreadIds] = useState(new Set(['ALT-101', 'ALT-102']));

  // Fetch alerts with citizen coordinates
  const fetchAlerts = async () => {
    try {
      const res = await apiFetch('/alerts?lat=17.3750&lng=78.4867');
      if (res.success && Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn('Failed to load alerts feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Realtime Listener for published alerts (Requirement: Realtime toast when an alert arrives for citizen's area)
    const unsubscribe = onSOSEvent((event) => {
      if (event.type === 'ALERT_PUBLISHED' && event.alert) {
        setAlerts((prev) => [event.alert, ...prev]);
        setUnreadIds((prev) => new Set([event.alert.id, ...prev]));

        setToast({
          title: `EMERGENCY ALERT: ${event.alert.title}`,
          message: event.alert.translations?.[lang] || event.alert.description || 'Emergency alert issued for your area.',
          type: event.alert.severity === 'critical' ? 'critical' : 'high',
        });
      }
    });

    const interval = setInterval(fetchAlerts, 8000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [lang]);

  // Tab Filtering (Requirement: tabs All, Flood Alerts, Shelters, Roads, Resources)
  const filteredAlerts = useMemo(() => {
    return alerts.filter((item) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Flood Alerts') {
        return item.type === 'flood_warning' || item.type === 'evacuation_order';
      }
      if (activeTab === 'Shelters') {
        return item.type === 'shelter_opened';
      }
      if (activeTab === 'Roads') {
        return item.type === 'road_blocked';
      }
      if (activeTab === 'Resources') {
        return item.type === 'relief_support';
      }
      return true;
    });
  }, [alerts, activeTab]);

  const handleOpenAlert = (alert) => {
    setSelectedAlertForModal(alert);
    // Mark as read
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(alert.id);
      return next;
    });
  };

  // Color-coded styling per Mockup Specification (Requirement 2)
  const getCardStyles = (type, severity) => {
    if (type === 'flood_warning' || type === 'evacuation_order' || severity === 'critical') {
      return {
        cardBg: 'bg-[#FDF2F2]',
        border: 'border-[#F8D2D0]',
        badge: 'critical',
        textColor: 'text-[#B42318]',
        typeLabel: t('severeWarning'),
      };
    }
    if (type === 'road_blocked' || severity === 'high') {
      return {
        cardBg: 'bg-[#FEF6EE]',
        border: 'border-[#F9DBAF]',
        badge: 'high',
        textColor: 'text-[#B54708]',
        typeLabel: t('roadBlocked'),
      };
    }
    if (type === 'shelter_opened' || severity === 'medium') {
      return {
        cardBg: 'bg-[#EFF8FF]',
        border: 'border-[#B2DDFF]',
        badge: 'low',
        textColor: 'text-[#175CD3]',
        typeLabel: t('newShelter'),
      };
    }
    return {
      cardBg: 'bg-[#EDF6F1]',
      border: 'border-[#C3E4D1]',
      badge: 'low',
      textColor: 'text-[#3B7A57]',
      typeLabel: t('reliefSupport'),
    };
  };

  // Localized alert text helper
  const getLocalizedMessage = (alert) => {
    if (!alert) return '';
    if (alert.translations && alert.translations[lang]) {
      return alert.translations[lang];
    }
    return alert.translations?.en || alert.description || alert.title;
  };

  // Relative time helper
  const formatTime = (isoString) => {
    if (!isoString) return '5m ago';
    const diffMins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in max-w-md">
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Header */}
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-navy-ink">
              {t('alertsTitle')}
            </h2>
            {unreadIds.size > 0 && (
              <span className="bg-[#B42318] text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadIds.size} New
              </span>
            )}
          </div>
          <p className="text-xs text-muted-text mt-1">
            {t('alertsSubtitle')}
          </p>
        </div>

        <Link to="/citizen/contacts">
          <Button variant="outline" size="sm" icon={Phone}>
            {t('contactsTab')}
          </Button>
        </Link>
      </div>

      {/* Tabs Filter (Requirement: All, Flood Alerts, Shelters, Roads, Resources) */}
      <div className="flex items-center gap-1.5 border-b border-app-border overflow-x-auto pb-1">
        {[
          { id: 'All', label: t('all') },
          { id: 'Flood Alerts', label: t('floodAlerts') },
          { id: 'Shelters', label: t('shelters') },
          { id: 'Roads', label: t('roads') },
          { id: 'Resources', label: t('resources') },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
                  : 'border-transparent text-muted-text hover:text-navy-ink hover:bg-surface/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Alert Cards List (Requirement: Color-coded cards matching mockup, title, time, short message, chevron) */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-app-border rounded-md text-xs text-muted-text font-mono">
            <CheckCircle2 className="w-8 h-8 text-[#3B7A57] mx-auto mb-2" />
            No active advisories in this category. System monitoring regular drainage.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const styles = getCardStyles(alert.type, alert.severity);
            const isUnread = unreadIds.has(alert.id);
            const shortMessage = getLocalizedMessage(alert);

            return (
              <div
                key={alert.id}
                onClick={() => handleOpenAlert(alert)}
                className={`p-4 rounded-md border transition-all cursor-pointer hover:shadow-xs ${styles.cardBg} ${styles.border} flex items-start justify-between gap-3 group`}
              >
                <div className="space-y-1.5 flex-1">
                  {/* Top Badges */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        styles.badge === 'critical'
                          ? 'bg-[#B42318] text-white'
                          : styles.badge === 'high'
                          ? 'bg-[#B54708] text-white'
                          : 'bg-[#175CD3] text-white'
                      }`}
                    >
                      {styles.typeLabel}
                    </span>
                    <span className="text-[11px] font-mono text-muted-text">
                      {formatTime(alert.created_at)}
                    </span>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#B42318]" title="Unread alert" />
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-navy-ink group-hover:text-teal-deep transition-colors">
                    {alert.title}
                  </h3>

                  {/* Short Message (Localized) */}
                  <p className="text-xs text-navy-ink/90 leading-relaxed font-sans line-clamp-2">
                    {shortMessage}
                  </p>

                  {/* Area Tag */}
                  <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-muted-text">
                    <MapPin className="w-3.5 h-3.5 text-teal-deep" />
                    <span>{alert.area_name || 'Hyderabad Sector'}</span>
                  </div>
                </div>

                {/* Chevron that opens the full alert (Requirement) */}
                <button
                  type="button"
                  className="p-1.5 rounded-full bg-white/60 hover:bg-white text-navy-ink shrink-0 group-hover:translate-x-0.5 transition-all mt-1"
                  aria-label="Open alert details"
                >
                  <ChevronRight className="w-5 h-5 text-muted-text group-hover:text-teal-deep" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Full Alert Details Modal (Requirement: chevron opens the full alert) */}
      {selectedAlertForModal && (
        <Modal
          isOpen={Boolean(selectedAlertForModal)}
          onClose={() => setSelectedAlertForModal(null)}
          title={selectedAlertForModal.title}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header Telemetry */}
            <div className="flex items-center justify-between p-3 rounded bg-app-bg border border-app-border text-xs">
              <div>
                <span className="text-[10px] font-mono text-muted-text uppercase">Severity Level</span>
                <p className="font-bold text-navy-ink uppercase">{selectedAlertForModal.severity}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-muted-text uppercase">Published Time</span>
                <p className="font-mono text-navy-ink">{new Date(selectedAlertForModal.created_at).toLocaleTimeString('en-IN')}</p>
              </div>
            </div>

            {/* Localized Full Message */}
            <div className="p-3.5 rounded bg-surface border border-app-border space-y-2">
              <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider block">
                Official Emergency Advisory
              </span>
              <p className="text-xs text-navy-ink leading-relaxed font-sans">
                {getLocalizedMessage(selectedAlertForModal)}
              </p>
            </div>

            {/* Urdu Translation if available and user wants to see it */}
            {selectedAlertForModal.translations?.ur && (
              <div className="p-3.5 rounded bg-[#FAFDFB] border border-[#C3E4D1] text-right font-urdu" dir="rtl">
                <span className="text-xs font-bold text-teal-deep block mb-1">
                  اردو ہدایت نامہ (Urdu Advisory):
                </span>
                <p className="text-xs text-navy-ink leading-loose font-urdu">
                  {selectedAlertForModal.translations.ur}
                </p>
              </div>
            )}

            {/* Interactive Area Map */}
            {selectedAlertForModal.area_geojson?.coordinates && (
              <div>
                <span className="text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5 block">
                  Geofenced Hazard Boundary ({selectedAlertForModal.area_name})
                </span>
                <div className="h-56 rounded border border-app-border overflow-hidden">
                  <MapContainer
                    center={[17.3750, 78.4867]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution="&copy; OpenStreetMap"
                    />
                    <Polygon
                      positions={selectedAlertForModal.area_geojson.coordinates[0].map(([lng, lat]) => [lat, lng])}
                      pathOptions={{
                        color: selectedAlertForModal.severity === 'critical' ? '#B42318' : '#B54708',
                        fillColor: selectedAlertForModal.severity === 'critical' ? '#B42318' : '#B54708',
                        fillOpacity: 0.25,
                        weight: 2,
                      }}
                    />
                  </MapContainer>
                </div>
              </div>
            )}

            {/* Contextual Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-app-border">
              <Link to="/citizen/shelters" className="flex-1">
                <Button variant="primary" size="sm" icon={Building2} className="w-full">
                  Find Safe Relief Shelter
                </Button>
              </Link>
              <Link to="/citizen/route" className="flex-1">
                <Button variant="outline" size="sm" icon={Compass} className="w-full">
                  Evacuation Route
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CitizenAlertsPage;
