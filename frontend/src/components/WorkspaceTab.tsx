import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Factory, LogIn, LogOut, ShieldCheck, Truck, XCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { AuthModal } from './AuthModal';
import { useSession, Role } from '../lib/session';
import { Carrier, DisposalResult, Facility, PipelineItemResult } from '../types';

// One screen per role, built from the latest run. Signed-in users see the
// facility or fleet linked to their profile; in demo mode (no Supabase env, or
// signed out) you choose who to view as.

interface WorkspaceTabProps {
  facilities: Record<string, Facility>;
  carriers: Record<string, Carrier>;
  results: PipelineItemResult[];
  disposals: DisposalResult[];
  onRunPipelineNav: () => void;
}

interface Viewer {
  role: Role;
  facilityId: string | null;
  carrierId: string | null;
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const DAY = 86_400_000;

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  const d = dmy ? new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`) : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** 'expired' | 'soon' (within 90 days) | 'ok', from the facility's KSPCB consent. */
export function consentState(f: Facility, now = new Date()): 'expired' | 'soon' | 'ok' {
  const x = f.xgn_details;
  if (!x) return 'ok';
  const till = parseDate(x.valid_till);
  if (!x.is_active || (till && till < now)) return 'expired';
  if (till && till.getTime() - now.getTime() < 90 * DAY) return 'soon';
  return 'ok';
}

type Outcome = { label: string; tone: 'good' | 'bad' | 'muted' };

export function outcomeOf(r: PipelineItemResult): Outcome {
  if (r.negotiation.outcome !== 'DEAL') return { label: 'No price agreed', tone: 'muted' };
  if (r.logistics_deal && r.logistics_deal.outcome !== 'DEAL') return { label: 'No carrier', tone: 'muted' };
  if (r.regulatory?.decision === 'VETOED') return { label: 'Vetoed', tone: 'bad' };
  if (r.regulatory?.decision === 'APPROVED') return { label: 'Approved', tone: 'good' };
  return { label: 'Pending', tone: 'muted' };
}

const reasonOf = (r: PipelineItemResult) =>
  r.regulatory?.decision === 'VETOED'
    ? r.regulatory.explanation ?? r.regulatory.rule_applied
    : r.logistics_deal && r.logistics_deal.outcome !== 'DEAL'
      ? r.logistics_deal.reason
      : r.negotiation.outcome !== 'DEAL'
        ? r.negotiation.reason
        : null;

const toneClass = {
  good: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  bad: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  muted: 'bg-muted text-muted-foreground border-border',
};

const Tile: React.FC<{ label: string; value: string; hint?: string; warn?: boolean }> = ({ label, value, hint, warn }) => (
  <Card className="p-4 gap-1">
    <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
      {warn && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
      {label}
    </div>
    <div className="text-xl font-extrabold tracking-tight tabular-nums">{value}</div>
    {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
  </Card>
);

const DealList: React.FC<{ title: string; rows: PipelineItemResult[]; counterparty: (r: PipelineItemResult) => string; money: (r: PipelineItemResult) => string | null }> = ({
  title,
  rows,
  counterparty,
  money,
}) => (
  <Card className="p-5 gap-3">
    <div className="text-sm font-bold">{title}</div>
    {rows.length === 0 ? (
      <p className="text-xs text-muted-foreground">Nothing in the latest run.</p>
    ) : (
      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const o = outcomeOf(r);
          const reason = reasonOf(r);
          const m = money(r);
          return (
            <div key={i} className="rounded-xl border border-border p-3 text-xs flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={`px-2 py-0.5 rounded-full border font-semibold text-[10px] ${toneClass[o.tone]}`}>{o.label}</span>
                <span className="font-semibold">{counterparty(r)}</span>
                <span className="text-muted-foreground">
                  {r.negotiation.volume_tons} t {r.match.material.replace(/_/g, ' ')}, {r.match.route.distance_km} km
                </span>
                {m && <span className="sm:ml-auto font-mono font-semibold">{m}</span>}
              </div>
              {reason && <div className="text-muted-foreground">{reason}</div>}
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

const SellerView: React.FC<{ f: Facility; results: PipelineItemResult[]; disposals: DisposalResult[] }> = ({ f, results, disposals }) => {
  const mine = results.filter((r) => r.match.seller_id === f.id || r.pooled_members?.some((m) => m.facility_id === f.id));
  const disposal = disposals.find((d) => d.seller_id === f.id);
  const revenue = mine
    .filter((r) => outcomeOf(r).tone === 'good')
    .reduce((a, r) => {
      const share = r.pooled_members?.find((m) => m.facility_id === f.id);
      return a + (share ? share.net_payout_inr : (r.negotiation.final_price_inr_per_ton ?? 0) * r.negotiation.volume_tons);
    }, 0);
  return (
    <>
      <FacilityTiles f={f} priceLabel="Your floor price" price={f.cost_floor_inr_per_ton} extra={{ label: 'Approved sales this run', value: inr(revenue) }} />
      <DealList
        title="Your offers this run"
        rows={mine}
        counterparty={(r) => `→ ${r.buyer.name}`}
        money={(r) => (r.negotiation.final_price_inr_per_ton != null ? `${inr(r.negotiation.final_price_inr_per_ton)}/t` : null)}
      />
      {disposal && <DisposalNote d={disposal} />}
    </>
  );
};

const BuyerView: React.FC<{ f: Facility; results: PipelineItemResult[] }> = ({ f, results }) => {
  const mine = results.filter((r) => r.match.buyer_id === f.id);
  const spend = mine
    .filter((r) => outcomeOf(r).tone === 'good')
    .reduce((a, r) => a + (r.negotiation.final_price_inr_per_ton ?? 0) * r.negotiation.volume_tons, 0);
  const reqs = Object.entries(f.quality_requirements ?? {});
  return (
    <>
      <FacilityTiles f={f} priceLabel="Your ceiling price" price={f.cost_ceiling_inr_per_ton} extra={{ label: 'Approved purchases this run', value: inr(spend) }} />
      {reqs.length > 0 && (
        <Card className="p-5 gap-2">
          <div className="text-sm font-bold">Your quality requirements</div>
          <div className="flex flex-wrap gap-2 text-xs">
            {reqs.map(([k, v]) => (
              <Badge key={k} variant="outline" className="font-mono">
                {k.replace(/_/g, ' ')}: {String(v)}
              </Badge>
            ))}
          </div>
        </Card>
      )}
      <DealList
        title="Supply offered to you this run"
        rows={mine}
        counterparty={(r) => `← ${r.seller.name}`}
        money={(r) => (r.negotiation.final_price_inr_per_ton != null ? `${inr(r.negotiation.final_price_inr_per_ton)}/t` : null)}
      />
    </>
  );
};

const CarrierView: React.FC<{ c: Carrier; results: PipelineItemResult[]; disposals: DisposalResult[] }> = ({ c, results, disposals }) => {
  const trips = results.filter((r) => r.logistics_deal?.carrier_id === c.id);
  const hauls = disposals.filter((d) => d.carrier_id === c.id && d.decision === 'APPROVED');
  const earned =
    trips.filter((r) => outcomeOf(r).tone === 'good').reduce((a, r) => a + (r.logistics_deal?.total_freight_cost_inr ?? 0), 0) +
    hauls.reduce((a, d) => a + (d.freight_inr ?? 0), 0);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Vehicle" value={c.vehicle_type} hint={`${c.capacity_tons} t capacity`} />
        <Tile label="Your floor rate" value={`₹${c.rate_floor_inr_per_ton_km}/t·km`} />
        <Tile label="Hazmat licence" value={c.hazmat_transport_license ? 'Yes' : 'No'} hint={c.hazmat_transport_license ? 'Can carry Form 10 consignments' : 'Non-hazardous loads only'} />
        <Tile label="Freight earned this run" value={inr(earned)} />
      </div>
      <DealList
        title="Trips quoted to you this run"
        rows={trips}
        counterparty={(r) => `${r.seller.name} → ${r.buyer.name}`}
        money={(r) => (r.logistics_deal?.total_freight_cost_inr != null ? inr(r.logistics_deal.total_freight_cost_inr) : null)}
      />
      {hauls.length > 0 && (
        <Card className="p-5 gap-2">
          <div className="text-sm font-bold">Hazardous disposal hauls</div>
          {hauls.map((d) => (
            <div key={d.seller_id} className="text-xs flex flex-wrap gap-2">
              <span className="font-semibold">{d.seller_name}</span>
              <span className="text-muted-foreground">→ {d.site_name}, {d.road_km} km</span>
              <span className="ml-auto font-mono font-semibold">{inr(d.freight_inr ?? 0)}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
};

const RegulatorView: React.FC<{ facilities: Record<string, Facility>; results: PipelineItemResult[]; disposals: DisposalResult[] }> = ({
  facilities,
  results,
  disposals,
}) => {
  const vetoed = results.filter((r) => r.regulatory?.decision === 'VETOED');
  const watch = Object.values(facilities)
    .map((f) => ({ f, s: consentState(f) }))
    .filter((x) => x.s !== 'ok')
    .sort((a, b) => (a.s === b.s ? 0 : a.s === 'expired' ? -1 : 1));
  const skipped = disposals.flatMap((d) => d.rejected_sites.map((r) => ({ d, r })));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Deals vetoed" value={String(vetoed.length)} />
        <Tile label="Disposals blocked" value={String(disposals.filter((d) => d.decision === 'VETOED').length)} />
        <Tile label="Sites refused" value={String(skipped.length)} hint="Full or closed sites the routing skipped" />
        <Tile label="Consents to act on" value={String(watch.length)} hint="Expired, or expiring within 90 days" warn={watch.length > 0} />
      </div>
      <DealList title="Vetoed deals" rows={vetoed} counterparty={(r) => `${r.seller.name} → ${r.buyer.name}`} money={() => null} />
      <Card className="p-5 gap-2">
        <div className="text-sm font-bold">Disposal routing</div>
        {disposals.length === 0 && <p className="text-xs text-muted-foreground">No hazardous waste needed disposal in the latest run.</p>}
        {disposals.map((d) => (
          <div key={d.seller_id} className="text-xs flex flex-col gap-1 border-b border-border last:border-0 pb-2 last:pb-0">
            <div className="flex flex-wrap items-center gap-2">
              {d.decision === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
              <span className="font-semibold">{d.seller_name}</span>
              <span className="text-muted-foreground">{d.volume_tons} t {d.material.replace(/_/g, ' ')}</span>
              <span className="text-muted-foreground">→ {d.site_name ?? 'blocked'}</span>
            </div>
            <div className="text-muted-foreground">{d.explanation}</div>
            {d.rejected_sites.map((r) => (
              <div key={r.site_id} className="text-muted-foreground">
                Refused {r.site_name}: {r.reason}
              </div>
            ))}
          </div>
        ))}
      </Card>
      <Card className="p-5 gap-2">
        <div className="text-sm font-bold">Consent watchlist</div>
        {watch.length === 0 && <p className="text-xs text-muted-foreground">Every facility's consent is valid for at least 90 more days.</p>}
        {watch.map(({ f, s }) => (
          <div key={f.id} className="text-xs flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full border font-semibold text-[10px] ${s === 'expired' ? toneClass.bad : toneClass.muted}`}>
              {s === 'expired' ? 'Expired' : 'Expiring'}
            </span>
            <span className="font-semibold">{f.name}</span>
            <span className="text-muted-foreground font-mono">{f.xgn_details?.consent_id}</span>
            <span className="ml-auto text-muted-foreground">valid till {f.xgn_details?.valid_till}</span>
          </div>
        ))}
      </Card>
    </>
  );
};

const FacilityTiles: React.FC<{ f: Facility; priceLabel: string; price: number | null; extra: { label: string; value: string } }> = ({ f, priceLabel, price, extra }) => {
  const x = f.xgn_details;
  const s = consentState(f);
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Tile label="Monthly volume" value={`${f.volume_tons_per_month} t`} hint={f.material.replace(/_/g, ' ')} />
      <Tile label={priceLabel} value={price != null ? `${inr(price)}/t` : '–'} hint="Private: other parties never see it" />
      <Tile
        label="KSPCB consent"
        value={s === 'expired' ? 'Expired' : s === 'soon' ? 'Expiring soon' : 'Valid'}
        hint={x ? `Till ${x.valid_till}, quota headroom ${Math.max(0, x.authorized_monthly_quota_tons - x.current_month_consumed_tons)} t` : undefined}
        warn={s !== 'ok'}
      />
      <Tile label={extra.label} value={extra.value} />
    </div>
  );
};

const DisposalNote: React.FC<{ d: DisposalResult }> = ({ d }) => (
  <Card className="p-5 gap-1 text-xs">
    <div className="text-sm font-bold">Leftover hazardous waste</div>
    <div className="text-muted-foreground">{d.explanation}</div>
    {d.total_cost_inr != null && (
      <div>
        You pay <span className="font-mono font-semibold">{inr(d.total_cost_inr)}</span> (gate fee {inr(d.gate_fee_inr_per_ton ?? 0)}/t plus freight).
      </div>
    )}
  </Card>
);

export const WorkspaceTab: React.FC<WorkspaceTabProps> = ({ facilities, carriers, results, disposals, onRunPipelineNav }) => {
  const { configured, session, profile, signOut, claim } = useSession();
  const [demo, setDemo] = useState<Viewer>({ role: 'seller', facilityId: 'F01', carrierId: null });
  const [authOpen, setAuthOpen] = useState(false);
  const [claimId, setClaimId] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);

  const signedIn = Boolean(session && profile);
  const viewer: Viewer = signedIn
    ? { role: profile!.role, facilityId: profile!.facility_id, carrierId: profile!.carrier_id }
    : demo;

  const facility = viewer.facilityId ? facilities[viewer.facilityId] : undefined;
  const carrier = viewer.carrierId ? carriers[viewer.carrierId] : undefined;
  const needsLink =
    signedIn && ((['seller', 'buyer'].includes(viewer.role) && !facility) || (viewer.role === 'carrier' && !carrier));

  const pickable = (role: Role) =>
    role === 'carrier'
      ? Object.values(carriers).map((c) => ({ id: c.id, name: c.name }))
      : Object.values(facilities)
          .filter((f) => f.role === role)
          .map((f) => ({ id: f.id, name: f.name }));

  const doClaim = async () => {
    setClaimError(null);
    try {
      await claim(viewer.role === 'carrier' ? 'carrier' : 'facility', claimId);
    } catch (e) {
      setClaimError((e as Error).message);
    }
  };

  const roleIcon = viewer.role === 'carrier' ? Truck : viewer.role === 'regulator' || viewer.role === 'admin' ? ShieldCheck : Factory;
  const RoleIcon = roleIcon;

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex-row flex-wrap items-center gap-3">
        <RoleIcon className="w-5 h-5 text-orange-600 dark:text-orange-300" />
        {signedIn ? (
          <div className="text-sm">
            Signed in as <span className="font-semibold">{profile!.display_name}</span>{' '}
            <Badge variant="outline" className="ml-1">{viewer.role}</Badge>
            {(facility || carrier) && <span className="text-muted-foreground"> · {(facility ?? carrier)!.name}</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{configured ? 'Signed out, previewing as' : 'Demo mode, viewing as'}</span>
            <select
              aria-label="Role"
              className="h-8 rounded-md border border-border bg-card px-2 text-xs"
              value={demo.role}
              onChange={(e) => {
                const role = e.target.value as Role;
                const first = pickable(role)[0]?.id ?? null;
                setDemo({ role, facilityId: role === 'seller' || role === 'buyer' ? first : null, carrierId: role === 'carrier' ? first : null });
              }}
            >
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
              <option value="carrier">Carrier</option>
              <option value="regulator">KSPCB regulator</option>
            </select>
            {demo.role !== 'regulator' && (
              <select
                aria-label="Who"
                className="h-8 rounded-md border border-border bg-card px-2 text-xs max-w-[16rem]"
                value={(demo.role === 'carrier' ? demo.carrierId : demo.facilityId) ?? ''}
                onChange={(e) =>
                  setDemo((d) => (d.role === 'carrier' ? { ...d, carrierId: e.target.value } : { ...d, facilityId: e.target.value }))
                }
              >
                {pickable(demo.role).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div className="sm:ml-auto">
          {configured &&
            (signedIn ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </Button>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={() => setAuthOpen(true)}>
                <LogIn className="w-3.5 h-3.5" /> Sign in
              </Button>
            ))}
        </div>
      </Card>

      {needsLink && (
        <Card className="p-5 gap-3">
          <div className="text-sm font-bold">Link your account to your {viewer.role === 'carrier' ? 'fleet' : 'facility'}</div>
          <p className="text-xs text-muted-foreground">
            Pick the {viewer.role === 'carrier' ? 'fleet' : `${viewer.role} facility`} you manage. Each can only be claimed once, and an admin can reassign it.
          </p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Claim" className="h-8 rounded-md border border-border bg-card px-2 text-xs" value={claimId} onChange={(e) => setClaimId(e.target.value)}>
              <option value="">Choose…</option>
              {pickable(viewer.role).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.name}
                </option>
              ))}
            </select>
            <Button size="sm" disabled={!claimId} onClick={doClaim}>
              Link
            </Button>
          </div>
          {claimError && <p className="text-xs text-red-700 dark:text-red-300">{claimError}</p>}
        </Card>
      )}

      {results.length === 0 && (
        <Card className="p-6 items-center text-center gap-2 text-sm text-muted-foreground">
          Your workspace fills in after a matching run.
          <Button size="sm" onClick={onRunPipelineNav}>Go to Match Deals</Button>
        </Card>
      )}

      {results.length > 0 && !needsLink && (
        <>
          {viewer.role === 'seller' && facility && <SellerView f={facility} results={results} disposals={disposals} />}
          {viewer.role === 'buyer' && facility && <BuyerView f={facility} results={results} />}
          {viewer.role === 'carrier' && carrier && <CarrierView c={carrier} results={results} disposals={disposals} />}
          {(viewer.role === 'regulator' || viewer.role === 'admin') && (
            <RegulatorView facilities={facilities} results={results} disposals={disposals} />
          )}
        </>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
};
