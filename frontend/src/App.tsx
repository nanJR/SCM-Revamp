import React, { useState, useEffect } from 'react';
import { Navbar, Tab } from './components/Navbar';
import { InsightsTab } from './components/InsightsTab';
import { AuditTab } from './components/AuditTab';
import { WorkspaceTab } from './components/WorkspaceTab';
import { api, Health } from './lib/api';
import { useSession } from './lib/session';
import { FacilitiesTab } from './components/FacilitiesTab';
import { FleetTab } from './components/FleetTab';
import { PipelineTab } from './components/PipelineTab';
import { TranscriptsTab } from './components/TranscriptsTab';
import { LedgerTab } from './components/LedgerTab';
import { ArchitectureStandardsModal } from './components/ArchitectureStandardsModal';
import { HonestLimitationsModal } from './components/HonestLimitationsModal';
import { GlossaryModal } from './components/GlossaryModal';
import { Carrier, DigitalWastePassport, DisposalResult, Facility, LedgerVerification, PipelineItemResult } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>(
    (new URLSearchParams(window.location.search).get('tab') as Tab) || 'facilities'
  );
  const [health, setHealth] = useState<Health | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { session, profile } = useSession();
  const userId = session?.user.id ?? null;
  // Mirrors the API's rules: with sign-in enforced, only staff run matching and only admins reset.
  const authOn = health?.auth === 'required';
  const canRun = !authOn || profile?.role === 'regulator' || profile?.role === 'admin';
  const canReset = !authOn || profile?.role === 'admin';
  const [runCount, setRunCount] = useState<number>(0);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState<boolean>(false);
  const [isLimitationsModalOpen, setIsLimitationsModalOpen] = useState<boolean>(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState<boolean>(false);
  const [facilities, setFacilities] = useState<Record<string, Facility>>({});
  const [carriers, setCarriers] = useState<Record<string, Carrier>>({});
  const [results, setResults] = useState<PipelineItemResult[]>([]);
  const [disposals, setDisposals] = useState<DisposalResult[]>([]);
  const [passports, setPassports] = useState<DigitalWastePassport[]>([]);
  const [verification, setVerification] = useState<LedgerVerification | null>(null);
  const [hasUserVerified, setHasUserVerified] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState<number>(0);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (window.location.hash === '#dark') return true;
    try {
      return localStorage.getItem('scm-dark-mode') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('scm-dark-mode', darkMode ? '1' : '0');
    } catch {
      // ignore
    }
  }, [darkMode]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [fac, car, res, disp, led, h] = await Promise.all([
        api.facilities(),
        api.carriers(),
        api.results(),
        api.disposals(),
        api.ledger(),
        api.health(),
      ]);
      setFacilities(fac);
      setCarriers(car);
      setResults(res);
      setDisposals(disp);
      setPassports(led.passports);
      setVerification(led.verification);
      setHealth(h);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // What the API returns depends on who is signed in, so reload on sign-in and sign-out.
  // An error from the previous account no longer applies, so clear it too.
  useEffect(() => {
    setNotice(null);
    loadInitialData();
  }, [userId]);

  const handleUpdateSensor = async (facilityId: string, moisture: number, contamination: boolean) => {
    const facility = await api.updateSensor(facilityId, moisture, contamination);
    setFacilities((prev) => ({ ...prev, [facilityId]: facility }));
  };

  const handleDescribeFacility = async (id: string): Promise<string> => {
    try {
      return (await api.describeFacility(id)).description;
    } catch {
      return 'Facility assessment unavailable.';
    }
  };

  const handleAddFacility = async (facilityData: Partial<Facility>) => {
    const facility = await api.addFacility(facilityData);
    setFacilities((prev) => ({ ...prev, [facility.id]: facility }));
  };

  const handleRunPipeline = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const run = await api.runPipeline();
      const led = await api.ledger();
      setResults(run.items);
      setDisposals(run.disposals);
      setPassports(led.passports);
      setVerification(led.verification);
      setHasUserVerified(false);
      setSelectedTranscriptIndex(0);
      setRunCount((n) => n + 1);
    } catch (err) {
      console.error('Error running pipeline:', err);
      setNotice(`Couldn't run matching: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  // Restores the seed facilities. With the Supabase store the passport ledger
  // is append-only and survives a reset.
  const handleReset = async () => {
    setResetting(true);
    setNotice(null);
    try {
      await api.reset();
      const [fac, led] = await Promise.all([api.facilities(), api.ledger()]);
      setFacilities(fac);
      setResults([]);
      setDisposals([]);
      setPassports(led.passports);
      setVerification(led.verification);
      setHasUserVerified(false);
    } catch (err) {
      console.error('Failed to reset:', err);
      setNotice(`Couldn't reset: ${(err as Error).message}`);
    } finally {
      setResetting(false);
    }
  };

  const handleVerifyLedger = async () => {
    setVerifying(true);
    try {
      const data = await api.verifyLedger();
      setVerification(data);
      if (data.valid) setHasUserVerified(true);
    } catch (err) {
      console.error('Verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-dot-pattern text-foreground flex flex-col font-sans selection:bg-[#ff5d02] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={canReset ? handleReset : undefined}
        resetting={resetting}
        onOpenStandards={() => setIsStandardsModalOpen(true)}
        onOpenLimitations={() => setIsLimitationsModalOpen(true)}
        onOpenGlossary={() => setIsGlossaryModalOpen(true)}
        results={results}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {notice && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <span>{notice}</span>
            <button className="text-xs underline" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </div>
        )}
        {health?.auth === 'required' && !userId && (
          <div className="mb-4 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground">
            You are signed out, so deals, passports and prices are hidden. Sign in from My Desk to see your own.
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground text-sm font-medium">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ea580c] mr-3"></div>
            Loading Karnataka industrial symbiosis network & real entity models...
          </div>
        ) : (
          <>
            {activeTab === 'facilities' && (
              <FacilitiesTab
                facilities={facilities}
                onUpdateSensor={handleUpdateSensor}
                onDescribeFacility={handleDescribeFacility}
                onAddFacility={handleAddFacility}
                onRunPipelineNav={() => setActiveTab('pipeline')}
                onOpenStandards={() => setIsStandardsModalOpen(true)}
              />
            )}

            {activeTab === 'fleet' && <FleetTab carriers={carriers} />}

            {activeTab === 'pipeline' && (
              <PipelineTab
                results={results}
                onRunPipeline={canRun ? handleRunPipeline : undefined}
                running={running}
                onSelectTranscript={(idx) => {
                  setSelectedTranscriptIndex(idx);
                  setActiveTab('transcripts');
                }}
                onViewPassport={() => setActiveTab('ledger')}
              />
            )}

            {activeTab === 'transcripts' && (
              <TranscriptsTab
                results={results}
                selectedIndex={selectedTranscriptIndex}
                onSelectIndex={setSelectedTranscriptIndex}
              />
            )}

            {activeTab === 'ledger' && (
              <LedgerTab
                passports={passports}
                verification={verification}
                onVerify={handleVerifyLedger}
                verifying={verifying}
                hasUserVerified={hasUserVerified}
                onNavigateMatchDeals={() => setActiveTab('pipeline')}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsTab results={results} disposals={disposals} onRunPipelineNav={() => setActiveTab('pipeline')} />
            )}

            {activeTab === 'audit' && <AuditTab refreshKey={runCount} />}

            {activeTab === 'workspace' && (
              <WorkspaceTab
                facilities={facilities}
                carriers={carriers}
                results={results}
                disposals={disposals}
                onRunPipelineNav={() => setActiveTab('pipeline')}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-orange-200/70 dark:border-orange-800/60 bg-card/90 backdrop-blur-xs py-6 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground/70 font-medium">
            <div>
              SCM - Swalpa Circular Maadi • Industrial Byproduct Symbiosis Network across Karnataka
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsLimitationsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Honest Limitations (Simulated vs Production)
              </button>
              <button
                onClick={() => setIsStandardsModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Regulatory Rules (KSPCB / CPCB)
              </button>
              <button
                onClick={() => setIsGlossaryModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-orange-100 dark:hover:bg-orange-950/40 text-muted-foreground hover:text-orange-950 dark:hover:text-orange-300 font-semibold border border-border transition"
              >
                Glossary
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/70">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${health ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
              <span className="font-semibold text-muted-foreground">
                {health?.store === 'SupabaseStore' ? 'Supabase (Postgres + PostGIS)' : 'In-memory demo store'}
              </span>
              <span className="text-stone-300">•</span>
              <span>Python agents via FastAPI</span>
            </div>
            <div className="font-mono text-[10px] text-muted-foreground/70">
              Explanations: <span className="text-muted-foreground font-semibold">{health?.llm ?? 'offline'}</span>
            </div>
          </div>
        </div>
      </footer>

      <ArchitectureStandardsModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
      />

      <HonestLimitationsModal
        isOpen={isLimitationsModalOpen}
        onClose={() => setIsLimitationsModalOpen(false)}
      />

      <GlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
      />
    </div>
  );
}

export default App;
