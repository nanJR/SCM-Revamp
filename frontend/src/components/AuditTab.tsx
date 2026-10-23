import React, { useEffect, useMemo, useState } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { api, DecisionRecord } from '../lib/api';

// Every agent action from decision_log: what it saw, what it decided, under
// which rule, and which model (if any) wrote the explanation.

const AGENTS = ['all', 'aggregator', 'matchmaker', 'negotiation', 'logistics', 'regulator', 'disposal', 'passport_minter'] as const;

// Pretty-prints JSON but keeps short arrays of numbers or strings on one line.
const pretty = (v: unknown) =>
  JSON.stringify(v, null, 2).replace(/\[\s*([^\[\]{}]*?)\s*\]/g, (_, inner: string) => `[${inner.replace(/\s*\n\s*/g, ' ')}]`);

const subjectLabel = (s: Record<string, unknown>) =>
  s.seller_id && s.buyer_id ? `${s.seller_id} → ${s.buyer_id}` : Object.values(s).join(' · ');

export const AuditTab: React.FC<{ refreshKey: number }> = ({ refreshKey }) => {
  const [rows, setRows] = useState<DecisionRecord[]>([]);
  const [agent, setAgent] = useState<(typeof AGENTS)[number]>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await api.decisions(300));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  const shown = useMemo(() => (agent === 'all' ? rows : rows.filter((r) => r.agent === agent)), [rows, agent]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
            <ScrollText className="w-5 h-5" /> Audit trail
          </h2>
          <p className="text-sm text-muted-foreground">
            Every decision an agent made, with its inputs and the rule it applied. The newest decisions are at the top.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={agent}
            onChange={(e) => setAgent(e.target.value as (typeof AGENTS)[number])}
            className="h-8 rounded-md border border-border bg-card px-2 text-xs"
            aria-label="Filter by agent"
          >
            {AGENTS.map((a) => (
              <option key={a} value={a}>
                {a === 'all' ? 'All agents' : a.replace('_', ' ')}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> Refresh
          </Button>
        </div>
      </div>

      {error && <Card className="p-4 text-sm text-red-700 dark:text-red-300">{error}</Card>}

      {!error && shown.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nothing is logged yet. Run the pipeline from Match Deals.
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {shown.map((d, i) => (
          <details key={d.id ?? i} className="group rounded-xl border border-border bg-card px-4 py-3">
            <summary className="flex flex-wrap items-center gap-2 cursor-pointer list-none text-sm">
              <Badge variant="outline" className="font-mono text-[10px]">{d.agent}</Badge>
              <span className="font-semibold">{d.action.replace(/_/g, ' ')}</span>
              <span className="font-mono text-xs text-muted-foreground">{subjectLabel(d.subject)}</span>
              <span className="text-xs text-muted-foreground basis-full sm:basis-auto sm:ml-auto truncate max-w-full sm:max-w-md">
                {d.reason}
              </span>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <div className="font-semibold mb-1">Inputs</div>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">{pretty(d.inputs)}</pre>
              </div>
              <div>
                <div className="font-semibold mb-1">Output</div>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">{pretty(d.output)}</pre>
              </div>
              <div className="sm:col-span-2 text-muted-foreground">
                {d.rule && <div><span className="font-semibold text-foreground">Rule:</span> {d.rule}</div>}
                <div><span className="font-semibold text-foreground">Written by:</span> {d.model ?? 'deterministic code'}</div>
                {d.run_id && <div className="font-mono">run {d.run_id}</div>}
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
};
