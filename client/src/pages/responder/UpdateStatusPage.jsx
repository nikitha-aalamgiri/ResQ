import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Modal, Toast } from '../../components/ui';
import {
  ShieldAlert,
  ChevronLeft,
  CheckCircle2,
  Navigation,
  MapPin,
  LifeBuoy,
  HeartPulse,
  Camera,
  X,
  Radio,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Building2,
  Users,
  Utensils,
  Droplets,
  Accessibility,
  Dog,
} from 'lucide-react';

const STEPPER_STAGES = [
  { id: 'ACCEPTED', label: 'Assigned', step: 1 },
  { id: 'ON_THE_WAY', label: 'On the way', step: 2 },
  { id: 'ARRIVED', label: 'Arrived', step: 3 },
  { id: 'RESCUED', label: 'Rescued', step: 4 },
  { id: 'RESOLVED', label: 'Closed', step: 5 },
];

export const UpdateStatusPage = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');
  const [notes, setNotes] = useState('');

  const [recommendedShelter, setRecommendedShelter] = useState(null);
  const [loadingShelter, setLoadingShelter] = useState(false);

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const fileInputRef = useRef(null);

  // Irreversible confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchIncident = async () => {
    try {
      const res = await apiFetch(`/sos/${id}`);
      if (res.success && res.data) {
        setIncident(res.data);
        const current = String(res.data.status).toUpperCase();
        // Pre-select default next valid step
        if (current === 'ACCEPTED' || current === 'WAITING') {
          setSelectedAction('ON_THE_WAY');
        } else if (current === 'ON_THE_WAY') {
          setSelectedAction('ARRIVED');
        } else if (current === 'ARRIVED') {
          setSelectedAction('RESCUED');
        } else if (current === 'RESCUED') {
          setSelectedAction('RESOLVED');
        }

        if (res.data.recommended_shelter) {
          setRecommendedShelter(res.data.recommended_shelter);
        } else if (current === 'RESCUED') {
          fetchNearestShelter(res.data);
        }
      }
    } catch (err) {
      setToast({
        title: 'Error Loading Incident',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNearestShelter = async (incData) => {
    const lat = incData?.latitude || 17.3850;
    const lng = incData?.longitude || 78.4867;
    const count = incData?.people_count || 1;
    setLoadingShelter(true);
    try {
      const res = await apiFetch(`/shelters/nearest?lat=${lat}&lng=${lng}&minCapacity=${count}`);
      if (res.success && res.data) {
        setRecommendedShelter(res.data);
      }
    } catch (e) {
      console.warn('Failed to load recommended shelter:', e);
    } finally {
      setLoadingShelter(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setToast({ title: 'Invalid File', message: 'Please select an image file (PNG/JPG).', type: 'critical' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(reader.result);
      setPhotoBase64(reader.result);
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

  // Perform actual API status update
  const executeStatusUpdate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await apiFetch(`/sos/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: selectedAction,
          note: notes,
          photo: photoBase64,
          shelterId: recommendedShelter?.id || incident?.shelter_id || incident?.recommended_shelter?.id,
        }),
      });

      if (res.success) {
        if (res.recommended_shelter) {
          setRecommendedShelter(res.recommended_shelter);
        }

        // Broadcast cross-tab and cross-window events
        broadcastSOSEvent({
          type: 'SOS_STATUS_CHANGED',
          sosId: id,
          status: selectedAction,
          responderId: user?.id,
          responderName: profile?.full_name || 'Rescue Team',
          people_count: incident?.people_count,
        });

        if (res.updated_shelter) {
          broadcastSOSEvent({
            type: 'SHELTER_OCCUPANCY_CHANGED',
            shelter: res.updated_shelter,
            shelterId: res.updated_shelter.id,
            newOccupancy: res.updated_shelter.occupancy,
          });
        }

        setToast({
          title: 'Status Updated',
          message: `Incident ${id} updated to ${selectedAction}`,
          type: 'low',
        });

        if (selectedAction === 'RESCUED') {
          // If moved to RESCUED, stay and display the recommended shelter
          setIncident((prev) => ({
            ...prev,
            status: 'RESCUED',
            recommended_shelter: res.recommended_shelter || prev?.recommended_shelter,
          }));
          setSelectedAction('RESOLVED');
          if (res.recommended_shelter) {
            setRecommendedShelter(res.recommended_shelter);
          } else {
            fetchNearestShelter(incident);
          }
        } else {
          setTimeout(() => {
            navigate(`/responder/incidents/${id}`);
          }, 1000);
        }
      }
    } catch (err) {
      setToast({
        title: 'Status Update Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAction) {
      setToast({ title: 'Action Required', message: 'Please select a status action.', type: 'critical' });
      return;
    }

    // Irreversible step confirmation (Requirement 4)
    if (selectedAction === 'RESOLVED' || selectedAction === 'RESCUED') {
      setShowConfirmModal(true);
    } else {
      executeStatusUpdate();
    }
  };

  if (loading && !incident) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center text-xs font-mono text-muted-text">
        Loading status console...
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="max-w-md mx-auto p-6 bg-surface border border-app-border rounded-md text-center">
        <p className="text-xs text-muted-text">Incident #{id} not found.</p>
      </div>
    );
  }

  const currentStatus = String(incident.status).toUpperCase();

  // Calculate current stage index for stepper (1 to 5)
  const currentStageIndex = (() => {
    switch (currentStatus) {
      case 'WAITING':
      case 'OPEN':
        return 0;
      case 'ACCEPTED':
        return 1;
      case 'ON_THE_WAY':
        return 2;
      case 'ARRIVED':
        return 3;
      case 'RESCUED':
        return 4;
      case 'RESOLVED':
      case 'CLOSED':
        return 5;
      default:
        return 1;
    }
  })();

  // Filter allowed actions based on current stage (Requirement 4)
  const getAllowedActions = () => {
    const list = [];
    if (currentStatus === 'WAITING' || currentStatus === 'ACCEPTED') {
      list.push({ id: 'ON_THE_WAY', label: 'On the way', color: 'bg-teal-deep text-white hover:bg-teal-deep/90', type: 'primary' });
      list.push({ id: 'NEED_SUPPORT', label: 'Need additional support', color: 'border-app-border bg-surface hover:bg-app-bg text-navy-ink', type: 'side' });
      list.push({ id: 'COULD_NOT_LOCATE', label: 'Could not locate', color: 'border-app-border bg-surface hover:bg-app-bg text-[#B54708]', type: 'side' });
    } else if (currentStatus === 'ON_THE_WAY') {
      list.push({ id: 'ARRIVED', label: 'Arrived at location', color: 'bg-teal-deep text-white hover:bg-teal-deep/90', type: 'primary' });
      list.push({ id: 'NEED_SUPPORT', label: 'Need additional support', color: 'border-app-border bg-surface hover:bg-app-bg text-navy-ink', type: 'side' });
      list.push({ id: 'COULD_NOT_LOCATE', label: 'Could not locate', color: 'border-app-border bg-surface hover:bg-app-bg text-[#B54708]', type: 'side' });
      list.push({ id: 'CONVERTED_TO_SHELTER', label: 'Converted to shelter', color: 'border-app-border bg-surface hover:bg-app-bg text-[#3B7A57]', type: 'side' });
    } else if (currentStatus === 'ARRIVED') {
      list.push({ id: 'RESCUED', label: 'Rescued', color: 'bg-[#3B7A57] text-white hover:bg-[#2F6145]', type: 'primary' });
      list.push({ id: 'NEED_SUPPORT', label: 'Need additional support', color: 'border-app-border bg-surface hover:bg-app-bg text-navy-ink', type: 'side' });
      list.push({ id: 'CONVERTED_TO_SHELTER', label: 'Converted to shelter', color: 'border-app-border bg-surface hover:bg-app-bg text-[#3B7A57]', type: 'side' });
    } else if (currentStatus === 'RESCUED') {
      list.push({ id: 'RESOLVED', label: 'Closed / Transferred to Camp', color: 'bg-[#0F2A3D] text-white hover:bg-[#0A1D2B]', type: 'primary' });
    }
    return list;
  };

  const allowedActions = getAllowedActions();

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
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

      {/* Top Header */}
      <div className="flex items-center justify-between bg-surface p-4 rounded-md border border-app-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={() => navigate(`/responder/incidents/${id}`)}
          >
            Cancel
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono font-bold text-base text-navy-ink">Update Incident #{incident.id}</h2>
              <Badge variant="teal" size="sm">Current: {incident.status}</Badge>
            </div>
            <p className="text-[11px] text-muted-text mt-0.5">
              Citizen: {incident.citizen_name} • {incident.address}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Step Stepper (Requirement 4) */}
      <Card className="border-app-border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs font-mono mb-3">
            <span className="font-bold text-navy-ink uppercase">Field Lifecycle Progression</span>
            <span className="text-muted-text">Stage {currentStageIndex} of 5</span>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-5 gap-1.5 mb-2">
            {STEPPER_STAGES.map((s) => (
              <div
                key={s.id}
                className={`h-2 rounded-full transition-all ${
                  currentStageIndex >= s.step ? 'bg-teal-deep' : 'bg-[#E2DED6]'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-5 gap-1 text-[10px] sm:text-[11px] font-medium text-center">
            {STEPPER_STAGES.map((s) => (
              <span
                key={s.id}
                className={`truncate ${
                  currentStageIndex === s.step
                    ? 'text-teal-deep font-bold'
                    : currentStageIndex > s.step
                    ? 'text-[#3B7A57]'
                    : 'text-muted-text'
                }`}
              >
                {s.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Relief Shelter (Step 7: Shown after RESCUED or when recommended) */}
      {(recommendedShelter || currentStatus === 'RESCUED' || incident?.recommended_shelter) && (
        <Card className="border-[#C3E4D1] bg-[#FAFDFB]">
          <CardHeader className="bg-[#EDF6F1] py-3 border-b border-[#C3E4D1]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3B7A57]" />
                <CardTitle className="text-sm text-navy-ink font-mono">
                  Recommended Relief Shelter for Citizen Transfer
                </CardTitle>
              </div>
              <Badge variant="teal" size="sm">
                Automated SEOC Allocation
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#3B7A57]">
              Nearest verified shelter with confirmed capacity for {incident?.people_count || 1} people
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {recommendedShelter ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-navy-ink text-sm flex items-center gap-2">
                      {recommendedShelter.name}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                        recommendedShelter.status === 'open'
                          ? 'bg-[#EDF6F1] text-[#3B7A57] border border-[#C3E4D1]'
                          : recommendedShelter.status === 'filling_fast'
                          ? 'bg-[#FEF6EE] text-[#B54708] border border-[#F9DBAF]'
                          : 'bg-[#FDF2F2] text-[#B42318] border border-[#F8D2D0]'
                      }`}>
                        {recommendedShelter.status === 'open' ? 'Open' : recommendedShelter.status === 'filling_fast' ? 'Filling Fast' : 'Full'}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-text flex items-center gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                      {recommendedShelter.address}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs text-navy-ink">
                    <span className="bg-surface px-2.5 py-1 rounded border border-app-border">
                      {recommendedShelter.distance_km || '2.4'} km away
                    </span>
                    <span className="bg-surface px-2.5 py-1 rounded border border-app-border text-teal-deep font-semibold">
                      ~{recommendedShelter.drive_time_mins || 10} min drive
                    </span>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-muted-text">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-navy-ink" />
                      Occupancy: <strong className="text-navy-ink">{recommendedShelter.occupancy}</strong> / {recommendedShelter.capacity} beds
                    </span>
                    <span className="text-[#3B7A57] font-semibold">
                      {recommendedShelter.spare_capacity ?? (recommendedShelter.capacity - recommendedShelter.occupancy)} available
                    </span>
                  </div>
                  <div className="w-full bg-[#E2DED6] h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        recommendedShelter.occupancy_rate >= 100
                          ? 'bg-[#B42318]'
                          : recommendedShelter.occupancy_rate >= 75
                          ? 'bg-[#B54708]'
                          : 'bg-[#3B7A57]'
                      }`}
                      style={{ width: `${Math.min(100, Math.round(recommendedShelter.occupancy_rate || ((recommendedShelter.occupancy / recommendedShelter.capacity) * 100)))}%` }}
                    />
                  </div>
                </div>

                {/* Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white border border-app-border text-navy-ink">
                    <Utensils className="w-3 h-3 text-[#3B7A57]" /> Food & Water
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white border border-app-border text-navy-ink">
                    <HeartPulse className="w-3 h-3 text-[#B42318]" /> Medical Care
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white border border-app-border text-navy-ink">
                    <Accessibility className="w-3 h-3 text-teal-deep" /> Accessible
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white border border-app-border text-navy-ink">
                    <Dog className="w-3 h-3 text-muted-text" /> Pet Area: {recommendedShelter.pets_allowed ? 'Yes' : 'No'}
                  </span>
                </div>

                {/* Navigation and Shelter Directory Links */}
                <div className="flex items-center justify-between pt-2 border-t border-[#C3E4D1]">
                  <Link
                    to="/responder/shelters"
                    className="text-xs font-mono text-teal-deep hover:underline flex items-center gap-1"
                  >
                    View All Shelters Directory →
                  </Link>

                  <Link to={`/citizen/route?shelter=${recommendedShelter.id}`}>
                    <Button variant="primary" size="sm" icon={Navigation}>
                      Navigate to Shelter
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <div className="py-3 text-center text-xs text-muted-text font-mono">
                {loadingShelter ? 'Locating nearest open shelter with available capacity...' : 'No open shelter available currently.'}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Update Form Card */}
      <Card className="border-app-border">
        <CardHeader className="bg-[#FAF9F6] py-3.5">
          <CardTitle className="text-sm">Select Next Operational Action</CardTitle>
          <CardDescription>
            Enforced sequential transitions & operational outcome logging
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          {/* Action Buttons (Requirement 4: Showing only valid next actions) */}
          <div>
            <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-2">
              Action Status Choice
            </label>
            {allowedActions.length === 0 ? (
              <div className="p-4 bg-[#EDF6F1] border border-[#C3E4D1] rounded text-xs text-[#3B7A57] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>This incident has completed all operational stages and is marked Resolved.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allowedActions.map((act) => {
                  const isSelected = selectedAction === act.id;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => setSelectedAction(act.id)}
                      className={`p-3 rounded-md border text-xs font-semibold text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-2 border-teal-deep bg-teal-light/40 shadow-sm'
                          : 'border-app-border bg-surface hover:bg-app-bg'
                      }`}
                    >
                      <span className="text-navy-ink">{act.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-teal-deep" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-muted-text" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Textarea (Requirement 4) */}
          <div>
            <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
              Field Log Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Arrived at location; water level at 1.4m; securing family on inflatable vessel."
              className="w-full p-3 bg-surface border border-app-border rounded focus:outline-none focus:ring-1 focus:ring-teal-deep text-xs font-sans"
            />
          </div>

          {/* Photo Upload with Preview (Requirement 4) */}
          <div>
            <label className="block text-xs font-semibold text-navy-ink uppercase tracking-wider mb-1.5">
              Attach On-Scene Evidence Photo (Optional)
            </label>
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
                className="w-full py-5 border-2 border-dashed border-app-border hover:border-teal-deep rounded-md bg-app-bg flex flex-col items-center justify-center gap-1.5 text-muted-text hover:text-navy-ink transition-colors"
              >
                <Camera className="w-5 h-5 text-teal-deep" />
                <span className="text-xs font-medium">Capture scene photo with field camera</span>
                <span className="text-[10px] text-muted-text">PNG, JPG up to 8MB</span>
              </button>
            ) : (
              <div className="relative rounded-md overflow-hidden border border-app-border max-w-xs">
                <img
                  src={photoPreview}
                  alt="Field update preview"
                  className="w-full h-40 object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1 rounded-full bg-navy-ink/80 text-white hover:bg-navy-ink"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Submit Update Button (Requirement 4) */}
          <div className="pt-2">
            <Button
              variant="danger"
              size="md"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting || allowedActions.length === 0}
              className="w-full py-3 font-bold"
            >
              Submit Operational Update
            </Button>
            <p className="text-[11px] text-center text-muted-text mt-2">
              Citizen status timeline and SEOC command consoles will update in real time.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Irreversible Confirmation Dialog Modal (Requirement 4) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface max-w-sm w-full p-5 rounded-lg border border-app-border shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 text-[#B42318]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Confirm Critical Milestone</h3>
            </div>
            <p className="text-xs text-navy-ink leading-relaxed">
              Are you sure you want to transition incident <strong>#{incident.id}</strong> to{' '}
              <span className="font-bold text-teal-deep">{selectedAction}</span>?
              This milestone will notify SEOC command that victims have been recovered.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Go Back
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={executeStatusUpdate}
                loading={isSubmitting}
              >
                Confirm & Broadcast
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateStatusPage;
