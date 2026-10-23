import React, { useState } from 'react';
import { Facility } from '../types';
import { PlusCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '../lib/utils';

interface AddFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (facilityData: Partial<Facility>) => Promise<void>;
}

export const AddFacilityModal: React.FC<AddFacilityModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'seller' | 'buyer'>('seller');
  const [cluster, setCluster] = useState('Peenya');
  const [material, setMaterial] = useState('recycled_concrete_aggregate');
  const [volume, setVolume] = useState<number>(300);
  const [priceThreshold, setPriceThreshold] = useState<number>(550);
  const [hazardous, setHazardous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a facility name.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await onAdd({
        name: name.trim(),
        role,
        cluster,
        material,
        volume_tons_per_month: Number(volume) || 100,
        cost_floor_inr_per_ton: role === 'seller' ? Number(priceThreshold) : null,
        cost_ceiling_inr_per_ton: role === 'buyer' ? Number(priceThreshold) : null,
        hazardous,
      });

      onClose();
      // Reset form
      setName('');
      setVolume(300);
      setPriceThreshold(550);
      setHazardous(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to onboard facility.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-full p-0 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col gap-0 [&>button]:z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-orange-950/30 border-b border-orange-200/80 dark:border-orange-800/60 p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ea580c] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-orange-600 dark:text-orange-300" />
                <span>DYNAMIC ONBOARDING • KARNATAKA INDUSTRIAL NETWORK</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                Add Karnataka Industrial Facility
              </h2>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Facility / Legal Entity Name *
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. UltraTech Concrete Works, Peenya Plant #4"
              className="rounded-xl bg-muted/50"
            />
          </div>

          {/* Role & Cluster */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Symbiosis Role *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('seller');
                    if (priceThreshold > 700) setPriceThreshold(500);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    role === 'seller'
                      ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 shadow-2xs'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Byproduct Seller
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('buyer');
                    if (priceThreshold < 600) setPriceThreshold(800);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                    role === 'buyer'
                      ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 shadow-2xs'
                      : 'bg-card border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Off-taker (Buyer)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Karnataka Industrial Cluster *
              </label>
              <Select value={cluster} onValueChange={setCluster}>
                <SelectTrigger className="w-full rounded-xl bg-muted/50 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Peenya">Peenya Industrial Area (NH-48)</SelectItem>
                  <SelectItem value="Dobaspet">Dobaspet Industrial Area (Tumkur Rd)</SelectItem>
                  <SelectItem value="Bidadi">Bidadi Industrial Area (Mysore Rd)</SelectItem>
                  <SelectItem value="Whitefield">Whitefield / EPIP Zone</SelectItem>
                  <SelectItem value="Bommasandra">Bommasandra Industrial Area (Hosur Rd)</SelectItem>
                  <SelectItem value="Jigani">Jigani Industrial Estate</SelectItem>
                  <SelectItem value="Rajajinagar">Rajajinagar Industrial Suburb</SelectItem>
                  <SelectItem value="Veerasandra">Veerasandra Industrial Area</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Material Stream & Monthly Volume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Material Byproduct Stream *
              </label>
              <Select
                value={material}
                onValueChange={(val) => {
                  setMaterial(val);
                  if (val === 'chrome_sludge' || val === 'used_oil' || val === 'dye_sludge') {
                    setHazardous(true);
                  }
                }}
              >
                <SelectTrigger className="w-full rounded-xl bg-muted/50 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recycled_concrete_aggregate">Recycled Concrete Aggregate (C&D)</SelectItem>
                  <SelectItem value="fly_ash">Fly Ash (Thermal / Clinker)</SelectItem>
                  <SelectItem value="used_oil">Used Oil (Lube / Hydraulic)</SelectItem>
                  <SelectItem value="steel_slag">Steel Slag (Foundry Byproduct)</SelectItem>
                  <SelectItem value="plastic_scrap">Plastic Scrap (Post-Industrial)</SelectItem>
                  <SelectItem value="metal_scrap">Metal Scrap (Ferrous Shavings)</SelectItem>
                  <SelectItem value="chrome_sludge">Chrome Sludge (Electroplating)</SelectItem>
                  <SelectItem value="dye_sludge">Dye Sludge (Textile Effluent)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Monthly Available Volume (Tons) *
              </label>
              <Input
                type="number"
                min="10"
                max="10000"
                step="10"
                required
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="rounded-xl bg-muted/50 font-mono"
              />
            </div>
          </div>

          {/* Pricing Threshold & Hazardous Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                {role === 'seller' ? 'Minimum Acceptable Price (₹/ton)' : 'Maximum Ceiling Price (₹/ton)'} *
              </label>
              <Input
                type="number"
                min="50"
                max="10000"
                step="25"
                required
                value={priceThreshold}
                onChange={(e) => setPriceThreshold(Number(e.target.value))}
                className="rounded-xl bg-muted/50 font-mono"
              />
              <span className="text-[11px] text-muted-foreground/70 mt-1 block">
                {role === 'seller' ? 'Agent will not settle below this floor price.' : 'Agent will negotiate down from this ceiling price.'}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-border hover:bg-muted transition">
                <input
                  type="checkbox"
                  checked={hazardous}
                  onChange={(e) => setHazardous(e.target.checked)}
                  className="w-4 h-4 text-[#ff5d02] rounded border-border focus:ring-[#ff5d02]"
                />
                <div className="text-xs">
                  <span className="font-bold text-foreground block">Hazardous Waste Stream</span>
                  <span className="text-muted-foreground/70 text-[11px]">Enforces KSPCB Form 10 & GPS tracking</span>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 bg-muted rounded-2xl border border-border text-xs">
            <div className="text-[10px] uppercase font-mono font-bold text-muted-foreground/70 mb-1">
              Live Agent Model Profile Preview
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-foreground">
                {name || 'New Facility'} ({cluster})
              </span>
              <Badge className={cn('font-semibold', getMaterialBadgeStyles(material))}>
                {formatMaterialTitleCase(material)}
              </Badge>
              <span className="font-mono text-muted-foreground font-semibold">
                {volume} t/mo @ {role === 'seller' ? `≥ ₹${priceThreshold}/t` : `≤ ₹${priceThreshold}/t`}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="ghost" className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl shadow-md">
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary-foreground"></div>
                  <span>Onboarding Facility...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Onboard Facility</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
