import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input, Toast } from '../../components/ui';
import {
  AlertTriangle,
  LifeBuoy,
  HeartPulse,
  Droplets,
  Building2,
  UserX,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Camera,
  X,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Radio
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createSOSIcon } from '../../components/map/mapIcons';

// Leaflet Draggable Pin Controller
function LocationPickerMarker({ position, onPositionChange }) {
  const markerRef = useRef(null);

  useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
    },
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        onPositionChange([lat, lng]);
      }
    },
  };

  const customIcon = createSOSIcon('critical');

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

// 6 Emergency Types per Mockup
const EMERGENCY_TYPES = [
  {
    id: 'trapped',
    title: "I'm trapped",
    desc: 'Surrounded by rising water / on terrace or roof',
    icon: AlertTriangle,
    priorityHint: 'Critical Priority',
  },
  {
    id: 'evacuation',
    title: 'Need evacuation',
    desc: 'Safe for now, but water is breaching property',
    icon: LifeBuoy,
    priorityHint: 'High Priority',
  },
  {
    id: 'medical',
    title: 'Medical help',
    desc: 'Injury, chronic illness, infant, or dialysis needed',
    icon: HeartPulse,
    priorityHint: 'Critical / High',
  },
  {
    id: 'food_water',
    title: 'Food / Water',
    desc: 'Stranded without drinking water or dry rations',
    icon: Droplets,
    priorityHint: 'Medium Priority',
  },
  {
    id: 'shelter',
    title: 'Need shelter',
    desc: 'House uninhabitable, require transport to camp',
    icon: Building2,
    priorityHint: 'Medium Priority',
  },
  {
    id: 'missing',
    title: 'Missing person',
    desc: 'Separated family member or neighbor unaccounted for',
    icon: UserX,
    priorityHint: 'High Priority',
  },
];

export const SendSOSPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // 3-Step Stepper: 1: Type, 2: Details, 3: Confirm
  const [step, setStep] = useState(1);

  // Form State
  const [selectedType, setSelectedType] = useState('trapped');
  const [peopleCount, setPeopleCount] = useState(1);
  const [anyoneInjured, setAnyoneInjured] = useState(false);
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [landmark, setLandmark] = useState('');
  const [address, setAddress] = useState('Chaderghat Musi River Corridor');

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const fileInputRef = useRef(null);

  // Location State (Default to Hyderabad center)
  const [location, setLocation] = useState([17.3750, 78.4867]);
  const [locationName, setLocationName] = useState('Chaderghat, Musi River Basin');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Submission State (Double-submit protection)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Get GPS Location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setLocation(coords);
          setGpsLoading(false);
          // Query Risk API to auto-fill zone name
          fetchRisk(coords[0], coords[1]);
        },
        (err) => {
          setGpsLoading(false);
          setGpsError('GPS permission denied. Please adjust pin manually on map.');
          fetchRisk(17.3750, 78.4867);
        },
        { timeout: 6000 }
      );
    } else {
      fetchRisk(17.3750, 78.4867);
    }
  }, []);

  const fetchRisk = async (lat, lng) => {
    try {
      const data = await apiFetch(`/risk?lat=${lat}&lng=${lng}`);
      if (data?.zone_name) {
        setLocationName(data.zone_name);
        setAddress(data.zone_name);
      }
    } catch (err) {
      // Fallback
    }
  };

  const handlePositionChange = (newCoords) => {
    setLocation(newCoords);
    fetchRisk(newCoords[0], newCoords[1]);
  };

  // Photo File Handling
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ title: 'Invalid File', message: 'Please select an image file (PNG/JPG).', type: 'critical' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setToast({ title: 'File Too Large', message: 'Image must be under 8MB.', type: 'critical' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(reader.result);
    };
    reader.onerror = () => {
      setToast({ title: 'Upload Failed', message: 'Could not read image file.', type: 'critical' });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit SOS Signal
  const handleSendSOS = async () => {
    if (isSubmitting) return; // Double submit protection
    setIsSubmitting(true);

    try {
      const payload = {
        type: selectedType,
        people_count: peopleCount,
        anyone_injured: anyoneInjured,
        latitude: location[0],
        longitude: location[1],
        address: address || locationName,
        landmark: landmark || null,
        special_needs: specialNeeds || null,
        photo: photoBase64 || null,
      };

      const result = await apiFetch('/sos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (result.success && result.sos?.id) {
        broadcastSOSEvent({ type: 'NEW_SOS', sos: result.sos });

        setToast({
          title: 'SOS Broadcast Sent',
          message: `Incident ${result.sos.id} queued. Emergency responders alerted.`,
          type: 'low',
        });

        // Navigate to status tracking screen
        setTimeout(() => {
          navigate(`/citizen/sos/${result.sos.id}`);
        }, 1200);
      } else {
        throw new Error(result.error || 'Failed to trigger SOS');
      }
    } catch (err) {
      setIsSubmitting(false);
      setToast({
        title: 'SOS Dispatch Failed',
        message: err.message || 'Please check your connection or contact emergency line 112 directly.',
        type: 'critical',
      });
    }
  };

  const selectedTypeObj = EMERGENCY_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-in fade-in">
          <Toast
            title={toast.title}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Stepper Navigation Header */}
      <div className="bg-surface p-4 rounded-md border border-app-border">
        <div className="flex items-center justify-between text-xs font-mono mb-3">
          <span className="font-bold text-navy-ink uppercase">Emergency Distress Dispatch</span>
          <span className="text-muted-text">Step {step} of 3</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`h-1.5 rounded-full transition-all ${step >= 1 ? 'bg-teal-deep' : 'bg-[#E2DED6]'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 2 ? 'bg-teal-deep' : 'bg-[#E2DED6]'}`} />
          <div className={`h-1.5 rounded-full transition-all ${step >= 3 ? 'bg-teal-deep' : 'bg-[#E2DED6]'}`} />
        </div>
        <div className="flex justify-between text-[11px] text-muted-text mt-2 font-medium">
          <span className={step === 1 ? 'text-teal-deep font-semibold' : ''}>1. Emergency Type</span>
          <span className={step === 2 ? 'text-teal-deep font-semibold' : ''}>2. Incident Details</span>
          <span className={step === 3 ? 'text-teal-deep font-semibold' : ''}>3. Review & Confirm</span>
        </div>
      </div>

      {/* STEP 1: SELECT EMERGENCY TYPE */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-bold text-navy-ink">What is your emergency?</h2>
            <p className="text-xs text-muted-text mt-0.5">
              Select the option that best describes your immediate threat.
            </p>
          </div>

          {/* 6 Type Cards in 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EMERGENCY_TYPES.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedType === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedType(item.id)}
                  className={`p-4 rounded-md text-left transition-all flex flex-col justify-between border ${
                    isSelected
                      ? 'border-2 border-teal-deep bg-[#F0F7F7] shadow-sm'
                      : 'border-app-border bg-surface hover:bg-app-bg'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <div className={`p-2.5 rounded-md ${isSelected ? 'bg-teal-deep text-white' : 'bg-app-bg text-navy-ink'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-deep mt-1" />
                    )}
                  </div>
                  <div className="mt-3">
                    <h4 className="font-bold text-navy-ink text-sm">{item.title}</h4>
                    <p className="text-[11px] text-muted-text mt-0.5 leading-snug">{item.desc}</p>
                    <span className="inline-block mt-2 text-[10px] font-mono text-muted-text">
                      {item.priorityHint}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="md"
              icon={ChevronRight}
              onClick={() => setStep(2)}
              className="w-full sm:w-auto"
            >
              Next: Incident Details
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: INCIDENT DETAILS */}
      {step === 2 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-navy-ink">Incident Details</h2>
            <p className="text-xs text-muted-text mt-0.5">
              Provide crew size and triage flags so responders prepare appropriate boats and medical equipment.
            </p>
          </div>

          <Card className="border-app-border">
            <CardContent className="p-4 sm:p-5 space-y-5">
              {/* Selected Type Summary Banner */}
              <div className="flex items-center justify-between p-3 bg-app-bg rounded-md border border-app-border text-xs">
                <div className="flex items-center gap-2">
                  {selectedTypeObj && <selectedTypeObj.icon className="w-4 h-4 text-teal-deep" />}
                  <span className="font-bold text-navy-ink">{selectedTypeObj?.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-teal-deep hover:underline font-mono text-[11px]"
                >
                  Change Type
                </button>
              </div>

              {/* Number of People with Minus/Plus */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-2">
                  Number of People in Danger
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPeopleCount((p) => Math.max(1, p - 1))}
                    disabled={peopleCount <= 1}
                    className="w-10 h-10 rounded border border-app-border bg-surface hover:bg-app-bg disabled:opacity-40 flex items-center justify-center font-bold text-navy-ink transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="w-20 text-center font-mono text-xl font-bold text-navy-ink">
                    {peopleCount}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPeopleCount((p) => p + 1)}
                    className="w-10 h-10 rounded border border-app-border bg-surface hover:bg-app-bg flex items-center justify-center font-bold text-navy-ink transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-muted-text ml-2">
                    {peopleCount === 1 ? 'person stranded' : 'persons stranded together'}
                  </span>
                </div>
              </div>

              {/* Anyone Injured Toggle */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-2">
                  Is Anyone Injured or In Immediate Medical Crisis?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAnyoneInjured(false)}
                    className={`py-2.5 px-4 rounded border text-xs font-medium transition-colors ${
                      !anyoneInjured
                        ? 'border-teal-deep bg-[#F0F7F7] text-teal-deep font-bold'
                        : 'border-app-border bg-surface text-muted-text hover:bg-app-bg'
                    }`}
                  >
                    No Injuries Reported
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnyoneInjured(true)}
                    className={`py-2.5 px-4 rounded border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      anyoneInjured
                        ? 'border-[#B42318] bg-[#FDF2F2] text-[#B42318] font-bold'
                        : 'border-app-border bg-surface text-muted-text hover:bg-app-bg'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Yes, Injured / Critical
                  </button>
                </div>
              </div>

              {/* Optional Photo Upload with Preview */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                  Attach Scene Photo (Optional)
                </label>
                <p className="text-[11px] text-muted-text mb-2">
                  Helps rescue teams assess water depth, building access, and terrain obstacles.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />

                {!photoPreview ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-app-border hover:border-teal-deep rounded-md bg-app-bg flex flex-col items-center justify-center gap-2 text-muted-text hover:text-navy-ink transition-colors"
                  >
                    <Camera className="w-6 h-6 text-teal-deep" />
                    <span className="text-xs font-medium">Click to take photo or upload from device</span>
                    <span className="text-[10px] text-muted-text">PNG, JPG up to 8MB</span>
                  </button>
                ) : (
                  <div className="relative rounded-md overflow-hidden border border-app-border max-w-xs">
                    <img
                      src={photoPreview}
                      alt="SOS Scene Preview"
                      className="w-full h-44 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-navy-ink/80 text-white hover:bg-navy-ink"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Details Textarea */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                  Additional Details / Vulnerabilities
                </label>
                <textarea
                  rows={3}
                  value={specialNeeds}
                  onChange={(e) => setSpecialNeeds(e.target.value)}
                  placeholder="e.g. elderly people, children, landmark, water rising above waist level, insulin needed"
                  className="w-full p-3 text-xs bg-surface border border-app-border rounded focus:outline-none focus:ring-1 focus:ring-teal-deep"
                />
              </div>

              {/* Landmark or Street Identifier */}
              <div>
                <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
                  Landmark / House Address
                </label>
                <Input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Amberpet Water Tank, H.No 12-4-89"
                  className="text-xs font-sans"
                />
              </div>
            </CardContent>
          </Card>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="md"
              icon={ChevronLeft}
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={ChevronRight}
              onClick={() => setStep(3)}
            >
              Next: Confirm Location
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & CONFIRM */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in">
          <div>
            <h2 className="text-lg font-bold text-navy-ink">Review & Confirm SOS</h2>
            <p className="text-xs text-muted-text mt-0.5">
              Confirm your pinpoint location on the map below. Drag or tap marker to refine exact position.
            </p>
          </div>

          {gpsError && (
            <div className="p-3 bg-[#FEF6EE] border border-[#FADCC3] rounded text-xs text-[#B54708] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Interactive Map Pin Selector (Requirement 6: Handle GPS denied, manual pin) */}
          <Card className="border-app-border overflow-hidden">
            <CardHeader className="bg-[#FAF9F6] py-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs uppercase font-mono">Location Pinpoint</CardTitle>
                  <CardDescription className="text-[11px]">
                    Tap map or drag pin to adjust your coordinates
                  </CardDescription>
                </div>
                <Badge variant="teal" mono size="sm">
                  {location[0].toFixed(4)}, {location[1].toFixed(4)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 relative">
              <div className="h-56 w-full">
                <MapContainer
                  center={location}
                  zoom={14}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CartoDB'
                  />
                  <LocationPickerMarker
                    position={location}
                    onPositionChange={handlePositionChange}
                  />
                </MapContainer>
              </div>
              <div className="p-3 bg-surface border-t border-app-border text-xs flex items-center justify-between">
                <span className="font-semibold text-navy-ink truncate">{locationName}</span>
                <span className="text-[11px] text-muted-text">Pin is draggable</span>
              </div>
            </CardContent>
          </Card>

          {/* Summary Details Card */}
          <Card className="border-app-border">
            <CardHeader className="py-3 bg-[#FAF9F6]">
              <CardTitle className="text-xs uppercase font-mono">Distress Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-app-border text-xs">
              <div className="py-2 flex justify-between items-center">
                <span className="text-muted-text">Emergency Type:</span>
                <span className="font-bold text-navy-ink">{selectedTypeObj?.title}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-muted-text">People Count:</span>
                <span className="font-mono font-bold text-navy-ink">{peopleCount}</span>
              </div>
              <div className="py-2 flex justify-between items-center">
                <span className="text-muted-text">Injuries / Trauma:</span>
                {anyoneInjured ? (
                  <Badge variant="critical" size="sm">Yes - Medical Critical</Badge>
                ) : (
                  <Badge variant="low" size="sm">None Reported</Badge>
                )}
              </div>
              {specialNeeds && (
                <div className="py-2 flex justify-between items-start gap-4">
                  <span className="text-muted-text shrink-0">Notes:</span>
                  <span className="text-right text-navy-ink">{specialNeeds}</span>
                </div>
              )}
              {landmark && (
                <div className="py-2 flex justify-between items-start gap-4">
                  <span className="text-muted-text shrink-0">Landmark:</span>
                  <span className="text-right font-medium text-navy-ink">{landmark}</span>
                </div>
              )}
              {photoPreview && (
                <div className="py-2 flex justify-between items-center">
                  <span className="text-muted-text">Attached Photo:</span>
                  <span className="text-teal-deep font-medium">1 photo attached</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Red Send SOS Button */}
          <div className="space-y-2 pt-2">
            <Button
              variant="danger"
              size="lg"
              icon={ShieldAlert}
              onClick={handleSendSOS}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="w-full py-4 text-base font-bold shadow-md bg-[#B42318] hover:bg-[#91180F]"
            >
              {isSubmitting ? 'Transmitting SOS Signal...' : 'Transmit Emergency SOS Signal'}
            </Button>
            <p className="text-[11px] text-center text-muted-text">
              By sending this signal, SEOC Central Command and nearby SDRF/NDRF teams are notified instantly.
            </p>
          </div>

          <div className="flex justify-start">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              onClick={() => setStep(2)}
              disabled={isSubmitting}
            >
              Back to Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendSOSPage;
