import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { broadcastSOSEvent } from '../../lib/broadcast';
import { Modal, Button, Badge, PhotoPicker } from '../ui';
import { AlertTriangle, MapPin, Send } from 'lucide-react';

export const HazardReportModal = ({ isOpen, onClose, userCoords = [17.3750, 78.4867] }) => {
  const [roadName, setRoadName] = useState('');
  const [locationName, setLocationName] = useState('Chaderghat - Moosarambagh Link');
  const [hazardType, setHazardType] = useState('blocked_road');
  const [severity, setSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roadName.trim()) return;

    setSubmitting(true);
    try {
      const payload = {
        title: roadName,
        road_name: roadName,
        location: locationName,
        type: hazardType,
        severity,
        lat: userCoords[0],
        lng: userCoords[1],
        description: description || 'Waterlogged roadway impassable.',
        photo_url: photo,
      };

      const res = await apiFetch('/hazard-reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res && res.success) {
        broadcastSOSEvent({
          type: 'HAZARD_REPORT_SUBMITTED',
          report: res.data,
        });
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setRoadName('');
          setDescription('');
          setPhoto(null);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to submit hazard report:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Submerged Road or Obstacle"
    >
      {submitted ? (
        <div className="p-6 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EDF6F1] text-[#3B7A57] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold font-mono text-navy-ink uppercase">Report Dispatched to SEOC</h3>
          <p className="text-xs text-muted-text">
            Command admin will review your report. Once verified, it will automatically alert all evacuees and detour navigation around it.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">
              Obstruction / Road Name
            </label>
            <input
              type="text"
              required
              value={roadName}
              onChange={(e) => setRoadName(e.target.value)}
              placeholder="e.g. Moosarambagh Causeway Bridge"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Hazard Nature</label>
              <select
                value={hazardType}
                onChange={(e) => setHazardType(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              >
                <option value="blocked_road">Impassable / Blocked Road</option>
                <option value="flood_rise">Rapid Water Rise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy-ink mb-1">Severity Assessment</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              >
                <option value="critical">Critical (Life Threat / Complete Submersion)</option>
                <option value="high">High (Deep Waterflow / Closed)</option>
                <option value="medium">Medium (Waterlogged / Slow Movement)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Location Description</label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Near Moosarambagh Junction"
              className="w-full px-3 py-2 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-navy-ink mb-1">Observations / Depth</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Flowing water breached 3 feet, police barricade placed..."
              className="w-full p-2.5 text-xs border border-app-border rounded bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
            />
          </div>

          <PhotoPicker
            value={photo}
            onChange={setPhoto}
            label="Hazard Photo (Optional)"
            helperText="Capture with camera or upload photo of road blockage or water level"
            maxSizeMB={5}
          />

          <div className="pt-2 text-[11px] font-mono text-muted-text flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-teal-deep" />
            <span>GPS: {userCoords[0].toFixed(4)}, {userCoords[1].toFixed(4)}</span>
          </div>

          <div className="pt-3 border-t border-app-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={Send}
              loading={submitting}
            >
              Submit Hazard Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
