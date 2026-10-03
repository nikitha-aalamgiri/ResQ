import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  Package,
  PlusCircle,
  Truck,
  Droplets,
  LifeBuoy,
  HeartPulse,
  Wrench,
  MapPin,
  CheckCircle2,
  Clock,
  RotateCcw
} from 'lucide-react';

export const ResponderResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResources = async () => {
    try {
      const res = await apiFetch('/resources');
      if (res && res.data) {
        setResources(res.data);
      }
    } catch (err) {
      console.warn('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'water_rescue':
        return <LifeBuoy className="w-5 h-5 text-teal-deep" />;
      case 'transport':
      case 'vehicles':
        return <Truck className="w-5 h-5 text-teal-deep" />;
      case 'potable_water':
        return <Droplets className="w-5 h-5 text-[#175CD3]" />;
      case 'medical':
        return <HeartPulse className="w-5 h-5 text-[#B42318]" />;
      default:
        return <Wrench className="w-5 h-5 text-teal-deep" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-surface p-5 rounded-md border border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-muted-text">Field Inventory</span>
            <Badge variant="teal" size="sm">Active Logistics</Badge>
          </div>
          <h1 className="text-xl font-bold font-mono text-navy-ink mt-1">
            Tactical Gear & Relief Resources
          </h1>
          <p className="text-xs text-muted-text mt-0.5">
            Monitor available rescue boats, water purification units, vehicles, and medical kits across depots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RotateCcw}
            onClick={fetchResources}
          >
            Refresh
          </Button>
          <Link to="/responder/support">
            <Button variant="primary" size="sm" icon={PlusCircle}>
              Request Support / Resources
            </Button>
          </Link>
        </div>
      </div>

      {/* Resources Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={Package}
              title="No resources found"
              description="Inventory list is currently refreshing."
            />
          </div>
        ) : (
          resources.map((res) => (
            <Card key={res.id} className="border-app-border hover:border-teal-deep/40 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 rounded bg-[#FAF9F6] border border-app-border">
                    {getCategoryIcon(res.category)}
                  </div>
                  <Badge variant={res.status === 'available' ? 'low' : 'medium'} size="sm">
                    {res.status === 'available' ? 'Available' : 'In Transit'}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-navy-ink font-mono">{res.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-bold font-mono text-teal-deep">{res.quantity}</span>
                    <span className="text-xs text-muted-text">Units in circulation</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-app-border text-[11px] text-muted-text space-y-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-teal-deep shrink-0" />
                    <span className="truncate">{res.location}</span>
                  </div>
                  <div className="truncate">
                    Provider: <span className="font-semibold text-navy-ink">{res.provider}</span>
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
