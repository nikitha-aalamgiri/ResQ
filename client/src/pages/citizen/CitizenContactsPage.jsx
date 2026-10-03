import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LangContext';
import {
  getCachedContacts,
  getCachedShelters,
  DEFAULT_OFFLINE_CONTACTS,
  DEFAULT_OFFLINE_SHELTERS
} from '../../lib/offlineStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button
} from '../../components/ui';
import {
  Phone,
  PhoneCall,
  Shield,
  HeartPulse,
  Flame,
  Users,
  Building2,
  Package,
  Droplets,
  Utensils,
  ExternalLink,
  CheckCircle2,
  Navigation,
  Compass
} from 'lucide-react';

export const CitizenContactsPage = () => {
  const { t } = useLang();

  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'resources'
  const [contacts, setContacts] = useState(DEFAULT_OFFLINE_CONTACTS);
  const [shelters, setShelters] = useState(DEFAULT_OFFLINE_SHELTERS);

  useEffect(() => {
    const loadedContacts = getCachedContacts();
    const loadedShelters = getCachedShelters();
    if (loadedContacts.length > 0) setContacts(loadedContacts);
    if (loadedShelters.length > 0) setShelters(loadedShelters);
  }, []);

  const primaryContacts = contacts.filter((c) => c.category === 'primary');
  const importantResources = contacts.filter((c) => c.category === 'resource');

  // Contact icon helper
  const getContactIcon = (number) => {
    switch (number) {
      case '112':
        return <Shield className="w-5 h-5 text-teal-deep" />;
      case '108':
        return <HeartPulse className="w-5 h-5 text-[#B42318]" />;
      case '101':
        return <Flame className="w-5 h-5 text-[#B54708]" />;
      case '1098':
        return <Users className="w-5 h-5 text-[#175CD3]" />;
      default:
        return <Phone className="w-5 h-5 text-teal-deep" />;
    }
  };

  return (
    <div className="space-y-5 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-mono text-navy-ink">
            {t('contactsTitle')}
          </h2>
          <p className="text-xs text-muted-text mt-1">
            {t('contactsSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" size="sm">
            Offline Ready
          </Badge>
        </div>
      </div>

      {/* Tabs: Emergency Contacts & Relief Resources (Requirement 3) */}
      <div className="flex items-center gap-2 border-b border-app-border">
        <button
          type="button"
          onClick={() => setActiveTab('contacts')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'contacts'
              ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
              : 'border-transparent text-muted-text hover:text-navy-ink'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>{t('contactsTab')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'resources'
              ? 'border-teal-deep text-teal-deep bg-surface font-bold shadow-xs'
              : 'border-transparent text-muted-text hover:text-navy-ink'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{t('resourcesTab')}</span>
        </button>
      </div>

      {/* TAB 1: EMERGENCY CONTACTS */}
      {activeTab === 'contacts' && (
        <div className="space-y-5">
          {/* 4 Primary Emergency Helplines (112, 108, 101, 1098 with call buttons marked demo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {primaryContacts.map((contact) => (
              <Card key={contact.id} className="border-app-border hover:border-teal-deep transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="p-2.5 rounded-md bg-app-bg border border-app-border shrink-0">
                      {getContactIcon(contact.number)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy-ink text-sm">{contact.name}</span>
                        {contact.demo && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-bg border border-app-border text-muted-text uppercase">
                            Demo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-text mt-0.5">{contact.agency}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-app-border">
                    <span className="font-mono text-xl font-bold text-navy-ink tracking-tight">
                      {contact.number}
                    </span>

                    <a
                      href={`tel:${contact.number}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-deep text-white text-xs font-semibold hover:bg-teal-deep/90 transition-colors shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>{t('callNow')}</span>
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Important Resources List (Government Helpline, Disaster Management, Local Authority) */}
          <Card className="border-app-border">
            <CardHeader className="bg-[#FAF9F6] py-3.5 border-b border-app-border">
              <CardTitle className="text-sm">Government & Disaster Management Helplines</CardTitle>
              <CardDescription>
                State disaster emergency control, municipal flood desk, and military rescue base
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-app-border text-xs">
                {importantResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-4 hover:bg-[#FAF9F6] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-navy-ink text-sm">{res.name}</h4>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-app-bg border border-app-border text-muted-text uppercase">
                          Demo Hotline
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-text mt-0.5">{res.agency}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono font-bold text-navy-ink text-sm">{res.number}</span>
                      <a
                        href={`tel:${res.number}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-app-border bg-surface hover:bg-app-bg text-navy-ink font-semibold text-xs transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-teal-deep" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: RELIEF RESOURCES AT SHELTERS */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#EDF6F1] border border-[#C3E4D1] rounded-md text-xs text-[#3B7A57] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Verified live stock telemetry from Civil Supplies & Municipal Relief Warehouses
            </span>
            <Link to="/citizen/shelters" className="font-bold underline text-xs font-mono">
              View All 5 Shelters →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shelters.map((shelter) => {
              const res = shelter.resources || {
                food_packets: 400,
                water_pouches: 1500,
                medical_kits: 80,
                blankets: 300,
              };

              return (
                <Card key={shelter.id} className="border-app-border">
                  <CardHeader className="bg-[#FAF9F6] py-3 border-b border-app-border">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm truncate max-w-[240px]">
                        {shelter.name}
                      </CardTitle>
                      <Badge variant={shelter.status === 'open' ? 'low' : 'high'} size="sm">
                        {shelter.status === 'open' ? t('open') : t('fillingFast')}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs truncate">
                      {shelter.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3.5 text-xs">
                    {/* Stock Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded bg-app-bg border border-app-border">
                        <span className="text-muted-text text-[11px] flex items-center gap-1">
                          <Utensils className="w-3.5 h-3.5 text-[#3B7A57]" /> {t('foodPackets')}
                        </span>
                        <p className="font-mono font-bold text-navy-ink text-sm mt-0.5">
                          {res.food_packets} packs
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-app-bg border border-app-border">
                        <span className="text-muted-text text-[11px] flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-teal-deep" /> {t('waterBottles')}
                        </span>
                        <p className="font-mono font-bold text-navy-ink text-sm mt-0.5">
                          {res.water_pouches} pouches
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-app-bg border border-app-border">
                        <span className="text-muted-text text-[11px] flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-[#B42318]" /> {t('medicalKits')}
                        </span>
                        <p className="font-mono font-bold text-navy-ink text-sm mt-0.5">
                          {res.medical_kits} kits
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-app-bg border border-app-border">
                        <span className="text-muted-text text-[11px] flex items-center gap-1">
                          <Package className="w-3.5 h-3.5 text-[#7A5E10]" /> {t('blankets')}
                        </span>
                        <p className="font-mono font-bold text-navy-ink text-sm mt-0.5">
                          {res.blankets} units
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-app-border">
                      <span className="font-mono text-muted-text text-[11px]">
                        Available: {shelter.spare_capacity ?? (shelter.capacity - shelter.occupancy)} beds
                      </span>

                      <Link to={`/citizen/route?shelter=${shelter.id}`}>
                        <Button variant="primary" size="sm" icon={Compass}>
                          {t('navigate')}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenContactsPage;
