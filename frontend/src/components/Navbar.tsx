import React from 'react';
import { RotateCcw, Factory, Play, MessageSquareText, BookOpen, TrendingDown, Droplets, Truck, Sun, Moon, Gauge, ScrollText } from 'lucide-react';
import { PipelineItemResult } from '../types';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

export type Tab = 'facilities' | 'fleet' | 'pipeline' | 'transcripts' | 'ledger' | 'insights' | 'audit';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onReset: () => void;
  resetting: boolean;
  onOpenStandards?: () => void;
  onOpenLimitations?: () => void;
  onOpenGlossary?: () => void;
  results?: PipelineItemResult[];
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onReset,
  resetting,
  onOpenStandards,
  onOpenLimitations,
  onOpenGlossary,
  results = [],
  darkMode = false,
  onToggleDarkMode,
}) => {
  const approvedDeals = results.filter(
    (r) => r.negotiation.outcome === 'DEAL' && r.regulatory?.decision === 'APPROVED'
  );
  const totalCo2Kg = approvedDeals.reduce(
    (acc, r) => acc + (r.negotiation.logistics.net_co2_impact_kg || 0),
    0
  );
  const sandSavedTons = approvedDeals
    .filter((r) =>
      ['recycled_concrete_aggregate', 'demolition_rubble', 'steel_slag'].includes(
        r.match.material
      )
    )
    .reduce((acc, r) => acc + (r.negotiation.volume_tons || 0), 0);
  const sandSavedLiters = sandSavedTons * 625;

  const tabs: { id: NavbarProps['activeTab']; label: string; icon: React.ElementType; idAttr: string }[] = [
    { id: 'facilities', label: 'Factories', icon: Factory, idAttr: 'nav-facilities-tab' },
    { id: 'fleet', label: 'Fleet', icon: Truck, idAttr: 'nav-fleet-tab' },
    { id: 'pipeline', label: 'Match Deals', icon: Play, idAttr: 'nav-pipeline-tab' },
    { id: 'transcripts', label: 'Negotiations', icon: MessageSquareText, idAttr: 'nav-transcripts-tab' },
    { id: 'ledger', label: 'Passports', icon: BookOpen, idAttr: 'nav-ledger-tab' },
    { id: 'insights', label: 'KPIs', icon: Gauge, idAttr: 'nav-insights-tab' },
    { id: 'audit', label: 'Audit', icon: ScrollText, idAttr: 'nav-audit-tab' },
  ];

  return (
    <header className="sticky top-2.5 z-50 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto bg-card/95 backdrop-blur-md border border-orange-200/80 dark:border-orange-800/60 rounded-2xl sm:rounded-full shadow-[0_4px_20px_rgba(234,88,12,0.06)] px-3.5 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Minimalistic App Brand */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-tight">
            <span id="nav-brand-title" className="font-extrabold text-sm sm:text-base text-foreground tracking-tight">
              SCM - Swalpa Circular Maadi
            </span>
            <span className="text-[11px] sm:text-xs text-orange-600 dark:text-orange-300 font-semibold italic">
              Make it circular, eh?
            </span>
          </div>
        </div>

        {/* Center: Live Ecological Counter (Visible when deals approved) */}
        {approvedDeals.length > 0 && (
          <button
            onClick={() => setActiveTab('pipeline')}
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300 text-[11px] font-mono font-bold transition shadow-2xs group"
            title="Click to view full Karnataka Carbon & Resource Telematics"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
              {(totalCo2Kg / 1000).toFixed(1)} t CO₂ Avoided
            </span>
            <span className="text-emerald-300">•</span>
            <span className="flex items-center gap-1 text-blue-800 dark:text-blue-300">
              <Droplets className="w-3 h-3 text-blue-600 dark:text-blue-300" />
              {sandSavedLiters >= 1000 ? `${(sandSavedLiters / 1000).toFixed(0)}k` : sandSavedLiters} L Sand Saved
            </span>
          </button>
        )}

        {/* Right: Nav Tabs & Reset Action grouped together at rightmost */}
        <div className="flex items-center gap-2">
          <nav className="flex flex-wrap items-center gap-1 bg-muted/90 p-1 rounded-xl sm:rounded-full border border-border/60 text-xs">
            {tabs.map(({ id, label, icon: Icon, idAttr }) => (
              <Button
                key={id}
                id={idAttr}
                onClick={() => setActiveTab(id)}
                variant={activeTab === id ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'gap-1.5 rounded-lg sm:rounded-full font-semibold',
                  activeTab === id
                    ? 'shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/80'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </Button>
            ))}
          </nav>

          <Button
            id="reset-state-btn"
            onClick={onReset}
            disabled={resetting}
            variant="outline"
            size="icon"
            className="rounded-full h-8 w-8 text-muted-foreground/70 hover:text-foreground"
            title="Reset simulation data to default"
          >
            <RotateCcw className={cn('w-3.5 h-3.5', resetting && 'animate-spin text-orange-600 dark:text-orange-300')} />
          </Button>

          {onToggleDarkMode && (
            <Button
              id="dark-mode-toggle-btn"
              onClick={onToggleDarkMode}
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8 text-muted-foreground/70 hover:text-foreground"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
