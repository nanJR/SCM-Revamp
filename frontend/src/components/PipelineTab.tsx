import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PipelineItemResult } from '../types';
import { ContractModal } from './ContractModal';
import { CarbonOffsetCounter } from './CarbonOffsetCounter';
import { formatMaterialTitleCase, getMaterialBadgeStyles } from '../utils/materials';
import {
  Play,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  Truck,
  Hash,
  Scale,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wind,
  ShieldCheck,
  Building2,
  FileText,
  FileCheck2,
  Compass,
  Clock,
  Gauge,
  BarChart3,
} from 'lucide-react';

interface PipelineTabProps {
  results: PipelineItemResult[];
  onRunPipeline: () => Promise<void>;
  running: boolean;
  onSelectTranscript: (index: number) => void;
  onViewPassport: () => void;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  results,
  onRunPipeline,
  running,
  onSelectTranscript,
  onViewPassport,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [selectedContractItem, setSelectedContractItem] = useState<PipelineItemResult | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const dealCount = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED'
  ).length;
  const vetoCount = results.filter((r) => r.regulatory?.decision === 'VETOED').length;
  const noDealCount = results.filter((r) => r.negotiation.outcome === 'NO_DEAL').length;
  const noCarrierCount = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.logistics_deal?.outcome === 'NO_CARRIER'
  ).length;
  
  const totalCo2Saved = results.reduce((acc, r) => {
    if (r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED') {
      return acc + (r.negotiation.logistics.net_co2_impact_kg || 0);
    }
    return acc;
  }, 0);

  const totalPm10Saved = results.reduce((acc, r) => {
    if (r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED') {
      return acc + (r.negotiation.logistics.pm10_avoided_kg || 0);
    }
    return acc;
  }, 0);

  // Negotiation Fairness & Efficiency Audit: for every negotiated price deal,
  // score how balanced the settlement was between the seller's private floor
  // and buyer's private ceiling (50 = perfectly split the difference, 0/100 =
  // one side got nothing), plus how many rounds it took to converge.
  const priceDeals = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.negotiation.final_price_inr_per_ton !== null
  );
  const fairnessAudit = priceDeals.map((r) => {
    const floor = r.seller.cost_floor_inr_per_ton ?? 0;
    const ceiling = r.buyer.cost_ceiling_inr_per_ton ?? 0;
    const price = r.negotiation.final_price_inr_per_ton as number;
    const positionPct = ceiling !== floor ? ((price - floor) / (ceiling - floor)) * 100 : 50;
    const balanceScore = Math.max(0, 100 - Math.abs(positionPct - 50) * 2);
    const totalRounds = r.negotiation.rounds.length + (r.logistics_deal?.rounds.length || 0);
    return {
      label: `${r.seller.name.slice(0, 18)} ↔ ${r.buyer.name.slice(0, 18)}`,
      balanceScore,
      totalRounds,
    };
  });
  const avgBalanceScore = fairnessAudit.length
    ? fairnessAudit.reduce((acc, f) => acc + f.balanceScore, 0) / fairnessAudit.length
    : 0;
  const avgRounds = fairnessAudit.length
    ? fairnessAudit.reduce((acc, f) => acc + f.totalRounds, 0) / fairnessAudit.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Centralized Large Control Banner Card */}
      <section className="bg-card rounded-3xl border border-orange-200/90 dark:border-orange-800/60 p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="inline-block text-xs font-extrabold tracking-wider text-[#ea580c] uppercase font-mono bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 px-3.5 py-1 rounded-full">
            CIRCULAR DEAL MATCHMAKER
          </div>
          
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">
            Match Factories & Negotiate Circular Byproduct Deals
          </h1>
          
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Finds factories within 60 km that can reuse each other's byproducts, negotiates a fair price in up to 5 steps, checks KSPCB environmental rules, and generates certified digital waste passports.
          </p>

          <div className="pt-3 flex justify-center">
            <button
              id="run-pipeline-btn"
              onClick={onRunPipeline}
              disabled={running}
              className="bg-[#ff5d02] hover:bg-[#e04f00] text-white font-bold px-8 py-4 rounded-2xl shadow-md hover:shadow-lg transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 text-base sm:text-lg"
            >
              <Play className={`w-5 h-5 ${running ? 'animate-spin' : ''}`} />
              <span>{running ? 'Finding Matches & Negotiating...' : 'Find Matches & Run Deals'}</span>
            </button>
          </div>
        </div>

        {/* Live Step Progress when Running */}
        {running && (
          <div className="mt-8 p-5 rounded-2xl bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs sm:text-sm text-muted-foreground animate-pulse space-y-4 max-w-2xl mx-auto text-left">
            <div className="flex items-center gap-2 text-[#ea580c] font-bold">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Matching factory pairs and negotiating fair deal prices...</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-card border border-orange-200 dark:border-orange-800/60 font-medium">
                1. Pair nearby factories within 60 km
              </div>
              <div className="p-3 rounded-xl bg-card border border-orange-200 dark:border-orange-800/60 font-medium">
                2. Negotiate fair price (up to 5 rounds)
              </div>
              <div className="p-3 rounded-xl bg-card border border-orange-200 dark:border-orange-800/60 font-medium">
                3. Check KSPCB pollution rules & permits
              </div>
              <div className="p-3 rounded-xl bg-card border border-orange-200 dark:border-orange-800/60 font-medium">
                4. Issue certified digital waste passport
              </div>
            </div>
          </div>
        )}
      </section>

      {/* KPI Stats Row & Pairings/Outcomes - Visible ONLY after running deals */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="bg-card border border-orange-200/80 dark:border-orange-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wide font-mono">Pairs Evaluated</div>
              <div className="text-2xl font-black text-foreground mt-1">{results.length}</div>
              <div className="text-[10px] text-muted-foreground/70">Within ≤60km cluster</div>
            </div>

            <div className="bg-card border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide font-mono">Deals Approved</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-300 mt-1">{dealCount}</div>
              <div className="text-[10px] text-muted-foreground/70">KSPCB compliant</div>
            </div>

            <div className="bg-card border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide font-mono">Vetoed / Blocked</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-300 mt-1">{vetoCount}</div>
              <div className="text-[10px] text-muted-foreground/70">KSPCB rule or capacity audit</div>
            </div>

            <div className="bg-card border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide font-mono">Price Gap (No Deal)</div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-300 mt-1">{noDealCount}</div>
              <div className="text-[10px] text-muted-foreground/70">Floor &gt; Ceiling</div>
            </div>

            <div className="bg-card border border-orange-300 dark:border-orange-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide font-mono">No Carrier</div>
              <div className="text-2xl font-black text-orange-600 dark:text-orange-300 mt-1">{noCarrierCount}</div>
              <div className="text-[10px] text-muted-foreground/70">Freight budget/capacity gap</div>
            </div>

            <div className="bg-card border border-orange-200 dark:border-orange-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-[#ea580c] uppercase tracking-wide font-mono">Net CO2 Offset</div>
              <div className="text-2xl font-black text-[#ea580c] mt-1 font-mono">{(totalCo2Saved / 1000).toFixed(1)} t</div>
              <div className="text-[10px] text-muted-foreground/70">Virgin extraction avoided</div>
            </div>

            <div className="bg-card border border-cyan-200 dark:border-cyan-800/60 rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase tracking-wide font-mono">CSTEP PM10 Avoided</div>
              <div className="text-2xl font-black text-cyan-700 dark:text-cyan-300 mt-1 font-mono">{(totalPm10Saved).toFixed(0)} kg</div>
              <div className="text-[10px] text-muted-foreground/70">Quarrying & clinker dust</div>
            </div>
          </div>

          {/* Real-time Carbon & Resource Offset Counter */}
          <CarbonOffsetCounter results={results} />

          {/* Negotiation Fairness & Efficiency Audit */}
          {fairnessAudit.length > 0 && (
            <section className="bg-card rounded-2xl sm:rounded-3xl border border-orange-200/80 dark:border-orange-800/60 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-[11px] font-extrabold tracking-wider text-[#ea580c] uppercase mb-1 font-mono flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    NEGOTIATION FAIRNESS & EFFICIENCY AUDIT
                  </div>
                  <p className="text-xs text-muted-foreground max-w-2xl">
                    Scores each settled price against the seller's floor and buyer's ceiling (100 = split exactly
                    down the middle) and how many rounds the protocol took to converge — an independent benchmark
                    of the Monotonic Concession Protocol's own fairness.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60">
                    <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase font-mono">Avg. Balance</div>
                    <div className="text-xl font-black text-[#ea580c]">{avgBalanceScore.toFixed(0)}/100</div>
                  </div>
                  <div className="text-center px-4 py-2 rounded-xl bg-muted border border-border">
                    <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase font-mono">Avg. Rounds</div>
                    <div className="text-xl font-black text-foreground">{avgRounds.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {fairnessAudit.map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-muted border border-border text-xs">
                    <div className="font-semibold text-foreground truncate">{f.label}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground/70">
                        <BarChart3 className="w-3 h-3" />
                        <span>{f.totalRounds} rounds</span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          f.balanceScore >= 70 ? 'text-emerald-700 dark:text-emerald-300' : f.balanceScore >= 40 ? 'text-amber-700 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {f.balanceScore.toFixed(0)}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Candidate Pair Results List */}
          <section className="space-y-4">
            <div className="text-center py-2">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                Evaluated Industrial Pairings & Outcomes ({results.length})
              </h2>
              <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">
                Autonomous Monotonic Concession Protocol
              </p>
            </div>

            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {results.map((r, idx) => {
                  const outcome = r.negotiation.outcome;
                  const regDecision = r.regulatory?.decision;

                  let statusType: 'deal' | 'vetoed' | 'nodeal' | 'no_carrier' = 'nodeal';
                  if (outcome === 'DEAL') {
                    if (r.logistics_deal?.outcome === 'NO_CARRIER') {
                      statusType = 'no_carrier';
                    } else {
                      statusType = regDecision === 'VETOED' ? 'vetoed' : 'deal';
                    }
                  }

                  const isExpanded = expandedIndex === idx;

                  return (
                    <motion.div
                      key={`${r.seller.id}-${r.buyer.id}-${idx}`}
                      initial={{ opacity: 0, y: 14, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.28, delay: idx * 0.04 }}
                      className={`rounded-2xl border transition bg-card shadow-xs overflow-hidden ${
                        statusType === 'deal'
                          ? 'border-emerald-300 dark:border-emerald-800/60 ring-1 ring-emerald-100 dark:ring-emerald-800/40'
                          : statusType === 'vetoed'
                          ? 'border-amber-300 dark:border-amber-800/60 ring-1 ring-amber-100 dark:ring-amber-800/40'
                          : statusType === 'no_carrier'
                          ? 'border-orange-300 dark:border-orange-800/60 ring-1 ring-orange-100 dark:ring-orange-800/40'
                          : 'border-border'
                      }`}
                    >
                {/* Header / Summary Bar */}
                <div
                  onClick={() => toggleExpand(idx)}
                  className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-orange-50/30 dark:hover:bg-orange-950/40 transition select-none"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="shrink-0">
                      {statusType === 'deal' && (
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                      {statusType === 'vetoed' && (
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                      )}
                      {statusType === 'nodeal' && (
                        <div className="w-10 h-10 rounded-xl bg-muted text-muted-foreground/70 flex items-center justify-center">
                          <XCircle className="w-5 h-5" />
                        </div>
                      )}
                      {statusType === 'no_carrier' && (
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 flex items-center justify-center">
                          <Truck className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{r.seller.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span className="text-sm font-bold text-foreground">{r.buyer.name}</span>
                        <span
                          id={`pipeline-material-tag-${idx}`}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border shadow-2xs ${getMaterialBadgeStyles(
                            r.match.material
                          )}`}
                        >
                          {formatMaterialTitleCase(r.match.material)}
                        </span>
                        {r.seller.hazardous && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/60">
                            Hazardous
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                        <span>Route: {r.seller.cluster} → {r.buyer.cluster} ({r.match.route.distance_km} km)</span>
                        <span>•</span>
                        <span>Trade Vol: {r.negotiation.volume_tons} t/mo</span>
                        {statusType === 'deal' && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 dark:text-emerald-300 font-bold font-mono">
                              Final Price: ₹{r.negotiation.final_price_inr_per_ton}/ton
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center">
                    <span
                      className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                        statusType === 'deal'
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60'
                          : statusType === 'vetoed'
                          ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                          : statusType === 'no_carrier'
                          ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-800/60'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {statusType === 'deal'
                        ? 'APPROVED DEAL'
                        : statusType === 'vetoed'
                        ? r.regulatory?.rule_applied?.includes('Auditor Agent')
                          ? 'BLOCKED (ALLOCATION)'
                          : 'VETOED (KSPCB)'
                        : statusType === 'no_carrier'
                        ? 'NO CARRIER AVAILABLE'
                        : 'NO DEAL'}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground/70" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/70" />}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="p-5 border-t border-border bg-muted/50 space-y-4 overflow-hidden"
                    >
                      {/* Matchmaker Assessment */}
                    {r.match.justification && (
                      <div className="text-xs text-muted-foreground bg-card p-3.5 rounded-xl border border-border leading-relaxed">
                        <span className="font-bold text-[#ea580c]">Matchmaker Spatial Assessment: </span>
                        {r.match.justification}
                      </div>
                    )}

                    {/* Limitation 1: Quality & Lab Assay Tolerance Verification */}
                    {r.match.quality_check && r.match.quality_check.assay_certificate && (
                      <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4 text-orange-600 dark:text-orange-300" />
                            <span>Material Chemistry & NABL Lab Assay: {r.match.quality_check.assay_certificate.overall_grade}</span>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {r.match.quality_check.assay_certificate.certificate_id} ({r.match.quality_check.assay_certificate.lab_name})
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          {r.match.quality_check.assay_certificate.parameters.map((p) => (
                            <div key={p.name} className="p-2 rounded-lg bg-muted border border-border">
                              <span className="text-muted-foreground/70 block text-[10px] truncate">{p.name}</span>
                              <span className="font-bold font-mono text-foreground">
                                {p.value} {p.unit}
                              </span>
                              <span className="text-[9px] text-muted-foreground/70 block truncate">{p.test_standard}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border">
                          <span>{r.match.quality_check.technical_note}</span>
                          {r.negotiation.quality_adjustment_applied ? (
                            <span className="text-amber-700 dark:text-amber-300 font-bold font-mono">
                              -{r.negotiation.quality_adjustment_applied}% Quality Haircut Deducted
                            </span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold font-mono">100% Quality Spec Cleared</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Limitation 2: Road Logistics Corridor with Tolls and BBMP Ban */}
                    {r.negotiation.logistics.corridor && (
                      <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                            <span>Road Freight Corridor: {r.negotiation.logistics.corridor.corridor_name}</span>
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-bold">
                            Window: {r.negotiation.logistics.corridor.recommended_dispatch_window}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                          <div className="p-2.5 rounded-lg bg-muted border border-border">
                            <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase font-mono">Corridor Highway</span>
                            <span className="font-bold text-foreground truncate block">
                              {r.negotiation.logistics.corridor.highway_number}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 block">Circuity: {r.negotiation.logistics.corridor.road_circuity_factor}x • ~{r.negotiation.logistics.corridor.est_transit_minutes} mins</span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-muted border border-border">
                            <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase font-mono">Toll Plazas & Tariff</span>
                            <span className="font-bold text-foreground font-mono block">
                              {r.negotiation.logistics.corridor.total_toll_inr > 0 ? `₹${r.negotiation.logistics.corridor.total_toll_inr} Toll Included` : 'Zero Toll Route'}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 block truncate">
                              {r.negotiation.logistics.corridor.tolls.length > 0 ? r.negotiation.logistics.corridor.tolls.map((t) => t.name).join(', ') : 'State Highway'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-muted border border-border">
                            <span className="text-muted-foreground/70 block text-[10px] font-bold uppercase font-mono">BBMP Heavy Vehicle Ban</span>
                            <span className={`font-bold block ${r.negotiation.logistics.corridor.bbmp_peak_restriction.restricted ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                              {r.negotiation.logistics.corridor.bbmp_peak_restriction.restricted ? 'Peak Ban Enforced' : 'Exempt (Outer Bypass)'}
                            </span>
                            <span className="text-[10px] text-muted-foreground/70 block truncate">{r.negotiation.logistics.corridor.bbmp_peak_restriction.window}</span>
                          </div>
                        </div>

                        {r.negotiation.logistics.corridor.bbmp_peak_restriction.restricted && (
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
                            <span>{r.negotiation.logistics.corridor.bbmp_peak_restriction.advisory}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Logistics & Emission Offsets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                        <div className="text-muted-foreground/70 font-semibold flex items-center gap-1.5 mb-1">
                          <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                          Logistics & Freight Total
                        </div>
                        <div className="font-bold text-foreground">
                          {r.negotiation.logistics.distance_km} km ({r.negotiation.logistics.reason})
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-1 font-mono">
                          Freight Cost: ₹{r.negotiation.logistics.transport_cost_total_inr} (₹{r.negotiation.logistics.transport_cost_per_ton_inr}/ton)
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                        <div className="text-muted-foreground/70 font-semibold flex items-center gap-1.5 mb-1">
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                          Carbon & Air Quality Offset
                        </div>
                        <div className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                          CO2 Saved: {r.negotiation.logistics.net_co2_impact_kg} kg
                        </div>
                        {r.negotiation.logistics.pm10_avoided_kg ? (
                          <div className="text-[11px] text-cyan-700 dark:text-cyan-300 mt-1 font-mono font-medium flex items-center gap-1">
                            <Wind className="w-3 h-3" />
                            PM10 Avoided: {r.negotiation.logistics.pm10_avoided_kg} kg
                          </div>
                        ) : null}
                      </div>

                      <div className="p-3.5 rounded-xl bg-card border border-border shadow-2xs">
                        <div className="text-muted-foreground/70 font-semibold flex items-center gap-1.5 mb-1">
                          <Scale className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                          Negotiation Convergence
                        </div>
                        <div className="font-bold text-foreground">
                          {r.negotiation.rounds.length} rounds executed
                        </div>
                        <button
                          onClick={() => onSelectTranscript(idx)}
                          className="text-[11px] text-[#ea580c] font-semibold hover:underline mt-1 inline-block"
                        >
                          View round-by-round transcript →
                        </button>
                      </div>
                    </div>

                    {/* Limitation 3: KSPCB Regulatory Decision Section & XGN Quotas */}
                    {r.regulatory && (
                      <div
                        className={`p-4 rounded-xl border text-xs leading-relaxed ${
                          r.regulatory.decision === 'APPROVED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300'
                            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between gap-1.5 mb-1 text-sm">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                            <span>
                              {r.regulatory.rule_applied?.includes('Auditor Agent')
                                ? 'Allocation Auditor Agent'
                                : 'KSPCB Regulatory Supervisor'}
                              : {r.regulatory.decision}
                            </span>
                          </div>
                          {r.regulatory.xgn_consent_status && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-card border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300">
                              CFO Active (Exp: {r.regulatory.xgn_consent_status.seller_expiry})
                            </span>
                          )}
                        </div>
                        <div className="text-xs">
                          <span className="font-semibold text-muted-foreground">Rule Applied: </span>
                          {r.regulatory.rule_applied}
                        </div>

                        {r.regulatory.xgn_quota_check && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-card/80 p-2.5 rounded-lg border border-border">
                            <div>
                              <span className="font-bold text-foreground block">Seller XGN Quota Headroom:</span>
                              <span className="text-muted-foreground font-mono">
                                Quota: {r.regulatory.xgn_quota_check.seller_check.authorized_quota_tons} T | Consumed: {r.regulatory.xgn_quota_check.seller_check.consumed_tons} T | Remaining: {r.regulatory.xgn_quota_check.seller_check.remaining_headroom_tons} T
                              </span>
                            </div>
                            <div>
                              <span className="font-bold text-foreground block">Buyer XGN Quota Headroom:</span>
                              <span className="text-muted-foreground font-mono">
                                Quota: {r.regulatory.xgn_quota_check.buyer_check.authorized_quota_tons} T | Remaining: {r.regulatory.xgn_quota_check.buyer_check.remaining_headroom_tons} T
                              </span>
                            </div>
                          </div>
                        )}

                        {r.regulatory.explanation && (
                          <div className="mt-1.5 text-muted-foreground italic bg-card/70 p-2.5 rounded-lg border border-border/60">
                            "{r.regulatory.explanation}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Reason if NO_DEAL */}
                    {r.negotiation.outcome === 'NO_DEAL' && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-900 dark:text-rose-300">
                        <span className="font-bold">Bargaining Breakdown: </span>
                        {r.negotiation.reason}
                      </div>
                    )}

                    {/* Logistics/Carrier Negotiation Outcome */}
                    {r.logistics_deal && (
                      <div
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                          r.logistics_deal.outcome === 'DEAL'
                            ? 'bg-card border-border'
                            : 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800/60 text-orange-900 dark:text-orange-300'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-foreground">
                          <Truck className="w-4 h-4 text-orange-600 dark:text-orange-300" />
                          <span>Logistics/Carrier Negotiation Agent</span>
                        </div>
                        {r.logistics_deal.outcome === 'DEAL' ? (
                          <div className="text-muted-foreground font-mono">
                            {r.logistics_deal.carrier_name} ({r.logistics_deal.vehicle_type}) — ₹{r.logistics_deal.final_rate_inr_per_ton_km}/ton-km,
                            total freight ₹{r.logistics_deal.total_freight_cost_inr}
                          </div>
                        ) : (
                          <span>{r.logistics_deal.reason}</span>
                        )}
                      </div>
                    )}

                    {/* Aggregator / Micro-Lot Pooling Agent breakdown */}
                    {r.pooled_members && r.pooled_members.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-2.5 shadow-2xs">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                          <span>Aggregator Agent: Pooled Micro-Lot Consignment ({r.pooled_members.length} MSMEs)</span>
                        </div>
                        <div className="rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-muted text-muted-foreground font-semibold">
                              <tr>
                                <th className="p-2">MSME</th>
                                <th className="p-2 text-right">Volume</th>
                                <th className="p-2 text-right">Share</th>
                                <th className="p-2 text-right">Freight Share</th>
                                <th className="p-2 text-right">Net Payout</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-mono">
                              {r.pooled_members.map((m) => (
                                <tr key={m.facility_id}>
                                  <td className="p-2 font-sans text-foreground">{m.facility_name}</td>
                                  <td className="p-2 text-right">{m.volume_tons}t</td>
                                  <td className="p-2 text-right">{m.share_pct}%</td>
                                  <td className="p-2 text-right">₹{m.freight_share_inr}</td>
                                  <td className="p-2 text-right font-bold text-emerald-700 dark:text-emerald-300">₹{m.net_payout_inr}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70">
                          Individually too small for a dedicated freight route — pooled together, shared fixed
                          dispatch overhead splits proportionally by volume instead of eating each MSME's margin alone.
                        </p>
                      </div>
                    )}

                    {/* Settlement & Escrow Agent */}
                    {r.passport?.deal.settlement && (
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1.5">
                        <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                          <span>Settlement & Escrow Agent: {r.passport.deal.settlement.escrow_voucher_id}</span>
                        </div>
                        <div className="text-emerald-900 dark:text-emerald-300 font-mono">
                          T+0 Advance ({r.passport.deal.settlement.advance_pct}%): ₹{r.passport.deal.settlement.advance_inr} via {r.passport.deal.settlement.advance_upi_ref} • Balance ₹{r.passport.deal.settlement.balance_inr} on delivery confirmation
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                          Middleman deduction capped at {r.passport.deal.settlement.katoti_cap_pct}% (vs. traditional uncapped deductions).
                        </div>
                      </div>
                    )}

                    {/* Limitation 4: Passport Hash Link & PO / GST E-Way Bill Inspector */}
                    {r.passport && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-card border border-border text-xs gap-3">
                        <div className="flex items-center gap-2 font-mono text-muted-foreground">
                          <Hash className="w-4 h-4 text-[#ea580c] shrink-0" />
                          <span>Digital Waste Passport: </span>
                          <span className="text-[#ea580c] font-bold">
                            {r.passport.record_hash.slice(0, 24)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setSelectedContractItem(r)}
                            className="px-3.5 py-1.5 rounded-lg bg-[#ff5d02] hover:bg-[#e04f00] text-white font-semibold transition text-xs flex items-center gap-1.5 shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View PO & GST E-Way Bill</span>
                          </button>

                          <button
                            onClick={onViewPassport}
                            className="px-3.5 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold transition text-xs shrink-0"
                          >
                            Ledger →
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
                </AnimatePresence>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </section>
      </>
      )}

      {/* Contract & E-Way Bill Modal */}
      {selectedContractItem && (
        <ContractModal
          isOpen={Boolean(selectedContractItem)}
          onClose={() => setSelectedContractItem(null)}
          contract={selectedContractItem.passport?.deal.contract}
          ewayBill={selectedContractItem.passport?.deal.eway_bill}
          hazardManifest={selectedContractItem.passport?.deal.hazard_manifest}
          settlement={selectedContractItem.passport?.deal.settlement}
        />
      )}
    </div>
  );
};
