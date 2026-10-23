// Typed client for the FastAPI backend (backend/scm/api.py). Every screen goes
// through here, so a change to an endpoint only needs fixing in one place.
import type {
  Carrier,
  DigitalWastePassport,
  Facility,
  LedgerVerification,
  PipelineItemResult,
} from '../types';

export interface DecisionRecord {
  id?: number;
  run_id?: string | null;
  agent: string;
  action: string;
  subject: Record<string, unknown>;
  inputs: Record<string, unknown>;
  output: Record<string, unknown>;
  rule?: string | null;
  reason?: string | null;
  model?: string | null;
  created_at?: string;
}

export interface Health {
  status: string;
  llm: string;
  store: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `${init?.method ?? 'GET'} ${path} failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  health: () => call<Health>('/api/health'),
  facilities: () => call<Record<string, Facility>>('/api/facilities'),
  carriers: () => call<Record<string, Carrier>>('/api/carriers'),
  addFacility: (f: Partial<Facility>) => post<Facility>('/api/facilities/add', f),
  updateSensor: (facility_id: string, moisture_pct: number, contamination_flag: boolean) =>
    post<Facility>('/api/facilities/sensor', { facility_id, moisture_pct, contamination_flag }),
  describeFacility: (id: string) => post<{ id: string; description: string }>(`/api/facilities/${id}/describe`),
  runPipeline: () => post<{ run_id: string | null; items: PipelineItemResult[]; minted: number }>('/api/pipeline/run'),
  results: () => call<PipelineItemResult[]>('/api/pipeline/results'),
  decisions: (limit = 200) => call<DecisionRecord[]>(`/api/decisions?limit=${limit}`),
  ledger: () => call<{ passports: DigitalWastePassport[]; verification: LedgerVerification }>('/api/ledger'),
  verifyLedger: () => call<LedgerVerification>('/api/ledger/verify'),
  reset: () => post<{ status: string }>('/api/reset'),
};
