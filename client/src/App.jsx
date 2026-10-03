import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Shield,
  LifeBuoy,
  Radio,
  MapPin,
  Building2,
  Hospital,
  Compass,
  CheckCircle2,
  PhoneCall,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Send,
  Users
} from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Badge, Toast, Modal } from './components/ui';

// Mock Seed Data for Immediate UI Verification
const DEMO_INCIDENTS = [
  {
    id: 'FQ1024',
    citizen: 'Mohammed Arif',
    phone: '+91-9849033331',
    priority: 'critical',
    status: 'open',
    type: 'Trapped on Terrace / Fast Rising Water',
    location: 'Moosarambagh Riverbed Colony',
    people: 4,
    special: 'Elderly couple unable to navigate stairs',
    assigned: 'Unassigned (Priority Queue)'
  },
  {
    id: 'FQ1025',
    citizen: 'Lakshmi Narayana',
    phone: '+91-9849033332',
    priority: 'high',
    status: 'assigned',
    type: 'Medical Distress / Insulin Required',
    location: 'Chaderghat, Al-Madina Heights',
    people: 2,
    special: 'Diabetic medication refrigerated',
    assigned: 'Inspector K. Vikram (NDRF Battalion 10)'
  },
  {
    id: 'FQ1026',
    citizen: 'Pooja Sharma',
    phone: '+91-9849033333',
    priority: 'critical',
    status: 'in_progress',
    type: 'Ground Floor Submerged / Infants Present',
    location: 'Brahmanwadi, Begumpet',
    people: 5,
    special: 'Two infants (4mo, 18mo), dry formula depleted',
    assigned: 'Capt. Ananya Rao (GHMC DRF Alpha)'
  }
];

const DEMO_ZONES = [
  { code: 'FZ-HYD-01', name: 'Musi River - Chaderghat Basin', severity: 'critical', level: '4.2m', threshold: '2.8m', status: 'Mandatory Evacuation' },
  { code: 'FZ-HYD-02', name: 'Begumpet - Rasoolpura Nala', severity: 'critical', level: '3.75m', threshold: '2.5m', status: 'Mandatory Evacuation' },
  { code: 'FZ-HYD-03', name: 'Nadeem Colony - Tolichowki', severity: 'high', level: '2.9m', threshold: '2.4m', status: 'Voluntary Relocation' },
  { code: 'FZ-HYD-04', name: 'Dilsukhnagar - Saroornagar Lake', severity: 'high', level: '2.65m', threshold: '2.3m', status: 'High Alert' },
  { code: 'FZ-HYD-05', name: 'Alwal - Old Alwal Lowlands', severity: 'medium', level: '1.85m', threshold: '2.2m', status: 'Drainage Pumping' },
  { code: 'FZ-HYD-06', name: 'Hitec City - Durgam Cheruvu', severity: 'low', level: '0.85m', threshold: '2.0m', status: 'Normal Regulated' }
];

const DEMO_SHELTERS = [
  { name: 'Kotla Vijaya Bhaskara Reddy Stadium', location: 'Yousufguda', cap: 800, occ: 520, status: 'open', contact: '+91-9849100001' },
  { name: 'Lal Bahadur Shastri Stadium Camp', location: 'Fateh Maidan', cap: 1200, occ: 890, status: 'open', contact: '+91-9849100002' },
  { name: 'Saroornagar Indoor Stadium', location: 'Kothapet', cap: 600, occ: 410, status: 'open', contact: '+91-9849100003' },
  { name: 'Gachibowli Sports Complex', location: 'Gachibowli', cap: 1500, occ: 340, status: 'open', contact: '+91-9849100004' },
  { name: 'Amberpet Community Relief Hall', location: 'Amberpet', cap: 400, occ: 380, status: 'near_capacity', contact: '+91-9849100005' }
];

const DEMO_ROADS = [
  { name: 'Moosarambagh Cause Way Bridge', severity: 'critical', status: 'impassable', reason: 'Musi river overtopping causeway by 3.5 ft' },
  { name: 'Puranapul Old Bridge Approach', severity: 'high', status: 'impassable', reason: 'Revetment erosion and debris blockage' },
  { name: 'Begumpet Airport Underpass', severity: 'high', status: 'waterlogged', reason: 'Stormwater nala overflow; 4.5 ft waterlogged' }
];

export function App() {
  const [activeToast, setActiveToast] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(DEMO_INCIDENTS[0]);
  const [activeTab, setActiveTab] = useState('incidents');
  const [serverStatus, setServerStatus] = useState({ state: 'idle', data: null });

  // Test Server API Connectivity
  const testServerPing = async () => {
    setServerStatus({ state: 'testing', data: null });
    try {
      const res = await fetch('http://localhost:5000/api/mock/overview');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setServerStatus({ state: 'connected', data });
      triggerToast('Server Connected', `Loaded telemetry for ${data.area}`, 'low');
    } catch (err) {
      setServerStatus({ state: 'error', data: err.message });
      triggerToast('Backend Unreachable', 'Ensure Express server is running on port 5000', 'high');
    }
  };

  const triggerToast = (title, message, type = 'info') => {
    setActiveToast({ title, message, type });
  };

  return (
    <div className="min-h-screen bg-app-bg text-navy-ink font-sans flex flex-col antialiased">
      {/* 1. TOP APP BAR (The only allowed gradient in the application per DESIGN.md) */}
      <header className="bg-app-header-gradient text-white px-6 py-3.5 border-b border-[#0A1D2B] shadow-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-white/10 border border-white/20 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-teal-light" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white m-0">ResQ</h1>
                <span className="text-[10px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-teal-deep text-white font-mono">
                  STEP 1 VERIFICATION
                </span>
              </div>
              <p className="text-xs text-[#C4D9DF]">
                Flood Emergency Response Platform | Operations Console
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-md border border-white/15 text-xs">
              <span className="w-2 h-2 rounded-full bg-[#3B7A57]"></span>
              <span className="font-mono text-teal-light">HYDERABAD SECTOR</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={testServerPing}
              loading={serverStatus.state === 'testing'}
            >
              Test Backend API
            </Button>
          </div>
        </div>
      </header>

      {/* Main Operational Container */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {/* Toast Float Anchor */}
        {activeToast && (
          <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
            <Toast
              title={activeToast.title}
              message={activeToast.message}
              type={activeToast.type}
              onClose={() => setActiveToast(null)}
            />
          </div>
        )}

        {/* Live Operational Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-text uppercase tracking-wider">Active SOS Queue</p>
                <h4 className="text-2xl font-bold font-mono text-navy-ink mt-0.5">3 Incidents</h4>
                <p className="text-[11px] text-[#B42318] mt-1 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B42318]"></span>
                  2 Critical Priority
                </p>
              </div>
              <div className="p-2.5 rounded-md bg-[#FDF2F2] border border-[#F8D2D0]">
                <Radio className="w-5 h-5 text-severity-critical" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-text uppercase tracking-wider">Monitored Zones</p>
                <h4 className="text-2xl font-bold font-mono text-navy-ink mt-0.5">6 Flood Zones</h4>
                <p className="text-[11px] text-muted-text mt-1">Musi Basin at 4.2m</p>
              </div>
              <div className="p-2.5 rounded-md bg-[#FEF6EE] border border-[#FADCC3]">
                <AlertTriangle className="w-5 h-5 text-severity-high" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-text uppercase tracking-wider">Relief Shelters</p>
                <h4 className="text-2xl font-bold font-mono text-navy-ink mt-0.5">5 Operational</h4>
                <p className="text-[11px] text-[#3B7A57] mt-1 font-medium">2,540 / 4,500 Sheltered</p>
              </div>
              <div className="p-2.5 rounded-md bg-[#EDF6F1] border border-[#C3E4D1]">
                <Building2 className="w-5 h-5 text-severity-low" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-text uppercase tracking-wider">Road Obstructions</p>
                <h4 className="text-2xl font-bold font-mono text-navy-ink mt-0.5">3 Blocked</h4>
                <p className="text-[11px] text-[#B54708] mt-1 font-medium">Bridges Barricaded</p>
              </div>
              <div className="p-2.5 rounded-md bg-[#FEF9EE] border border-[#F8E8B9]">
                <Compass className="w-5 h-5 text-severity-medium" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Showcase & Verification Section */}
        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle>Design System & UI Components Verification</CardTitle>
                <CardDescription>
                  Strict verification against DESIGN.md (Inter font, JetBrains Mono IDs, muted severity tokens, solid buttons, 1px borders)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="teal">DESIGN.md Compliant</Badge>
                <Badge variant="outline" mono>Inter + JetBrains Mono</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 flex flex-col gap-6">
            {/* 1. Buttons Suite */}
            <div>
              <h5 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-2.5">
                Buttons Suite (Solid tactile with focus rings, 6px radius)
              </h5>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" icon={PhoneCall}>Primary Action</Button>
                <Button variant="secondary" icon={Shield}>Secondary Action</Button>
                <Button variant="outline" icon={MapPin}>Outline Button</Button>
                <Button variant="danger" icon={AlertTriangle}>Critical Alert</Button>
                <Button variant="ghost">Ghost Button</Button>
                <Button variant="primary" size="sm">Small (sm)</Button>
                <Button variant="primary" size="lg">Large (lg)</Button>
                <Button variant="primary" loading>Loading</Button>
              </div>
            </div>

            {/* 2. Severity Badges Suite */}
            <div>
              <h5 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-2.5">
                Severity Badges (Muted, never saturated per DESIGN.md)
              </h5>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="critical">Critical (#B42318)</Badge>
                <Badge variant="high">High (#B54708)</Badge>
                <Badge variant="medium">Medium (#A16207)</Badge>
                <Badge variant="low">Low / Safe (#3B7A57)</Badge>
                <Badge variant="teal">Deep Teal Informational</Badge>
                <Badge variant="default" mono>Incident FQ1024</Badge>
                <Badge variant="outline" mono>LAT 17.3850 N</Badge>
              </div>
            </div>

            {/* 3. Interactive Triggers (Toast & Modal) */}
            <div>
              <h5 className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-2.5">
                Interactive Components Trigger
              </h5>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerToast('Critical Warning Triggered', 'Musi river overflow at Chaderghat bridge', 'critical')}
                >
                  Trigger Critical Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerToast('High Severity Advisory', 'Begumpet underpass traffic diversion active', 'high')}
                >
                  Trigger High Toast
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => triggerToast('Field Action Resolved', 'Relief supplies arrived at Yousufguda Shelter', 'low')}
                >
                  Trigger Safe Toast
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedIncident(DEMO_INCIDENTS[0]);
                    setModalOpen(true);
                  }}
                >
                  Open Incident Modal (FQ1024)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database & Demo Rows Explorer */}
        <Card className="border-app-border">
          <CardHeader className="bg-[#FAF9F6] pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Database & Seed Data Verification</CardTitle>
                <CardDescription>
                  Demonstrates loaded mock schema rows (Hyderabad Sector) ready for Supabase persistence
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-app-bg p-1 rounded-md border border-app-border">
                <button
                  type="button"
                  onClick={() => setActiveTab('incidents')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'incidents' ? 'bg-surface text-navy-ink shadow-none border border-app-border' : 'text-muted-text hover:text-navy-ink'
                  }`}
                >
                  SOS Incidents (3)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('zones')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'zones' ? 'bg-surface text-navy-ink shadow-none border border-app-border' : 'text-muted-text hover:text-navy-ink'
                  }`}
                >
                  Flood Zones (6)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('shelters')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'shelters' ? 'bg-surface text-navy-ink shadow-none border border-app-border' : 'text-muted-text hover:text-navy-ink'
                  }`}
                >
                  Shelters (5)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('roads')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    activeTab === 'roads' ? 'bg-surface text-navy-ink shadow-none border border-app-border' : 'text-muted-text hover:text-navy-ink'
                  }`}
                >
                  Blocked Roads (3)
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* TAB 1: SOS INCIDENTS */}
            {activeTab === 'incidents' && (
              <div className="divide-y divide-app-border overflow-x-auto">
                <div className="bg-[#FAF9F6] text-xs font-semibold text-muted-text uppercase grid grid-cols-12 px-4 py-2.5">
                  <div className="col-span-2">Incident ID</div>
                  <div className="col-span-3">Distress Citizen</div>
                  <div className="col-span-4">Emergency Description</div>
                  <div className="col-span-2">Assigned Responder</div>
                  <div className="col-span-1 text-right">Action</div>
                </div>
                {DEMO_INCIDENTS.map((inc) => (
                  <div key={inc.id} className="grid grid-cols-12 px-4 py-3.5 items-center hover:bg-[#FAF9F6] transition-colors text-sm">
                    <div className="col-span-2 flex items-center gap-2">
                      <span className="font-mono font-semibold text-navy-ink">{inc.id}</span>
                      <Badge variant={inc.priority}>{inc.priority}</Badge>
                    </div>
                    <div className="col-span-3">
                      <p className="font-medium text-navy-ink leading-tight">{inc.citizen}</p>
                      <p className="text-xs text-muted-text font-mono mt-0.5">{inc.phone}</p>
                    </div>
                    <div className="col-span-4 pr-3">
                      <p className="text-xs font-medium text-navy-ink leading-snug">{inc.type}</p>
                      <p className="text-xs text-muted-text mt-0.5 truncate">{inc.location} ({inc.people} persons)</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-text truncate">{inc.assigned}</p>
                      <span className="inline-block mt-0.5">
                        <Badge variant={inc.status === 'open' ? 'critical' : 'teal'} size="sm">
                          {inc.status}
                        </Badge>
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedIncident(inc);
                          setModalOpen(true);
                        }}
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 2: FLOOD ZONES */}
            {activeTab === 'zones' && (
              <div className="divide-y divide-app-border overflow-x-auto">
                <div className="bg-[#FAF9F6] text-xs font-semibold text-muted-text uppercase grid grid-cols-12 px-4 py-2.5">
                  <div className="col-span-2">Zone Code</div>
                  <div className="col-span-4">Basin Name</div>
                  <div className="col-span-2">Severity</div>
                  <div className="col-span-2">Water / Threshold</div>
                  <div className="col-span-2">Advisory Status</div>
                </div>
                {DEMO_ZONES.map((zone) => (
                  <div key={zone.code} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[#FAF9F6] transition-colors text-sm">
                    <div className="col-span-2 font-mono font-medium text-navy-ink">{zone.code}</div>
                    <div className="col-span-4 font-medium text-navy-ink">{zone.name}</div>
                    <div className="col-span-2">
                      <Badge variant={zone.severity}>{zone.severity}</Badge>
                    </div>
                    <div className="col-span-2 font-mono text-xs text-navy-ink">
                      {zone.level} <span className="text-muted-text">/ {zone.threshold}</span>
                    </div>
                    <div className="col-span-2 text-xs text-muted-text">{zone.status}</div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: SHELTERS */}
            {activeTab === 'shelters' && (
              <div className="divide-y divide-app-border overflow-x-auto">
                <div className="bg-[#FAF9F6] text-xs font-semibold text-muted-text uppercase grid grid-cols-12 px-4 py-2.5">
                  <div className="col-span-4">Shelter Facility</div>
                  <div className="col-span-2">Sector</div>
                  <div className="col-span-3">Capacity vs Occupancy</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Emergency Contact</div>
                </div>
                {DEMO_SHELTERS.map((sh, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[#FAF9F6] transition-colors text-sm">
                    <div className="col-span-4 font-medium text-navy-ink">{sh.name}</div>
                    <div className="col-span-2 text-xs text-muted-text">{sh.location}</div>
                    <div className="col-span-3 pr-4">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span>{sh.occ} sheltered</span>
                        <span className="text-muted-text">{sh.cap} cap</span>
                      </div>
                      <div className="w-full bg-[#E2DED6] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-teal-deep h-full"
                          style={{ width: `${Math.round((sh.occ / sh.cap) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Badge variant={sh.status === 'open' ? 'low' : 'high'} size="sm">
                        {sh.status}
                      </Badge>
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs text-muted-text">
                      {sh.contact}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: BLOCKED ROADS */}
            {activeTab === 'roads' && (
              <div className="divide-y divide-app-border overflow-x-auto">
                <div className="bg-[#FAF9F6] text-xs font-semibold text-muted-text uppercase grid grid-cols-12 px-4 py-2.5">
                  <div className="col-span-4">Corridor / Arterial Link</div>
                  <div className="col-span-2">Obstruction Severity</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-4">Ground Obstruction Reason</div>
                </div>
                {DEMO_ROADS.map((road, idx) => (
                  <div key={idx} className="grid grid-cols-12 px-4 py-3 items-center hover:bg-[#FAF9F6] transition-colors text-sm">
                    <div className="col-span-4 font-medium text-navy-ink">{road.name}</div>
                    <div className="col-span-2">
                      <Badge variant={road.severity}>{road.severity}</Badge>
                    </div>
                    <div className="col-span-2">
                      <Badge variant={road.status === 'impassable' ? 'critical' : 'high'} size="sm">
                        {road.status}
                      </Badge>
                    </div>
                    <div className="col-span-4 text-xs text-muted-text">{road.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-text">
            <span>Hyderabad Emergency Sector Mock GeoJSON & Seed Active</span>
            <span>Total Demo Records: 17 Entities</span>
          </CardFooter>
        </Card>
      </main>

      {/* 2. MODAL VERIFICATION COMPONENT */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Incident Triage: ${selectedIncident.id}`}
        description="Emergency dispatch record in Moosarambagh riverbed basin"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={() => {
                triggerToast('Responder Dispatched', `NDRF unit assigned to incident ${selectedIncident.id}`, 'low');
                setModalOpen(false);
              }}
            >
              Dispatch Rescue Unit
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-app-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-text uppercase tracking-wider font-medium">Distress Citizen</span>
              <Badge variant={selectedIncident.priority}>{selectedIncident.priority}</Badge>
            </div>
            <p className="font-semibold text-navy-ink text-base">{selectedIncident.citizen}</p>
            <p className="font-mono text-xs text-muted-text">{selectedIncident.phone}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 border border-app-border rounded-md bg-surface">
              <span className="text-muted-text uppercase font-semibold">Location Area</span>
              <p className="font-medium text-navy-ink mt-0.5">{selectedIncident.location}</p>
            </div>
            <div className="p-2.5 border border-app-border rounded-md bg-surface">
              <span className="text-muted-text uppercase font-semibold">Persons Trapped</span>
              <p className="font-mono font-medium text-navy-ink mt-0.5">{selectedIncident.people} Individuals</p>
            </div>
          </div>

          <div className="p-3 border border-app-border rounded-md bg-surface">
            <span className="text-xs text-muted-text uppercase font-semibold">Special Triage Needs</span>
            <p className="text-xs text-navy-ink mt-1 leading-relaxed">{selectedIncident.special}</p>
          </div>

          <div className="p-3 border border-app-border rounded-md bg-surface">
            <span className="text-xs text-muted-text uppercase font-semibold">Emergency Nature</span>
            <p className="text-xs text-navy-ink mt-1 font-medium">{selectedIncident.type}</p>
          </div>
        </div>
      </Modal>

      {/* Platform Operational Footer */}
      <footer className="border-t border-app-border bg-surface px-6 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-muted-text gap-2">
          <p>
            ResQ Mission Control © 2026. Built with Vite, React, Tailwind CSS, Express, and Supabase.
          </p>
          <p className="font-mono">
            Demo Area: Hyderabad, India [17.3850° N, 78.4867° E]
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
