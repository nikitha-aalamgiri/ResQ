import React, { useState } from 'react';
import { Search, X, Check, Filter, Layers as LayersIcon, MapPin, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../ui';
import { SEARCH_LOCATIONS } from '../../data/mockData';

export const Layers = ({
  role = 'citizen',
  layers = {
    zones: true,
    shelters: true,
    hospitals: true,
    roads: true,
    sos: true,
    responders: true,
    rainfall: false,
  },
  onToggleLayer,
  onSelectLocation,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Filter locations for search autocomplete
  const filteredLocations = searchTerm.trim()
    ? SEARCH_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loc.category.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 6)
    : [];

  const handleSelect = (loc) => {
    setSearchTerm(loc.name);
    setShowResults(false);
    if (onSelectLocation) {
      onSelectLocation(loc);
    }
  };

  // 1. CITIZEN VERSION: Chip row above the map + Search Box
  if (role === 'citizen') {
    const citizenChips = [
      { key: 'zones', label: 'Flood Zones', color: '#B42318' },
      { key: 'shelters', label: 'Shelters', color: '#3B7A57' },
      { key: 'hospitals', label: 'Hospitals', color: '#B42318' },
      { key: 'roads', label: 'Blocked Roads', color: '#B54708' },
    ];

    return (
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${className}`}>
        {/* Toggle Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {citizenChips.map((chip) => {
            const active = layers[chip.key];
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => onToggleLayer && onToggleLayer(chip.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 shrink-0 ${
                  active
                    ? 'bg-teal-light text-teal-deep border-[#c4dcde]'
                    : 'bg-surface text-muted-text border-app-border hover:bg-app-bg hover:text-navy-ink'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: active ? chip.color : '#A4BDC6' }}
                />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted-text absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search shelter, hospital, area..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-surface border border-app-border rounded-md text-navy-ink placeholder:text-muted-text focus:outline-none focus:ring-2 focus:ring-teal-deep focus:border-teal-deep"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setShowResults(false);
                }}
                className="absolute right-2 text-muted-text hover:text-navy-ink p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showResults && filteredLocations.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-app-border rounded-md z-50 overflow-hidden shadow-none max-h-56 overflow-y-auto">
              {filteredLocations.map((loc, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelect(loc)}
                  className="px-3 py-2 text-xs hover:bg-[#FAF9F6] cursor-pointer border-b border-app-border last:border-none flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-navy-ink truncate">{loc.name}</p>
                    <p className="text-[10px] text-muted-text font-mono">
                      {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                    </p>
                  </div>
                  <Badge variant="outline" size="sm">{loc.category}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. ADMIN VERSION: Checklist Panel on the right
  if (role === 'admin') {
    const adminChecklist = [
      { key: 'zones', label: 'Flood Risk Zones', badge: '6 Zones', color: '#B42318' },
      { key: 'sos', label: 'SOS Distress Calls', badge: '4 Incidents', color: '#B42318' },
      { key: 'responders', label: 'Rescue Teams / Responders', badge: '3 Teams', color: '#1F6F78' },
      { key: 'shelters', label: 'Relief Shelters', badge: '5 Camps', color: '#3B7A57' },
      { key: 'hospitals', label: 'Emergency Hospitals', badge: '3 Centers', color: '#B42318' },
      { key: 'roads', label: 'Blocked Roadways', badge: '3 Cutoffs', color: '#B54708' },
      { key: 'rainfall', label: 'Rainfall Intensity (Heat Overlay)', badge: 'Radar Mock', color: '#0F2A3D' },
    ];

    return (
      <div className={`bg-surface border border-app-border rounded-md p-3.5 space-y-3 w-full sm:w-64 text-xs select-none ${className}`}>
        <div className="flex items-center justify-between border-b border-app-border pb-2">
          <div className="flex items-center gap-1.5 font-semibold text-navy-ink uppercase text-[11px] tracking-wider">
            <LayersIcon className="w-3.5 h-3.5 text-teal-deep" />
            <span>Map Layers Panel</span>
          </div>
          <Badge variant="teal" size="sm">Admin</Badge>
        </div>

        <div className="space-y-1.5">
          {adminChecklist.map((item) => {
            const active = layers[item.key];
            return (
              <label
                key={item.key}
                className={`flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors ${
                  active ? 'bg-[#FAF9F6] border-app-border' : 'bg-surface border-transparent opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!active}
                    onChange={() => onToggleLayer && onToggleLayer(item.key)}
                    className="rounded border-app-border text-teal-deep focus:ring-teal-deep h-3.5 w-3.5"
                  />
                  <span className="font-medium text-navy-ink text-xs">{item.label}</span>
                </div>
                <span className="text-[10px] text-muted-text font-mono">{item.badge}</span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. RESPONDER VERSION: Compact operational legend toggles
  const responderToggles = [
    { key: 'sos', label: 'SOS Calls', color: '#B42318' },
    { key: 'responders', label: 'Rescue Units', color: '#1F6F78' },
    { key: 'zones', label: 'Flood Zones', color: '#B42318' },
    { key: 'roads', label: 'Blocked Roads', color: '#B54708' },
    { key: 'shelters', label: 'Shelters', color: '#3B7A57' },
    { key: 'hospitals', label: 'Hospitals', color: '#B42318' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {responderToggles.map((item) => {
        const active = layers[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggleLayer && onToggleLayer(item.key)}
            className={`px-2.5 py-1 rounded text-xs font-mono font-medium border flex items-center gap-1.5 transition-colors ${
              active
                ? 'bg-surface text-navy-ink border-app-border'
                : 'bg-app-bg text-muted-text border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Layers;
