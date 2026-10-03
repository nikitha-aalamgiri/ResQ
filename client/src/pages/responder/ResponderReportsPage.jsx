import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  EmptyState
} from '../../components/ui';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shield,
  MapPin,
  ExternalLink
} from 'lucide-react';

export const ResponderReportsPage = () => {
  const { profile } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load status updates & triage actions
  const fetchReportHistory = async () => {
    try {
      const res = await apiFetch('/sos');
      if (res && res.data) {
        // Build report history from incidents that have notes or status changes
        const historyList = [];
        res.data.forEach((inc) => {
          if (inc.status_log && Array.isArray(inc.status_log)) {
            inc.status_log.forEach((log) => {
              historyList.push({
                incident_id: inc.id,
                action: log.status,
                notes: log.notes || `Progressed incident status to ${log.status}`,
                timestamp: log.changed_at || log.created_at,
                location: inc.address || inc.location,
                type: inc.emergency_type || inc.type,
              });
            });
          } else {
            historyList.push({
              incident_id: inc.id,
              action: inc.status,
              notes: inc.notes || `Dispatched to ${inc.emergency_type || inc.type} distress at ${inc.address || inc.location}`,
              timestamp: inc.updated_at || inc.created_at,
              location: inc.address || inc.location,
              type: inc.emergency_type || inc.type,
            });
          }
        });

        // Sort latest first
        historyList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setReports(historyList);
      }
    } catch (err) {
      console.warn('Failed to load report history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportHistory();
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Field Operations Audit Log</span>
            <Badge variant="teal" size="sm">Telemetric Audit Trail</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Update Report & Mission History
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Chronological audit of status transmissions, medical triage reports, and civilian evacuations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={fetchReportHistory}
        >
          Refresh Audit Feed
        </Button>
      </div>

      {/* Reports Feed */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Report History Found"
            description="Operational update records will appear here as you claim and advance incidents in the field."
          />
        ) : (
          reports.map((item, idx) => (
            <Card key={idx} className="border-app-border hover:border-teal-deep/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-app-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-navy-ink">
                      {item.incident_id}
                    </span>
                    <Badge variant="teal" size="sm" className="font-mono">
                      {item.action}
                    </Badge>
                    <span className="text-xs text-muted-text font-medium">
                      {item.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-text">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2.5">
                  <p className="text-xs text-navy-ink leading-relaxed">
                    {item.notes}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-text">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </span>
                    <Link
                      to={`/responder/incidents/${item.incident_id}`}
                      className="text-teal-deep font-semibold hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      Incident Dossier <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
