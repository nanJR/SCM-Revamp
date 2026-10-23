import React, { useState, useEffect } from 'react';
import { PipelineItemResult } from '../types';
import {
  TrendingDown,
  Wind,
  Droplets,
  Trees,
  Mountain,
  Sparkles,
  Fuel,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';

interface CarbonOffsetCounterProps {
  results: PipelineItemResult[];
}

export const CarbonOffsetCounter: React.FC<CarbonOffsetCounterProps> = ({ results }) => {
  const [timeframe, setTimeframe] = useState<'month' | 'year'>('month');
  const [animatedCo2, setAnimatedCo2] = useState<number>(0);

  // Filter approved deals with valid KSPCB regulatory approval
  const approvedDeals = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED'
  );

  // Base metrics per month
  const monthlyCo2Kg = approvedDeals.reduce(
    (acc, r) => acc + (r.negotiation.logistics.net_co2_impact_kg || 0),
    0
  );
  const monthlyPm10Kg = approvedDeals.reduce(
    (acc, r) => acc + (r.negotiation.logistics.pm10_avoided_kg || 0),
    0
  );
  const monthlyVolumeTons = approvedDeals.reduce(
    (acc, r) => acc + (r.negotiation.volume_tons || 0),
    0
  );

  // Specific material offsets
  const sandSavedTons = approvedDeals
    .filter((r) =>
      ['recycled_concrete_aggregate', 'demolition_rubble', 'steel_slag'].includes(
        r.match.material
      )
    )
    .reduce((acc, r) => acc + (r.negotiation.volume_tons || 0), 0);

  // 1 Ton recycled sand/aggregate replaces ~625 Liters of dredged river sand volume
  const sandSavedLiters = sandSavedTons * 625;

  // Used oil re-refined: 1 Ton used oil replaces ~1,120 Liters of imported virgin crude drilling
  const oilSavedLiters = approvedDeals
    .filter((r) => r.match.material === 'used_oil')
    .reduce((acc, r) => acc + (r.negotiation.volume_tons || 0) * 1120, 0);

  // Fly ash utilized in cement: 1 Ton replaces ~820 kg of limestone quarrying
  const limestoneSavedTons = approvedDeals
    .filter((r) => r.match.material === 'fly_ash')
    .reduce((acc, r) => acc + (r.negotiation.volume_tons || 0) * 0.82, 0);

  // Multiplier for timeframe
  const multiplier = timeframe === 'year' ? 12 : 1;

  const targetCo2Tons = (monthlyCo2Kg * multiplier) / 1000;
  const targetPm10Kg = monthlyPm10Kg * multiplier;
  const targetSandLiters = sandSavedLiters * multiplier;
  const targetSandTons = sandSavedTons * multiplier;
  const targetOilLiters = oilSavedLiters * multiplier;
  const targetLimestoneTons = limestoneSavedTons * multiplier;
  const targetDivertedTons = monthlyVolumeTons * multiplier;
  const targetTreesEquiv = Math.round(targetCo2Tons * 45); // 1 Ton CO2 approx 45 trees/year absorption

  // Smooth rolling number animation on load or change
  useEffect(() => {
    let start = 0;
    const duration = 750;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = targetCo2Tons / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= targetCo2Tons) {
        setAnimatedCo2(targetCo2Tons);
        clearInterval(timer);
      } else {
        setAnimatedCo2(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [targetCo2Tons]);

  if (results.length === 0) {
    return (
      <div className="bg-card rounded-3xl border border-orange-200/80 dark:border-orange-800/60 p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-black tracking-wider text-[#ea580c] uppercase font-mono mb-2">
          <Sparkles className="w-4 h-4" />
          <span>REAL-TIME CARBON & RESOURCE OFFSET ENGINE</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              Run Matches to Compute Karnataka Circular Offsets
            </h3>
            <p className="text-xs text-muted-foreground/70 max-w-2xl mt-1">
              Once you execute the deal pipeline, this telemetry system tracks net CO₂ reductions,
              virgin river sand saved from Cauvery/Kabini basins, crude oil re-refined, and CSTEP particulate dust avoided.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs text-[#ea580c] font-bold shrink-0">
            <span>Potential: ~40+ Tons CO₂ / Month</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-card via-orange-50/20 to-emerald-50/20 dark:via-orange-950/20 dark:to-emerald-950/20 rounded-3xl border border-orange-200/90 dark:border-orange-800/60 p-6 sm:p-7 shadow-sm">
      {/* Header with Timeframe Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-orange-100 dark:border-orange-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-[#ea580c] uppercase font-mono bg-orange-100/80 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-800/60">
              REAL-TIME CARBON & RESOURCE COUNTER
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
              <ShieldCheck className="w-3 h-3" />
              {approvedDeals.length} KSPCB Verified Deals
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mt-1.5">
            Karnataka Industrial Symbiosis Ecological Offsets
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Calculated using CSTEP Bengaluru air quality inventories, MoEFCC Fly Ash Notification SO 5481(E), and local freight logistics.
          </p>
        </div>

        {/* Timeframe Pill Controls */}
        <div className="flex items-center gap-1.5 bg-muted/90 p-1 rounded-2xl border border-border/80 self-start sm:self-center shrink-0">
          <button
            onClick={() => setTimeframe('month')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              timeframe === 'month'
                ? 'bg-card text-[#ea580c] shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1 Month Cycle</span>
          </button>
          <button
            onClick={() => setTimeframe('year')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              timeframe === 'year'
                ? 'bg-card text-emerald-700 dark:text-emerald-300 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1 Year Compounded</span>
          </button>
        </div>
      </div>

      {/* Main Counter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Metric 1: Net CO2 Avoided */}
        <div className="bg-card rounded-2xl border border-orange-200 dark:border-orange-800/60 p-5 shadow-xs relative overflow-hidden group hover:border-orange-300 dark:hover:border-orange-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground/70">
              Net CO₂ Emissions Avoided
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-[#ea580c] flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-foreground font-mono tracking-tight">
              {animatedCo2.toFixed(1)}
            </span>
            <span className="text-sm font-bold text-[#ea580c]">Metric Tons</span>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Virgin mining & kiln emissions cut</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
            <span>Rate: ₹8/km/t freight</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">~{(targetCo2Tons * 1000).toLocaleString()} kg CO₂</span>
          </div>
        </div>

        {/* Metric 2: Virgin River Sand & Aggregate Saved */}
        <div className="bg-card rounded-2xl border border-blue-200 dark:border-blue-800/60 p-5 shadow-xs relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-blue-700 dark:text-blue-300">
              Virgin River Sand Saved
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-blue-900 dark:text-blue-300 font-mono tracking-tight">
              {targetSandLiters >= 1000 ? `${(targetSandLiters / 1000).toFixed(0)}k` : targetSandLiters.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-300">Liters</span>
          </div>
          <div className="mt-2 text-[11px] text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            <span>{targetSandTons.toFixed(0)} Tons C&D aggregate reused</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
            <span>Cauvery/Kabini Basin</span>
            <span className="text-blue-700 dark:text-blue-300 font-bold">BIS IS:383:2016</span>
          </div>
        </div>

        {/* Metric 3: Air Quality / PM10 Dust Mitigated */}
        <div className="bg-card rounded-2xl border border-cyan-200 dark:border-cyan-800/60 p-5 shadow-xs relative overflow-hidden group hover:border-cyan-300 dark:hover:border-cyan-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-cyan-800 dark:text-cyan-300">
              CSTEP PM10 Dust Mitigated
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
              <Wind className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-cyan-950 dark:text-cyan-300 font-mono tracking-tight">
              {targetPm10Kg.toFixed(0)}
            </span>
            <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">kg Particulate</span>
          </div>
          <div className="mt-2 text-[11px] text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
            <span>Quarry blasting & clinker grinding</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
            <span>Peenya CAAQMS-11</span>
            <span className="text-cyan-800 dark:text-cyan-300 font-bold">Bangalore Clean Air</span>
          </div>
        </div>

        {/* Metric 4: Trees Equivalent / Landfill Diverted */}
        <div className="bg-card rounded-2xl border border-emerald-200 dark:border-emerald-800/60 p-5 shadow-xs relative overflow-hidden group hover:border-emerald-300 dark:hover:border-emerald-800/60 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase font-bold text-emerald-800 dark:text-emerald-300">
              Trees Sequestration Equiv.
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <Trees className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-950 dark:text-emerald-300 font-mono tracking-tight">
              {targetTreesEquiv.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Trees/Yr</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{targetDivertedTons.toFixed(0)} Tons diverted from landfill</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
            <span>Mandur/Peenya Dump</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-bold">100% Circular</span>
          </div>
        </div>
      </div>

      {/* Sub-bar: Additional Resource Shield Details */}
      <div className="mt-4 p-4 rounded-2xl bg-card/80 border border-orange-200/80 dark:border-orange-800/60 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Fuel className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-foreground">Virgin Crude Oil Conserved: </span>
            <span className="font-mono text-muted-foreground font-semibold">
              {targetOilLiters.toLocaleString()} Liters
            </span>
            <span className="text-muted-foreground/70 text-[11px] ml-1.5">
              (from authorized closed-loop vacuum distillation re-refining)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
            <Mountain className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-foreground">Limestone Quarrying Saved: </span>
            <span className="font-mono text-muted-foreground font-semibold">
              {targetLimestoneTons.toFixed(1)} Tons
            </span>
            <span className="text-muted-foreground/70 text-[11px] ml-1.5">
              (Fly Ash substitution in Pozzolana Cement kilns)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
