import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  EmptyState,
  Toast
} from '../../components/ui';
import {
  Radio,
  MapPin,
  Clock,
  Compass,
  ArrowRight,
  Shield,
  Phone,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const MyTasksPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchTasks = async () => {
    try {
      const res = await apiFetch('/sos');
      if (res && res.data) {
        // Filter tasks assigned to current responder or active
        const myIncidents = res.data.filter((inc) => {
          return (
            inc.assigned_responder_id === user?.id ||
            inc.responder_name === profile?.full_name ||
            inc.status === 'ACCEPTED' ||
            inc.status === 'ON_THE_WAY' ||
            inc.status === 'ARRIVED'
          );
        });
        setTasks(myIncidents);
      }
    } catch (err) {
      console.warn('Failed to load my tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const unsubscribe = onSOSEvent((event) => {
      if (['INCIDENT_ASSIGNED', 'STATUS_UPDATED', 'INCIDENT_CLAIMED'].includes(event.type)) {
        fetchTasks();
      }
    });
    return unsubscribe;
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'WAITING':
        return <Badge variant="critical">Waiting</Badge>;
      case 'ACCEPTED':
        return <Badge variant="medium">Accepted</Badge>;
      case 'ON_THE_WAY':
        return <Badge variant="high">On the Way</Badge>;
      case 'ARRIVED':
        return <Badge variant="teal">Arrived</Badge>;
      case 'RESCUED':
      case 'RESOLVED':
        return <Badge variant="low">Rescued / Resolved</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
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
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Field Operations Queue</span>
            <Badge variant="teal" size="sm" className="font-mono">{tasks.length} Assigned</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            My Operational Tasks
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Active rescue deployments assigned to your tactical callsign.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchTasks}
          >
            Refresh Queue
          </Button>
          <Link to="/responder/triage">
            <Button variant="primary" size="sm">
              Browse Triage Pool
            </Button>
          </Link>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No Active Assignments"
            description="You do not have any active distress incidents assigned right now. Browse the triage pool to claim an incident."
            actionText="Go to Triage Queue"
            onAction={() => navigate('/responder/triage')}
          />
        ) : (
          tasks.map((task) => (
            <Card key={task.id} className="border-app-border hover:border-teal-deep/40 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-app-border">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold font-mono text-navy-ink">
                      {task.id}
                    </span>
                    <Badge variant={task.priority === 'critical' ? 'critical' : 'high'}>
                      {task.priority?.toUpperCase()} PRIORITY
                    </Badge>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-text">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Logged: {new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 text-xs">
                  <div>
                    <span className="text-muted-text block text-[11px]">Emergency Type:</span>
                    <span className="font-bold text-navy-ink">{task.emergency_type || task.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Civilians Trapped:</span>
                    <span className="font-mono font-bold text-navy-ink">{task.people_count || 1} People</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Citizen Contact:</span>
                    <span className="font-mono text-teal-deep">{task.citizen_phone || task.phone || 'Emergency Direct'}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#FAF9F6] border border-app-border rounded-md text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-navy-ink truncate">
                    <MapPin className="w-4 h-4 text-teal-deep shrink-0" />
                    <span className="truncate">{task.address || task.location}</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-text shrink-0">
                    GPS: {Number(task.latitude).toFixed(4)}, {Number(task.longitude).toFixed(4)}
                  </span>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                  <Link to={`/responder/incidents/${task.id}`}>
                    <Button variant="outline" size="sm">
                      View Dossier
                    </Button>
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link to={`/responder/incidents/${task.id}/navigate`}>
                      <Button variant="secondary" size="sm" icon={Compass}>
                        Safe Navigation
                      </Button>
                    </Link>
                    <Link to={`/responder/incidents/${task.id}/update`}>
                      <Button variant="primary" size="sm" icon={ArrowRight}>
                        Update Status
                      </Button>
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
