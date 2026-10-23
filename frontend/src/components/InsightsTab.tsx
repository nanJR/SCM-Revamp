import React from 'react';
import { Gauge, Leaf, Truck, ShieldAlert, Scale, Package, Factory, XCircle } from 'lucide-react';
import { Card } from './ui/card';
import { DisposalResult, PipelineItemResult } from '../types';

// Supply-chain KPIs for the latest run. Names follow SCOR where one fits
// (perfect order fulfilment, cost to serve) so the numbers read the same way
// an operations team would report them.

interface InsightsTabProps {
  results: PipelineItemResult[];
  disposals: DisposalResult[];
  onRunPipelineNav: () => void;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function computeKpis(results: PipelineItemResult[]) {
  const deals = results.filter((r) => r.negotiation.outcome === 'DEAL');
  const approved = deals.filter((r) => r.regulatory?.decision === 'APPROVED');
  const vetoed = deals.filter((r) => r.regulatory?.decision === 'VETOED');
  const minted = results.filter((r) => r.passport);

  const tonnes = approved.reduce((a, r) => a + r.negotiation.volume_tons, 0);
  const goodsValue = approved.reduce((a, r) => a + (r.negotiation.final_price_inr_per_ton ?? 0) * r.negotiation.volume_tons, 0);
  const freight = approved.reduce((a, r) => a + (r.logistics_deal?.total_freight_cost_inr ?? 0), 0);
  const netCo2Kg = approved.reduce((a, r) => a + r.negotiation.logistics.net_co2_impact_kg, 0);

  // Where in the seller-floor..buyer-ceiling zone the price landed. 0 means the
  // buyer kept all the surplus, 1 means the seller did.
  const surplusShares = approved
    .map((r) => {
      const floor = r.seller.cost_floor_inr_per_ton;
      const ceiling = r.buyer.cost_ceiling_inr_per_ton;
      const price = r.negotiation.final_price_inr_per_ton;
      if (floor == null || ceiling == null || price == null || ceiling <= floor) return null;
      return (price - floor) / (ceiling - floor);
    })
    .filter((x): x is number => x !== null);
  const avgSellerShare = surplusShares.length ? surplusShares.reduce((a, b) => a + b, 0) / surplusShares.length : null;

  const vetoReasons = new Map<string, number>();
  for (const r of vetoed) {
    const key = r.regulatory?.rule_applied ?? 'Unspecified rule';
    vetoReasons.set(key, (vetoReasons.get(key) ?? 0) + 1);
  }

  return {
    funnel: [
      { label: 'Feasible matches', value: results.length },
      { label: 'Price agreed', value: deals.length },
      { label: 'Regulator approved', value: approved.length },
      { label: 'Passport minted', value: minted.length },
    ],
    tonnes,
    goodsValue,
    freight,
    costToServePerTonne: tonnes ? freight / tonnes : 0,
    freightShare: goodsValue + freight ? freight / (goodsValue + freight) : 0,
    netCo2Tonnes: netCo2Kg / 1000,
    perfectOrderRate: results.length ? minted.length / results.length : 0,
    avgSellerShare,
    vetoReasons: [...vetoReasons.entries()].sort((a, b) => b[1] - a[1]),
  };
}

const Stat: React.FC<{ icon: React.ElementType; label: string; value: string; hint: string }> = ({
  icon: Icon,
  label,
  value,
  hint,
}) => (
  <Card className="p-4 gap-1">
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
    <div className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{value}</div>
    <div className="text-[11px] text-muted-foreground leading-snug">{hint}</div>
  </Card>
);

export const InsightsTab: React.FC<InsightsTabProps> = ({ results, disposals, onRunPipelineNav }) => {
  if (results.length === 0) {
    return (
      <Card className="p-10 items-center text-center gap-3">
        <Gauge className="w-8 h-8 text-orange-600 dark:text-orange-300" />
        <p className="text-sm text-muted-foreground max-w-md">
          The KPIs are calculated from the latest matching run, and nothing has run yet.
        </p>
        <button
          onClick={onRunPipelineNav}
          className="px-4 py-2 rounded-full bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700"
        >
          Go to Match Deals
        </button>
      </Card>
    );
  }

  const k = computeKpis(results);
  const max = Math.max(...k.funnel.map((f) => f.value), 1);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">Network KPIs</h2>
        <p className="text-sm text-muted-foreground">From the latest run, counting approved deals only.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat icon={Package} label="Tonnes diverted" value={k.tonnes.toFixed(1)} hint="Byproduct moved to a reuser each month instead of going to landfill" />
        <Stat icon={Leaf} label="Net CO₂ avoided" value={`${k.netCo2Tonnes.toFixed(1)} t`} hint="Virgin material displaced, minus truck emissions" />
        <Stat icon={Gauge} label="Perfect order rate" value={pct(k.perfectOrderRate)} hint="Feasible matches that went all the way to a minted passport" />
        <Stat icon={Truck} label="Cost to serve" value={`${inr(k.costToServePerTonne)}/t`} hint={`Freight is ${pct(k.freightShare)} of the landed cost`} />
        <Stat icon={Scale} label="Seller's share of surplus" value={k.avgSellerShare == null ? '–' : pct(k.avgSellerShare)} hint="Where the agreed price falls between the seller's floor and the buyer's ceiling. 50% is an even split." />
        <Stat icon={ShieldAlert} label="Regulator vetoes" value={String(k.vetoReasons.reduce((a, [, n]) => a + n, 0))} hint="Deals that agreed on price but were blocked under KSPCB rules" />
      </div>

      <Card className="p-5 gap-3">
        <div className="text-sm font-bold">Deal funnel</div>
        <div className="flex flex-col gap-2">
          {k.funnel.map((f) => (
            <div key={f.label} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-xs" title={`${f.label}: ${f.value}`}>
              <span className="text-muted-foreground font-medium">{f.label}</span>
              <div className="h-4 bg-muted rounded">
                <div className="h-4 rounded bg-orange-500 dark:bg-orange-400" style={{ width: `${(f.value / max) * 100}%` }} />
              </div>
              <span className="text-right font-mono font-semibold tabular-nums">{f.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {disposals.length > 0 && <DisposalCard disposals={disposals} />}

      {k.vetoReasons.length > 0 && (
        <Card className="p-5 gap-2">
          <div className="text-sm font-bold">Why deals were vetoed</div>
          <ul className="text-xs flex flex-col gap-1.5">
            {k.vetoReasons.map(([rule, n]) => (
              <li key={rule} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{rule}</span>
                <span className="font-mono font-semibold">{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

const KIND: Record<string, string> = { tsdf: 'TSDF', incinerator: 'Incinerator', co_processing: 'Co-processing' };

// Hazardous lots no recycler took. The generator pays the site's gate fee plus
// freight, and the regulator refuses sites that are full or closed.
const DisposalCard: React.FC<{ disposals: DisposalResult[] }> = ({ disposals }) => {
  const paid = disposals.reduce((a, d) => a + (d.total_cost_inr ?? 0), 0);
  return (
    <Card className="p-5 gap-3">
      <div>
        <div className="text-sm font-bold flex items-center gap-1.5">
          <Factory className="w-4 h-4" /> Hazardous waste with no recycler
        </div>
        <p className="text-xs text-muted-foreground">
          Routed to the cheapest operating KSPCB-listed site. Generators pay {inr(paid)} in total. Gate fees are
          indicative until real site quotes are in.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {disposals.map((d) => (
          <div key={d.seller_id} className="rounded-xl border border-border p-3 text-xs flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono font-semibold">{d.seller_id}</span>
              <span className="text-muted-foreground">{d.volume_tons} t {d.material.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground">→</span>
              {d.decision === 'APPROVED' ? (
                <span className="font-semibold">
                  {d.site_name} <span className="text-muted-foreground font-normal">({KIND[d.site_kind ?? ''] ?? d.site_kind}, {d.road_km} km)</span>
                </span>
              ) : (
                <span className="font-semibold text-red-700 dark:text-red-300">Blocked</span>
              )}
              {d.total_cost_inr != null && <span className="sm:ml-auto font-mono font-semibold">{inr(d.total_cost_inr)}</span>}
            </div>
            <div className="text-muted-foreground">{d.explanation}</div>
            {d.rejected_sites.map((r) => (
              <div key={r.site_id} className="flex items-start gap-1.5 text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 mt-px shrink-0 text-red-600 dark:text-red-400" />
                <span>
                  Skipped {r.site_name}: {r.reason}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
};
