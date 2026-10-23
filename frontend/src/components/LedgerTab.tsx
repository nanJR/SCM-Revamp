import React, { useState, useEffect, useRef } from 'react';
import { DigitalWastePassport, LedgerVerification } from '../types';
import { ContractModal } from './ContractModal';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';
import {
  ShieldCheck,
  Hash,
  Link as LinkIcon,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  Check,
  Clock,
  Lock,
  FileText,
  Truck,
  Compass,
  ArrowRight,
  X,
} from 'lucide-react';

interface LedgerTabProps {
  passports: DigitalWastePassport[];
  verification: LedgerVerification | null;
  onVerify: () => Promise<void>;
  verifying: boolean;
  hasUserVerified: boolean;
  onNavigateMatchDeals?: () => void;
}

export const LedgerTab: React.FC<LedgerTabProps> = ({
  passports,
  verification,
  onVerify,
  verifying,
  hasUserVerified,
  onNavigateMatchDeals,
}) => {
  const [viewJsonIndex, setViewJsonIndex] = useState<number | null>(null);
  const [selectedContractPassport, setSelectedContractPassport] = useState<DigitalWastePassport | null>(null);
  const [showMatchWarningModal, setShowMatchWarningModal] = useState(false);

  const handleVerifyClick = async () => {
    if (passports.length === 0) {
      setShowMatchWarningModal(true);
      return;
    }
    await onVerify();
  };

  const isVerifiedByClick = Boolean(hasUserVerified && passports.length > 0 && verification?.valid);

  const getDisplayMessage = () => {
    if (!verification) return '';
    let msg = verification.message;
    // Remove "Chain Valid:" / "Chain valid:" before "0 Digital..." unless deals matched
    if (passports.length === 0) {
      msg = msg.replace(/^chain\s*valid:\s*/i, '');
    }
    return msg;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <section className="bg-card rounded-2xl sm:rounded-3xl border border-orange-200/80 dark:border-orange-800/60 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
              CERTIFIED WASTE PASSPORTS
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>Digital Waste Passports & Audit Log</span>
            </h1>
            <p id="ledger-header-desc" className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              Every approved industrial deal receives a certified digital waste passport.
              <span className="block mt-0.5 sm:mt-1">
                Records are linked together to prevent tampering and guarantee compliance with Karnataka environmental laws.
              </span>
            </p>
          </div>

          <button
            id="verify-ledger-btn"
            onClick={handleVerifyClick}
            disabled={verifying}
            className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold rounded-xl bg-muted hover:bg-stone-200 text-foreground border border-border transition shrink-0 active:scale-95 disabled:opacity-50"
          >
            <Check className="w-4 h-4 text-[#ea580c] stroke-[2.5]" />
            {verifying ? 'Verifying Records...' : 'Verify Record Chain'}
          </button>
        </div>

        {/* Verification Status Banner */}
        {verification && (
          <div
            id="ledger-verification-banner"
            className={`mt-6 p-4 rounded-2xl border text-xs flex items-center justify-between gap-4 ${
              !verification.valid
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-300'
                : isVerifiedByClick
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                : 'bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800/60 text-orange-950 dark:text-orange-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {!verification.valid ? (
                <div id="ledger-verification-icon-box" className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              ) : isVerifiedByClick ? (
                <div id="ledger-verification-icon-box" className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div id="ledger-verification-icon-box" className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
              )}
              <div>
                <div id="ledger-verification-status-title" className="font-bold text-sm">
                  {!verification.valid
                    ? 'Ledger Integrity Warning'
                    : isVerifiedByClick
                    ? 'Cryptographic Integrity Confirmed'
                    : 'Awaiting Cryptographic Integrity Confirmation'}
                </div>
                <div id="ledger-verification-status-message" className="text-xs opacity-90">
                  {getDisplayMessage()}
                </div>
              </div>
            </div>
            <span
              id="ledger-verification-badge"
              className={`text-xs font-mono font-bold px-3 py-1 rounded-lg bg-card border shadow-2xs ${
                !verification.valid
                  ? 'border-rose-300 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
                  : isVerifiedByClick
                  ? 'border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'border-orange-300 dark:border-orange-800/60 text-orange-800 dark:text-orange-300'
              }`}
            >
              {isVerifiedByClick
                ? `${passports.length} Verified Blocks`
                : `${passports.length} Unverified Blocks`}
            </span>
          </div>
        )}
      </section>

      {/* Passports List */}
      {passports.length === 0 ? (
        <div id="empty-passports-state" className="text-center py-20 px-4 rounded-3xl border border-dashed border-orange-200 dark:border-orange-800/60 bg-card">
          <Hash className="w-12 h-12 mx-auto text-orange-300 mb-3" />
          <h3 id="no-passports-heading" className="text-base font-bold text-foreground">No Passports Issued Yet</h3>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Immutable Waste Blocks ({passports.length})
            </h2>
            <span className="text-xs font-mono text-muted-foreground/70">
              Algorithm: SHA-256 Chained
            </span>
          </div>

          {passports.map((p, idx) => {
            const isGenesis = p.prev_hash === '0'.repeat(64);
            const isJsonOpen = viewJsonIndex === idx;

            return (
              <div
                key={p.record_hash}
                className="bg-card rounded-2xl sm:rounded-3xl border border-orange-200/80 dark:border-orange-800/60 p-6 shadow-xs space-y-4 transition"
              >
                {/* Block Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-3.5 gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] border border-orange-200 dark:border-orange-800/60">
                      Block #{idx + 1}
                    </span>
                    <span className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>Waste Passport</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getMaterialBadgeStyles(p.deal.material)}`}>
                        {formatMaterialTitleCase(p.deal.material)}
                      </span>
                    </span>
                    {isGenesis && (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold uppercase">
                        Genesis Block
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground/70 font-mono">
                    Timestamp: {new Date(p.issued_at).toLocaleString()}
                  </div>
                </div>

                {/* Deal Context Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/70 p-3.5 rounded-2xl border border-border">
                  <div>
                    <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase tracking-wider font-mono">Seller ID</span>
                    <span className="font-bold text-foreground font-mono">{p.deal.seller_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase tracking-wider font-mono">Buyer ID</span>
                    <span className="font-bold text-foreground font-mono">{p.deal.buyer_id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase tracking-wider font-mono">Agreed Volume</span>
                    <span className="font-bold text-foreground font-mono">{p.deal.volume_tons} tons/mo</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase tracking-wider font-mono">Final Price</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono text-sm">
                      ₹{p.deal.agreed_price_per_ton}/ton
                    </span>
                  </div>
                </div>

                {/* Statutory PO & E-Way Bill Badges if present */}
                {(p.deal.contract || p.deal.eway_bill) && (
                  <div className="p-3.5 rounded-2xl bg-orange-50/40 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      {p.deal.contract && (
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <FileText className="w-4 h-4 text-[#ea580c]" />
                          <span className="text-muted-foreground/70">PO:</span>
                          <span className="font-bold text-foreground">{p.deal.contract.po_number}</span>
                        </div>
                      )}
                      {p.deal.eway_bill && (
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <Truck className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                          <span className="text-muted-foreground/70">E-Way Bill:</span>
                          <span className="font-bold text-foreground">{p.deal.eway_bill.eway_bill_number}</span>
                        </div>
                      )}
                      {p.deal.hazard_manifest && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800/60">
                          Form 10 Hazardous Manifest
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setViewJsonIndex(isJsonOpen ? null : idx)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border px-3.5 py-1.5 rounded-xl font-semibold transition shrink-0 self-start sm:self-auto shadow-2xs"
                    >
                      <FileCode className="w-3.5 h-3.5 text-[#ea580c]" />
                      <span>{isJsonOpen ? 'Hide Block Payload' : 'Inspect Block Payload'}</span>
                    </button>
                  </div>
                )}

                {/* Hash Chain Links */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-muted border border-border flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LinkIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300 shrink-0" />
                      <span className="font-medium text-muted-foreground/70">Previous Block Hash:</span>
                    </div>
                    <span className="text-muted-foreground break-all text-[11px]">
                      {p.prev_hash}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[#ea580c]">
                      <Hash className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold">Minted Record Hash (SHA-256):</span>
                    </div>
                    <span className="text-[#ea580c] font-bold break-all text-[11px]">
                      {p.record_hash}
                    </span>
                  </div>
                </div>

                {/* Footer with KSPCB Status and Legal Documents button */}
                <div className="flex items-center justify-between pt-1">
                  <div className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                    <span>KSPCB Status: </span>
                    <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">Approved & Cryptographically Signed</strong>
                  </div>

                  {(p.deal.contract || p.deal.eway_bill) && (
                    <button
                      onClick={() => setSelectedContractPassport(p)}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-orange-400" />
                      <span>Inspect Legal Documents</span>
                    </button>
                  )}
                </div>

                {/* Raw JSON inspection view */}
                {isJsonOpen && (
                  <div className="mt-3 p-4 rounded-xl bg-stone-900 border border-stone-800 overflow-x-auto text-[11px] font-mono text-emerald-400">
                    <pre>{JSON.stringify(p, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contract & E-Way Bill Modal */}
      {selectedContractPassport && (
        <ContractModal
          isOpen={Boolean(selectedContractPassport)}
          onClose={() => setSelectedContractPassport(null)}
          contract={selectedContractPassport.deal.contract}
          ewayBill={selectedContractPassport.deal.eway_bill}
          hazardManifest={selectedContractPassport.deal.hazard_manifest}
        />
      )}

      {/* Warning Popup: Verify Clicked Before Deals are Matched */}
      {showMatchWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            id="match-deals-required-modal"
            className="bg-card rounded-3xl max-w-md w-full p-6 shadow-2xl border border-orange-200 dark:border-orange-800/60 text-left relative transform transition-all"
          >
            <button
              onClick={() => setShowMatchWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-xs font-black tracking-wider text-[#ea580c] uppercase mb-1 font-mono">
              ACTION REQUIRED
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              Please Match Deals First
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
              No industrial trade deals have been matched or approved yet, so there are no cryptographic blocks in the chain to verify. Please head to <strong>Match Deals</strong> to simulate transactions and generate verified digital waste passports before verifying the record chain.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              {onNavigateMatchDeals && (
                <button
                  id="modal-goto-match-deals-btn"
                  onClick={() => {
                    setShowMatchWarningModal(false);
                    onNavigateMatchDeals();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 bg-[#ff5d02] hover:bg-[#e04f00] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <span>Head to Match Deals</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                id="modal-dismiss-warning-btn"
                onClick={() => setShowMatchWarningModal(false)}
                className="w-full sm:w-auto py-2.5 px-4 bg-muted hover:bg-stone-200 text-muted-foreground font-semibold text-xs rounded-xl transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
