import React from 'react';
import { AlertCircle, CheckCircle2, ShieldCheck, Scale, Compass, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

interface HonestLimitationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HonestLimitationsModal: React.FC<HonestLimitationsModalProps> = ({ isOpen, onClose }) => {
  const limitations = [
    {
      dimension: 'Material Chemistry Compatibility',
      icon: Scale,
      currentState: 'Material matching is categorical (e.g., recycled concrete aggregate, fly ash, used oil).',
      productionReality:
        'In reality, two batches of fly ash (Class F vs Class C) or steel slag have varying LOI (loss on ignition), unburnt carbon, silica ratio, and heavy metal leachability. A chemical specification sheet parser (XRF/XRD lab analysis) would be required.',
      impact: 'Categorical matching verifies bulk compatibility, but enterprise deployments require continuous chemical batch testing.',
    },
    {
      dimension: 'Transport Routing',
      icon: Compass,
      currentState: 'Straight-line geodesic distance (Haversine × 1.25 road circuity factor).',
      productionReality:
        'Heavy commercial vehicles in Bengaluru face NICE Road toll gates, BBMP peak-hour commercial vehicle restrictions, and bridge weight load limits. In production, an enterprise logistics dispatch API with freight routing parameters would calculate transport corridors.',
      impact: 'Straight-line geodesic distance gives an initial distance estimate, but commercial freight carriers must route around city entry curbs and toll plazas.',
    },
    {
      dimension: 'Contractual Execution',
      icon: FileText,
      currentState: 'Mints a Digital Waste Passport JSON payload with SHA-256 hash chaining.',
      productionReality:
        'Real B2B transactions require purchase order (PO) generation, GST invoice compliance (E-way bills via Karnataka Commercial Taxes Portal), and binding escrow/payment settlement.',
      impact: 'The digital passport proves data authenticity and environmental clearance, but enterprise ERP and tax invoicing systems handle payment settlement.',
    },
    {
      dimension: 'Regulatory Data Source',
      icon: ShieldCheck,
      currentState: 'Embedded ruleset referencing KSPCB CFO consents and C&D Waste Rules 2016.',
      productionReality:
        "Real KSPCB integration would need live API polling against Karnataka's XGN (Extended Green Node) portal to check real-time consent validity dates.",
      impact: 'Rules are faithfully modeled on actual Karnataka pollution control regulations, but live government databases require official API credentials.',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="honest-limitations-modal"
        className="w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2 text-[#ea580c]">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Honest Transparency & Production Reality
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            Where the App Falls Short of Production (What's Simulated)
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            To be completely transparent, here is where this interactive working system diverges from a live enterprise rollout.
          </DialogDescription>
        </DialogHeader>

        {/* Limitations Table */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground border-b border-border font-mono text-xs">
                <th className="py-3.5 px-4 font-bold uppercase w-1/4">Dimension</th>
                <th className="py-3.5 px-4 font-bold uppercase w-1/3 text-muted-foreground">Current App State</th>
                <th className="py-3.5 px-4 font-bold uppercase w-5/12 text-[#ea580c]">Real-World Production Reality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-card">
              {limitations.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <tr key={idx} className="hover:bg-orange-50/30 dark:hover:bg-orange-950/40 transition">
                    <td className="py-3.5 px-4 font-bold text-foreground align-top">
                      <div className="flex items-start gap-2">
                        <IconComponent className="w-4 h-4 text-orange-600 dark:text-orange-300 shrink-0 mt-0.5" />
                        <span>{item.dimension}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground align-top leading-relaxed text-xs">
                      <div className="p-2 rounded-lg bg-muted border border-border">
                        {item.currentState}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground align-top leading-relaxed text-xs">
                      <div className="p-2 rounded-lg bg-orange-50/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-foreground font-medium">
                        {item.productionReality}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Note */}
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-300 leading-relaxed flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">What IS completely functional in this app:</strong> Deterministic price negotiations that resolve within 5 rounds without hanging, dynamic adjustments when you change moisture and contamination readings, official KSPCB hazardous waste veto logic, and cryptographic SHA-256 chaining that proves records cannot be modified after the fact.
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="!mx-0 !mb-0 !rounded-none !border-0 !bg-transparent !p-0 pt-2 border-t border-border flex-row items-center justify-between text-xs text-muted-foreground/70">
          <span>SCM • Swalpa Circular Maadi</span>
          <Button onClick={onClose} className="font-bold rounded-xl">
            Understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
