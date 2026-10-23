import React from 'react';
import { Carrier } from '../types';
import { getVehicleBadgeStyles } from '../utils/materials';
import { Truck, ShieldCheck, ShieldAlert, MapPin, Package } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface FleetTabProps {
  carriers: Record<string, Carrier>;
}

export const FleetTab: React.FC<FleetTabProps> = ({ carriers }) => {
  const carrierList = Object.values(carriers);

  return (
    <div className="space-y-6">
      {/* Top Banner Box */}
      <Card className="rounded-2xl sm:rounded-3xl border-orange-200/80 dark:border-orange-800/60 p-5 sm:p-6 shadow-xs gap-0">
        <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
          THE TRUCKER: LOGISTICS/CARRIER NEGOTIATION AGENT
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
          Registered Karnataka Logistics Fleet
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
          After a material price deal is struck, the Logistics Agent selects the most cost-efficient eligible carrier
          (matching vehicle capacity and, for hazardous cargo, a valid hazmat transport license) and negotiates a
          freight rate against the buyer's remaining budget headroom — using the same monotonic-concession protocol
          as material price negotiation.
        </p>
      </Card>

      {/* Carrier Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {carrierList.map((c) => (
          <Card
            key={c.id}
            className="rounded-2xl p-5 shadow-xs hover:shadow-sm transition space-y-3 gap-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              {c.hazmat_transport_license ? (
                <Badge className="gap-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  HAZMAT LICENSED
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 font-bold">
                  <ShieldAlert className="w-3 h-3" />
                  STANDARD FLEET
                </Badge>
              )}
            </div>

            <div>
              <h3 className="font-bold text-foreground text-sm">{c.name}</h3>
              <div className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                <span>{c.cluster} Base Depot</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('font-semibold shadow-2xs', getVehicleBadgeStyles(c.vehicle_type))}>
                {c.vehicle_type}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
              <Package className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>
                Capacity: <strong className="text-foreground font-mono">{c.capacity_tons} tons</strong>
              </span>
            </div>
          </Card>
        ))}
      </div>

      {carrierList.length === 0 && (
        <div className="text-center py-20 px-4 rounded-3xl border border-dashed border-orange-200 dark:border-orange-800/60 bg-card">
          <Truck className="w-12 h-12 mx-auto text-orange-300 mb-3" />
          <h3 className="text-base font-bold text-foreground">No Carriers Registered</h3>
        </div>
      )}
    </div>
  );
};
