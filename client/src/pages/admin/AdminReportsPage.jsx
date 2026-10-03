import React, { useState, useEffect } from 'react';
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
  EmptyState,
  Toast
} from '../../components/ui';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  RotateCcw,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';
import { MapContainer, Polyline, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ResQTileLayer, normalizeLatLng } from '../../lib/mapConfig';

export const AdminReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [toast, setToast] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Map preview modal
  const [previewReport, setPreviewReport] = useState(null);

  const fetchReports = async () => {
    try {
      const res = await apiFetch(`/hazard-reports?status=${statusFilter}&type=${typeFilter}`);
      if (res && res.data) {
        setReports(res.data);
      }
    } catch (err) {
      console.warn('Failed to load hazard reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  const handleVerify = async (report) => {
    setActionLoadingId(report.id);
    try {
      const res = await apiFetch(`/hazard-reports/${report.id}/verify`, {
        method: 'PATCH',
      });

      if (res && res.success) {
        broadcastSOSEvent({
          type: 'ROAD_BLOCKED_VERIFIED',
          report: res.data,
          road_feature: res.road_feature,
        });

        setToast({
          title: 'Road Blockage Verified & Enacted',
          message: `${report.road_name || report.title} added to active blocked roads. Safe routing engine will now automatically detour around it.`,
          type: 'high',
        });

        fetchReports();
      }
    } catch (err) {
      setToast({ title: 'Verification Failed', message: err.message, type: 'critical' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (report) => {
    setActionLoadingId(report.id);
    try {
      const res = await apiFetch(`/hazard-reports/${report.id}/reject`, {
        method: 'PATCH',
      });

      if (res && res.success) {
        setToast({
          title: 'Report Rejected',
          message: `Hazard report ${report.id} marked as dismissed.`,
          type: 'medium',
        });
        fetchReports();
      }
    } catch (err) {
      setToast({ title: 'Rejection Failed', message: err.message, type: 'critical' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
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
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Citizen & Responder Field Intelligence</span>
            {pendingCount > 0 && (
              <Badge variant="high" size="sm" className="font-mono">
                {pendingCount} Pending Verification
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Hazard & Blocked Road Reports
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Verify citizen and responder reports of submerged causeways. Verified roads are dynamically fed into the Safe Evacuation Routing engine.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={fetchReports}
        >
          Refresh Feed
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface p-3 rounded-md border border-app-border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-muted-text shrink-0">Status:</span>
          {['all', 'pending', 'verified', 'rejected'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded font-mono capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-teal-deep text-white font-bold'
                  : 'bg-[#FAF9F6] text-muted-text hover:text-navy-ink border border-app-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-mono text-muted-text shrink-0">Hazard Type:</span>
          {['all', 'blocked_road', 'flood_rise'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-xs rounded font-mono capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-teal-deep text-white font-bold'
                  : 'bg-[#FAF9F6] text-muted-text hover:text-navy-ink border border-app-border'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-app-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9F6] border-b border-app-border text-[11px] font-mono text-muted-text uppercase">
              <tr>
                <th className="p-3.5 pl-4">Report ID / Location</th>
                <th className="p-3.5">Road Name</th>
                <th className="p-3.5">Severity / Type</th>
                <th className="p-3.5">Reporter Details</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-4">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-surface">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted-text">
                    <EmptyState
                      icon={AlertTriangle}
                      title="No Hazard Reports Found"
                      description="No citizen or responder obstacle reports matching your filter."
                    />
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="p-3.5 pl-4">
                      <div className="font-bold text-navy-ink font-mono">{report.id}</div>
                      <div className="text-[11px] text-muted-text flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-teal-deep shrink-0" />
                        <span className="truncate max-w-xs">{report.location}</span>
                      </div>
                      <p className="text-[11px] text-navy-ink mt-1 max-w-sm line-clamp-2">
                        {report.description}
                      </p>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-navy-ink">
                      {report.road_name || report.title}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant={report.severity === 'critical' ? 'critical' : report.severity === 'high' ? 'high' : 'medium'}
                        size="sm"
                      >
                        {report.severity?.toUpperCase()}
                      </Badge>
                      <div className="text-[10px] text-muted-text uppercase font-mono mt-1">
                        {report.type?.replace('_', ' ')}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-navy-ink">{report.reported_by}</div>
                      <div className="text-[10px] text-muted-text font-mono">
                        {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant={
                          report.status === 'verified'
                            ? 'low'
                            : report.status === 'rejected'
                            ? 'neutral'
                            : 'high'
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {report.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewReport(report)}
                          className="text-xs"
                        >
                          View Map
                        </Button>

                        {report.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === report.id}
                              onClick={() => handleVerify(report)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#EDF6F1] text-[#3B7A57] hover:bg-[#D4EDDA] border border-[#C3E4D1] transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify Road
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === report.id}
                              onClick={() => handleReject(report)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-[#FDF2F2] text-[#B42318] hover:bg-[#F8D7DA] border border-[#FDA29B] transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Map Preview Modal */}
      {previewReport && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewReport(null)}
          title={`Hazard Geometry Preview: ${previewReport.road_name || previewReport.title}`}
        >
          <div className="space-y-4">
            <div className="h-64 w-full rounded border border-app-border overflow-hidden">
              <MapContainer
                center={normalizeLatLng(previewReport) || [17.3750, 78.4867]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
              >
                <ResQTileLayer />
                {normalizeLatLng(previewReport) && (
                  <Marker position={normalizeLatLng(previewReport)} />
                )}
                {previewReport.polyline && (
                  <Polyline
                    positions={previewReport.polyline.map(normalizeLatLng).filter(Boolean)}
                    pathOptions={{ color: '#B42318', weight: 5, dashArray: '6, 6' }}
                  />
                )}
              </MapContainer>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-app-border rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-text">Location:</span>
                <span className="font-bold text-navy-ink">{previewReport.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Coordinates:</span>
                <span className="font-mono text-teal-deep">{previewReport.lat.toFixed(4)}, {previewReport.lng.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-text">Description:</span>
                <span className="text-navy-ink text-right max-w-xs">{previewReport.description}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-muted-text">
                {previewReport.status === 'verified' ? 'Active in Routing Engine' : 'Pending Administrative Approval'}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewReport(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
