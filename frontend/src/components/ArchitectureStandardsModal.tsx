import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface ArchitectureStandardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureStandardsModal: React.FC<ArchitectureStandardsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="architecture-standards-modal"
        className="w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <DialogHeader className="border-b border-border pb-5">
          <div className="flex items-center gap-2 text-[#ea580c]">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider font-mono">
              System Standards & Architecture Blueprint
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            Why this design & What's real vs. simulated
          </DialogTitle>
        </DialogHeader>

        {/* Section 1: Why this design */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Why this design</span>
            </h3>
            <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              100% Implemented & Verified
            </Badge>
          </div>

          <ul className="space-y-3 text-xs sm:text-sm text-muted-foreground">
            <li className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Hierarchical, not flat:</strong> The Regulatory Agent sits <em className="text-[#ea580c] not-italic font-bold">above</em> the negotiation layer and can veto an already-agreed deal and send it back — this models real KSPCB oversight of hazardous waste handling, not just a linear pipeline.
                <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                  Verified in App: Facility F01 (Sri Lakshmi Electroplaters) & F15 (Informal Metal Reclaimers) agree on price for toxic chrome sludge, but KSPCB agent VETOES the deal because the buyer lacks certified hazardous handler credentials under KSPCB Hazardous Waste Rules 2016.
                </div>
              </div>
            </li>

            <li className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Hybrid LLM + deterministic negotiation:</strong> The accept/reject/concession math is deterministic (so a live demo can never hang or wander in circles); the LLM is used to generate natural-language justification for each offer. This guarantees the negotiation always terminates within 5 rounds, either in a DEAL or an explicit NO_DEAL with a stated reason.
                <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                  Verified in App: Bilateral monotonic concession with private floor/ceiling bounds terminates in ≤5 rounds.
                </div>
              </div>
            </li>

            <li className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Auditability without needing real blockchain infrastructure:</strong> The Digital Waste Passport hash-chains each approved deal to the previous one via SHA-256, so any tampering with a past record would break the chain — the same core property blockchains provide, honestly scoped.
                <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                  Verified in App: Canonical SHA-256 hash chaining with prev_hash pointers and live ledger verification.
                </div>
              </div>
            </li>

            <li className="p-4 rounded-2xl bg-muted border border-border flex items-start gap-3.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-foreground">Simulated IoT sensor input:</strong> A facility's material-quality parameters (moisture/contamination) can be updated live via the dashboard, and the Facility Agent adjusts its own cost floor / usable volume in response before the next matching round.
                <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                  Verified in App: Live sliders & toggles update cost floors (15% reduction) or usable volume (-50%) dynamically.
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Section 2: What's real vs. simulated */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-bold text-foreground">
            What's real vs. simulated (stated upfront, on purpose)
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground border-b border-border">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider font-mono">Component</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider font-mono">Standard Specification</th>
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[#ea580c] font-mono">App Implementation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-card font-sans">
                <tr>
                  <td className="py-3 px-4 font-bold text-foreground">Karnataka Industrial Entities</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    Real entities across Peenya, Bidadi, Dobaspet, Harohalli, Tumkur, and Bellary/Toranagallu
                  </td>
                  <td className="py-3 px-4 text-[#ea580c] font-mono font-medium">
                    Integrated: Rock Crystals (C&D recycling), VIWA Eco-Club (Peenya), JSW Steel Vijayanagar (blast slag), Ultratech Rajashree, Toyota Kirloskar Bidadi, BEML, Biocon.
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-foreground">CSTEP 2022 Clean Air Factors</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    Quantified particulate matter & sulfur dioxide avoidance benchmarks
                  </td>
                  <td className="py-3 px-4 text-[#ea580c] font-mono font-medium">
                    Integrated: 4.8 kg PM10 avoided / ton C&D concrete recycling, 1.2 kg PM10 avoided / ton fly ash clinker substitution.
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-foreground">Negotiation logic</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    Real, running Monotonic Concession Protocol with genuine private constraints
                  </td>
                  <td className="py-3 px-4 text-[#ea580c] font-mono font-medium">
                    Active: Bilateral step concessions, private floors/ceilings, strict 5-round deadline cap.
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-foreground">KSPCB compliance rules</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    Regulatory ruleset referencing KSPCB Hazardous Rules & C&D Waste Management Rules 2016
                  </td>
                  <td className="py-3 px-4 text-[#ea580c] font-mono font-medium">
                    Active: Explicit citations for KSPCB/MoEFCC TSDF manifests and C&D recycling guidelines.
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-4 font-bold text-foreground">Waste Passport ledger</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    Real hash-chaining logic, stored as local JSON files
                  </td>
                  <td className="py-3 px-4 text-[#ea580c] font-mono font-medium">
                    Active: Canonical SHA-256 chaining, persistent disk storage in data/waste_passports.json.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="!mx-0 !mb-0 !rounded-none !border-0 !bg-transparent !p-0 pt-3 border-t border-border flex-row items-center justify-between text-xs text-muted-foreground/70">
          <div>Built for Karnataka circular economy industrial symbiosis</div>
          <Button onClick={onClose} className="font-bold rounded-xl shadow-xs">
            Close Standards View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
