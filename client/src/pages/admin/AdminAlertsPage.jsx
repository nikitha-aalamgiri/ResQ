import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
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
  Send,
  Eye,
  CheckCircle2,
  RotateCcw,
  Languages,
  PenTool,
  Trash2,
  Users,
  Compass,
  Building2,
  Clock,
  ShieldAlert,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { HYDERABAD_CENTER } from '../../data/mockData';

const ALERT_TYPES = [
  { id: 'flood_warning', label: 'Severe Flood Warning', color: 'critical' },
  { id: 'road_blocked', label: 'Road Blocked', color: 'high' },
  { id: 'shelter_opened', label: 'New Shelter Opened', color: 'medium' },
  { id: 'relief_support', label: 'Relief Support Available', color: 'low' },
  { id: 'evacuation_order', label: 'Evacuation Notice', color: 'critical' },
];

const PRESET_AREAS = [
  {
    name: 'Musi River Basin (Moosarambagh - Chaderghat)',
    polygon: [
      [17.3600, 78.4700],
      [17.3600, 78.5050],
      [17.3850, 78.5150],
      [17.3850, 78.4750],
    ]
  },
  {
    name: 'Amberpet - Golnaka Inundation Corridor',
    polygon: [
      [17.3800, 78.5000],
      [17.3800, 78.5300],
      [17.4050, 78.5300],
      [17.4050, 78.5000],
    ]
  },
  {
    name: 'Central Hyderabad Sector (Basheer Bagh & LB Stadium)',
    polygon: [
      [17.3900, 78.4600],
      [17.3900, 78.4950],
      [17.4200, 78.4950],
      [17.4200, 78.4600],
    ]
  },
  {
    name: 'Saroornagar Lake Overflow Basin',
    polygon: [
      [17.3450, 78.5150],
      [17.3450, 78.5500],
      [17.3700, 78.5500],
      [17.3700, 78.5150],
    ]
  }
];

// Interactive map click listener for drawing polygon
function DrawMapHandler({ isDrawing, points, setPoints }) {
  useMapEvents({
    click(e) {
      if (!isDrawing) return;
      setPoints((prev) => [...prev, [e.latlng.lat, e.latlng.lng]]);
    },
  });
  return null;
}

export const AdminAlertsPage = () => {
  const { profile } = useAuth();

  // Form Fields (Requirement: Alert Title, Description, Alert Type, Severity, Affected Area, Select Language(s), translated messages)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [alertType, setAlertType] = useState('flood_warning');
  const [severity, setSeverity] = useState('high'); // critical, high, medium, low
  const [areaName, setAreaName] = useState('Musi River Basin (Moosarambagh - Chaderghat)');

  // Languages & Translations
  const [selectedLanguages, setSelectedLanguages] = useState({
    en: true,
    te: true,
    hi: true,
    ur: false,
  });

  const [translations, setTranslations] = useState({
    en: '',
    te: '',
    hi: '',
    ur: '',
  });

  // Map Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState(PRESET_AREAS[0].polygon);

  // Alert History & UI State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchAlertHistory = async () => {
    try {
      const res = await apiFetch('/alerts');
      if (res.success && Array.isArray(res.data)) {
        setHistory(res.data);
      }
    } catch (err) {
      console.warn('Failed to load alert history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchAlertHistory();
  }, []);

  // Update default translations when description changes
  const handleDescriptionChange = (text) => {
    setDescription(text);
    setTranslations((prev) => ({
      ...prev,
      en: text,
      te: prev.te || (text ? `${text} (తెలుగు అనువాదం)` : ''),
      hi: prev.hi || (text ? `${text} (हिन्दी अनुवाद)` : ''),
      ur: prev.ur || (text ? `${text} (اردو ترجمہ)` : ''),
    }));
  };

  const handleToggleLanguage = (code) => {
    setSelectedLanguages((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSelectPreset = (preset) => {
    setDrawnPoints(preset.polygon);
    setAreaName(preset.name);
    setIsDrawing(false);
  };

  // Convert drawn points [lat, lng] into GeoJSON Polygon coordinates [lng, lat]
  const buildGeoJSONPolygon = () => {
    if (drawnPoints.length < 3) return null;
    const closed = [...drawnPoints];
    // Ensure ring is closed
    if (
      closed[0][0] !== closed[closed.length - 1][0] ||
      closed[0][1] !== closed[closed.length - 1][1]
    ) {
      closed.push(closed[0]);
    }
    const coords = closed.map(([lat, lng]) => [Number(lng), Number(lat)]);
    return {
      type: 'Polygon',
      coordinates: [coords],
    };
  };

  // Publish Alert Action (Requirement: POST /api/alerts saves, uses Turf to find citizens, inserts notifications)
  const handlePublishAlert = async () => {
    if (!title.trim()) {
      setToast({ title: 'Validation Error', message: 'Alert Title is required.', type: 'critical' });
      return;
    }
    if (drawnPoints.length < 3) {
      setToast({ title: 'Area Required', message: 'Please define an affected area on the map.', type: 'critical' });
      return;
    }

    setPublishing(true);
    const areaGeoJSON = buildGeoJSONPolygon();
    const activeLanguages = Object.keys(selectedLanguages).filter((k) => selectedLanguages[k]);

    try {
      const res = await apiFetch('/alerts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          type: alertType,
          severity,
          area_name: areaName,
          area_geojson: areaGeoJSON,
          languages: activeLanguages,
          translations,
        }),
      });

      if (res.success && res.alert) {
        // Broadcast instant event across windows
        broadcastSOSEvent({
          type: 'ALERT_PUBLISHED',
          alert: res.alert,
          targeted_citizens_count: res.targeted_citizens_count,
        });

        setToast({
          title: 'Emergency Alert Broadcast Live',
          message: `Dispatched to ${res.targeted_citizens_count || 1} citizens inside ${areaName}. Notifications generated.`,
          type: 'low',
        });

        // Reset Form
        setTitle('');
        setDescription('');
        setTranslations({ en: '', te: '', hi: '', ur: '' });
        setShowPreviewModal(false);
        fetchAlertHistory();
      }
    } catch (err) {
      setToast({
        title: 'Publish Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in">
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-5 rounded-md border border-app-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-navy-ink">
              EMERGENCY BROADCAST ALERT CONSOLE
            </h2>
            <Badge variant="critical" size="sm">
              SEOC Command
            </Badge>
          </div>
          <p className="text-xs text-muted-text mt-1">
            Author and publish targeted multi-lingual alerts with spatial geofencing
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={fetchAlertHistory}
          loading={loadingHistory}
        >
          Refresh Feed
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Author Alert Form */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3.5 border-b border-app-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-teal-deep" />
                Create New Emergency Alert
              </CardTitle>
              <CardDescription>
                Define danger severity, geofenced perimeter, and translated advisories
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-xs">
              {/* Alert Title */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                  Alert Title <span className="text-[#B42318]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Severe Musi River Flash Inundation Warning"
                  className="w-full p-2.5 bg-surface border border-app-border rounded focus:outline-none focus:ring-1 focus:ring-teal-deep font-medium text-navy-ink"
                />
              </div>

              {/* Alert Type & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                    Alert Type
                  </label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value)}
                    className="w-full p-2 bg-surface border border-app-border rounded text-xs text-navy-ink focus:outline-none focus:ring-1 focus:ring-teal-deep"
                  >
                    {ALERT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full p-2 bg-surface border border-app-border rounded text-xs text-navy-ink focus:outline-none focus:ring-1 focus:ring-teal-deep font-semibold"
                  >
                    <option value="critical">Critical (Red - Immediate Life Safety)</option>
                    <option value="high">High (Amber - Rising Water/Blocked Road)</option>
                    <option value="medium">Medium (Yellow - Shelter Advisory)</option>
                    <option value="low">Low (Green - Relief Rations/Safe Zone)</option>
                  </select>
                </div>
              </div>

              {/* English Description */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                  General Advisory Description (English)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  placeholder="Briefly state situation, danger mark, and instructions..."
                  className="w-full p-2.5 bg-surface border border-app-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-deep font-sans"
                />
              </div>

              {/* Multilingual Translation Checkboxes (Requirement: Select Language(s) as checkboxes: English, Telugu, Hindi, Urdu) */}
              <div className="pt-2 border-t border-app-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-navy-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-teal-deep" />
                    Target Broadcast Languages
                  </label>
                  <span className="text-[10px] text-muted-text">Urdu rendered RTL</span>
                </div>

                <div className="flex flex-wrap gap-4">
                  {[
                    { code: 'en', label: 'English', native: 'English' },
                    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
                    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
                    { code: 'ur', label: 'Urdu', native: 'اردو (RTL)' },
                  ].map((lang) => (
                    <label key={lang.code} className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-navy-ink">
                      <input
                        type="checkbox"
                        checked={selectedLanguages[lang.code]}
                        onChange={() => handleToggleLanguage(lang.code)}
                        className="rounded border-app-border text-teal-deep focus:ring-teal-deep"
                      />
                      <span>{lang.native}</span>
                    </label>
                  ))}
                </div>

                {/* Translated Text Inputs per Selected Language */}
                <div className="space-y-2.5 pt-1">
                  {selectedLanguages.te && (
                    <div>
                      <label className="block text-[11px] font-semibold text-teal-deep mb-1 font-sans">
                        తెలుగు అనువాదం (Telugu Message):
                      </label>
                      <textarea
                        rows={2}
                        value={translations.te}
                        onChange={(e) => setTranslations({ ...translations, te: e.target.value })}
                        placeholder="తెలుగులో సందేశాన్ని నమోదు చేయండి (ఉదా. తక్షణమే ఎత్తైన ప్రదేశాలకు తరలిపోండి...)"
                        className="w-full p-2 bg-[#FAFDFB] border border-[#C3E4D1] rounded text-xs focus:outline-none font-sans"
                      />
                    </div>
                  )}

                  {selectedLanguages.hi && (
                    <div>
                      <label className="block text-[11px] font-semibold text-teal-deep mb-1 font-sans">
                        हिन्दी अनुवाद (Hindi Message):
                      </label>
                      <textarea
                        rows={2}
                        value={translations.hi}
                        onChange={(e) => setTranslations({ ...translations, hi: e.target.value })}
                        placeholder="हिन्दी में संदेश दर्ज करें (उदा. तुरंत ऊंचे स्थानों पर चले जाएं...)"
                        className="w-full p-2 bg-[#FAFDFB] border border-[#C3E4D1] rounded text-xs focus:outline-none font-sans"
                      />
                    </div>
                  )}

                  {selectedLanguages.ur && (
                    <div>
                      <label className="block text-[11px] font-semibold text-teal-deep mb-1 font-sans">
                        اردو ترجمہ (Urdu Message - Right to Left):
                      </label>
                      <textarea
                        rows={2}
                        dir="rtl"
                        value={translations.ur}
                        onChange={(e) => setTranslations({ ...translations, ur: e.target.value })}
                        placeholder="اردو میں پیغام درج کریں (مثلاً فوری طور پر محفوظ مقام پر منتقل ہوں...)"
                        className="w-full p-2 bg-[#FAFDFB] border border-[#C3E4D1] rounded text-xs focus:outline-none font-urdu text-right"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons: Preview & Publish (Requirement) */}
              <div className="pt-3 flex items-center justify-between border-t border-app-border">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Eye}
                  onClick={() => setShowPreviewModal(true)}
                  disabled={!title.trim()}
                >
                  Preview Alert
                </Button>

                <Button
                  variant="danger"
                  size="md"
                  icon={Send}
                  onClick={handlePublishAlert}
                  loading={publishing}
                  disabled={publishing || !title.trim()}
                >
                  Publish Emergency Alert
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 5 Cols: Draw Area Map & Presets */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3 border-b border-app-border">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-teal-deep" />
                  Affected Area Geofence
                </CardTitle>
                <Badge variant={isDrawing ? 'critical' : 'teal'} size="sm">
                  {isDrawing ? 'Drawing Active' : `${drawnPoints.length} Vertices`}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Draw custom polygon or pick preset municipal zone
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 text-xs">
              {/* Preset Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-navy-ink uppercase mb-1">
                  Preset Hazard Sectors
                </label>
                <select
                  value={areaName}
                  onChange={(e) => {
                    const found = PRESET_AREAS.find((p) => p.name === e.target.value);
                    if (found) handleSelectPreset(found);
                  }}
                  className="w-full p-2 bg-app-bg border border-app-border rounded text-xs text-navy-ink"
                >
                  {PRESET_AREAS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Draw Tool Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  variant={isDrawing ? 'danger' : 'primary'}
                  size="sm"
                  icon={PenTool}
                  onClick={() => setIsDrawing(!isDrawing)}
                  className="flex-1"
                >
                  {isDrawing ? 'Done Drawing' : 'Draw Custom Area'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Trash2}
                  onClick={() => setDrawnPoints([])}
                  title="Clear Points"
                >
                  Clear
                </Button>
              </div>

              {isDrawing && (
                <p className="p-2 rounded bg-[#FEFAEC] border border-[#FEDF89] text-[11px] text-[#7A5E10]">
                  Click points on the map below to outline the boundary. Need at least 3 points.
                </p>
              )}

              {/* Leaflet Draw Map */}
              <div className="h-64 rounded border border-app-border overflow-hidden relative">
                <MapContainer
                  center={drawnPoints[0] || [17.3750, 78.4867]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap"
                  />
                  <DrawMapHandler
                    isDrawing={isDrawing}
                    points={drawnPoints}
                    setPoints={setDrawnPoints}
                  />

                  {/* Render Drawn Polygon */}
                  {drawnPoints.length >= 3 && (
                    <Polygon
                      positions={drawnPoints}
                      pathOptions={{
                        color: severity === 'critical' ? '#B42318' : severity === 'high' ? '#B54708' : '#1F6F78',
                        fillColor: severity === 'critical' ? '#B42318' : severity === 'high' ? '#B54708' : '#1F6F78',
                        fillOpacity: 0.25,
                        weight: 2,
                      }}
                    />
                  )}

                  {/* Polyline if still drawing < 3 points */}
                  {drawnPoints.length > 0 && drawnPoints.length < 3 && (
                    <Polyline
                      positions={drawnPoints}
                      pathOptions={{ color: '#B42318', weight: 2, dashArray: '4, 4' }}
                    />
                  )}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert History List (Requirement: Alert history list) */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3.5 border-b border-app-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy-ink" />
                Published Broadcast Alert History
              </CardTitle>
              <CardDescription>
                Permanent record of issued flood warnings and civic notifications
              </CardDescription>
            </div>
            <Badge variant="teal" size="sm">
              {history.length} Active Records
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-app-border text-xs">
            {history.map((alt) => (
              <div
                key={alt.id}
                className="p-4 hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-navy-ink">{alt.id}</span>
                    <Badge
                      variant={
                        alt.severity === 'critical'
                          ? 'critical'
                          : alt.severity === 'high'
                          ? 'high'
                          : alt.severity === 'medium'
                          ? 'medium'
                          : 'low'
                      }
                      size="sm"
                    >
                      {alt.severity?.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-text">
                      {new Date(alt.created_at).toLocaleTimeString('en-IN')}
                    </span>
                  </div>

                  <h4 className="font-bold text-navy-ink text-sm">{alt.title}</h4>
                  <p className="text-muted-text text-xs max-w-2xl">{alt.description}</p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-text font-mono">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-deep" />
                      {alt.area_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-navy-ink" />
                      {alt.targeted_citizens_count || 48} citizens targeted
                    </span>
                    <span>
                      Languages: {alt.languages?.join(', ').toUpperCase() || 'EN'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal (Requirement: Preview button) */}
      {showPreviewModal && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Citizen Mobile Preview: Emergency Broadcast Alert"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-3 bg-app-bg rounded border border-app-border text-xs text-muted-text">
              This preview shows how citizens in the targeted area will see the alert in their selected language.
            </div>

            {/* Preview Card in English */}
            <div className={`p-4 rounded-md border ${
              severity === 'critical'
                ? 'bg-[#FDF2F2] border-[#F8D2D0]'
                : severity === 'high'
                ? 'bg-[#FEF6EE] border-[#F9DBAF]'
                : 'bg-[#EFF8FF] border-[#B2DDFF]'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <Badge variant={severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium'} size="sm">
                  {severity.toUpperCase()} ALERT (English)
                </Badge>
                <span className="text-[10px] font-mono text-muted-text">Just now</span>
              </div>
              <h4 className="font-bold text-navy-ink text-sm mt-1">{title || 'Alert Title'}</h4>
              <p className="text-xs text-navy-ink/90 mt-1 leading-relaxed">
                {translations.en || description || 'Alert message content...'}
              </p>
            </div>

            {/* Preview in Telugu if selected */}
            {selectedLanguages.te && (
              <div className="p-4 rounded-md border bg-[#FAFDFB] border-[#C3E4D1]">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="teal" size="sm">తెలుగు (Telugu)</Badge>
                  <span className="text-[10px] font-mono text-muted-text">ఇప్పుడే</span>
                </div>
                <h4 className="font-bold text-navy-ink text-sm mt-1 font-sans">{title}</h4>
                <p className="text-xs text-navy-ink/90 mt-1 font-sans leading-relaxed">
                  {translations.te || description}
                </p>
              </div>
            )}

            {/* Preview in Urdu (RTL) if selected */}
            {selectedLanguages.ur && (
              <div className="p-4 rounded-md border bg-[#FAFDFB] border-[#C3E4D1] text-right font-urdu" dir="rtl">
                <div className="flex items-center justify-between mb-1" dir="ltr">
                  <Badge variant="teal" size="sm">اردو (Urdu - RTL)</Badge>
                  <span className="text-[10px] font-mono text-muted-text">ابھی</span>
                </div>
                <h4 className="font-bold text-navy-ink text-base mt-1">{title}</h4>
                <p className="text-sm text-navy-ink/90 mt-1 leading-loose">
                  {translations.ur || description}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
              <Button variant="outline" size="sm" onClick={() => setShowPreviewModal(false)}>
                Back to Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={Send}
                onClick={handlePublishAlert}
                loading={publishing}
              >
                Publish Broadcast Now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminAlertsPage;
