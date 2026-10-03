import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { onSOSEvent, broadcastSOSEvent } from '../../lib/broadcast';
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
  MessageSquare,
  Bell,
  AlertTriangle,
  Radio,
  Send,
  Clock,
  Shield,
  CheckCircle2,
  Users,
  Info
} from 'lucide-react';

export const ResponderMessagesPage = () => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Incident Updates' | 'Team Messages' | 'System Alerts'
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(3);
  const [toast, setToast] = useState(null);

  // Compose box state
  const [composeText, setComposeText] = useState('');
  const [composeTitle, setComposeTitle] = useState('');
  const [composeCategory, setComposeCategory] = useState('team_message');
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      const res = await apiFetch('/messages');
      if (res && res.data) {
        setMessages(res.data);
      }
    } catch (err) {
      console.warn('Failed to load messages feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Realtime Listener for new messages & system alerts
    const unsubscribe = onSOSEvent((event) => {
      if (event.type === 'TEAM_MESSAGE_SENT' && event.message) {
        setMessages((prev) => [event.message, ...prev]);
        setUnreadCount((c) => c + 1);
        setToast({
          title: `New Message: ${event.message.title}`,
          message: event.message.text,
          type: 'low',
        });
      }
    });

    const interval = setInterval(fetchMessages, 10000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!composeText.trim()) return;

    setSending(true);
    try {
      const res = await apiFetch('/messages', {
        method: 'POST',
        body: JSON.stringify({
          title: composeTitle || 'Team Field Update',
          text: composeText,
          category: composeCategory,
        }),
      });

      if (res && res.success) {
        broadcastSOSEvent({
          type: 'TEAM_MESSAGE_SENT',
          message: res.data,
        });

        setMessages((prev) => [res.data, ...prev]);
        setComposeText('');
        setComposeTitle('');
        setToast({
          title: 'Message Transmitted',
          message: 'Your field bulletin was broadcast to all active response units.',
          type: 'low',
        });
      }
    } catch (err) {
      setToast({
        title: 'Transmission Failed',
        message: err.message,
        type: 'critical',
      });
    } finally {
      setSending(false);
    }
  };

  // Filter messages by active tab
  const filteredMessages = messages.filter((m) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Incident Updates') return m.category === 'incident_update';
    if (activeTab === 'Team Messages') return m.category === 'team_message';
    if (activeTab === 'System Alerts') return m.category === 'system_alert';
    return true;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'system_alert':
        return <AlertTriangle className="w-4 h-4 text-[#B42318]" />;
      case 'incident_update':
        return <Radio className="w-4 h-4 text-teal-deep" />;
      case 'team_message':
      default:
        return <MessageSquare className="w-4 h-4 text-[#175CD3]" />;
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'system_alert':
        return <Badge variant="critical" size="sm">System Alert</Badge>;
      case 'incident_update':
        return <Badge variant="teal" size="sm">Incident Update</Badge>;
      case 'team_message':
      default:
        return <Badge variant="medium" size="sm">Team Message</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
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
            <span className="text-xs font-mono uppercase text-muted-text">Field Communications</span>
            {unreadCount > 0 && (
              <Badge variant="high" size="sm" className="font-mono">
                {unreadCount} Unread
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Messages & Notifications
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Inter-agency bulletins, status handoffs, tactical advisories, and system telemetry notices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUnreadCount(0)}
            className="text-xs"
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Simple Compose Box for Team Messages (Requirement 2) */}
      <Card className="border-app-border">
        <CardHeader className="py-3 bg-[#FAF9F6]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-deep" />
              <span>Compose Team Bulletin / Incident Broadcast</span>
            </CardTitle>
            <span className="text-[11px] font-mono text-muted-text">Broadcasts in Realtime</span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={composeTitle}
                  onChange={(e) => setComposeTitle(e.target.value)}
                  placeholder="Subject / Incident ID reference (e.g. FQ1024 Extraction Update)"
                  className="w-full px-3 py-2 text-xs border border-app-border rounded-md bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                />
              </div>
              <div>
                <select
                  value={composeCategory}
                  onChange={(e) => setComposeCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-app-border rounded-md bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
                >
                  <option value="team_message">Team Message</option>
                  <option value="incident_update">Incident Update</option>
                  <option value="system_alert">Tactical Notice</option>
                </select>
              </div>
            </div>

            <textarea
              rows={2}
              value={composeText}
              onChange={(e) => setComposeText(e.target.value)}
              placeholder="Transmit message to all sector units, dispatch admins, and command coordinators..."
              className="w-full p-3 text-xs border border-app-border rounded-md bg-surface text-navy-ink focus:outline-none focus:ring-2 focus:ring-teal-deep"
              required
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={Send}
                loading={sending}
                disabled={sending || !composeText.trim()}
              >
                Send Message
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs (Requirement 2: All, Incident Updates, Team Messages, System Alerts) */}
      <div className="flex items-center gap-1 border-b border-app-border overflow-x-auto pb-0">
        {['All', 'Incident Updates', 'Team Messages', 'System Alerts'].map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
                  : 'border-transparent text-muted-text hover:text-navy-ink'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Messages List (Requirement 2: icon, title, text, time) */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages found"
            description="There are currently no communications in this category."
          />
        ) : (
          filteredMessages.map((msg) => (
            <Card key={msg.id} className="border-app-border hover:border-teal-deep/40 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-[#FAF9F6] border border-app-border shrink-0 mt-0.5">
                    {getCategoryIcon(msg.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-navy-ink font-mono truncate">
                          {msg.title}
                        </h3>
                        {getCategoryBadge(msg.category)}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-muted-text shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>
                          {typeof msg.timestamp === 'string' && msg.timestamp.includes('T')
                            ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : msg.timestamp || msg.time || 'Just now'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-navy-ink leading-relaxed">
                      {msg.text}
                    </p>

                    <div className="mt-2 pt-2 border-t border-app-border flex items-center justify-between text-[11px] text-muted-text">
                      <span className="font-mono text-teal-deep">
                        From: {msg.sender}
                      </span>
                      <span className="capitalize text-[10px]">
                        {msg.sender_role} channel
                      </span>
                    </div>
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
