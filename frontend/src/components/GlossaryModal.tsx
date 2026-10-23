import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface GlossaryTerm {
  abbr: string;
  fullName: string;
  category: 'Government & Legal' | 'Industry & Materials' | 'Supply Chain & Tech' | 'Karnataka Specific';
  explanation: string;
}

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    abbr: 'SCM',
    fullName: 'Swalpa Circular Maadi / Supply Chain Management',
    category: 'Karnataka Specific',
    explanation:
      'A friendly Kannada colloquial phrase meaning "Make it a little circular, will you?" combined with Supply Chain Management. Represents circular economy matchmaking for local factories.',
  },
  {
    abbr: 'GSTIN',
    fullName: 'Goods and Services Tax Identification Number',
    category: 'Government & Legal',
    explanation:
      'A unique 15-character statutory tax identification number assigned to every registered business in India. The first two digits represent the state code (e.g., 29 for Karnataka).',
  },
  {
    abbr: 'KSPCB',
    fullName: 'Karnataka State Pollution Control Board',
    category: 'Government & Legal',
    explanation:
      'The premier state statutory body responsible for implementing environmental pollution control laws, issuing operating clearances (CFO/CTE), and monitoring industrial byproduct handling across Karnataka.',
  },
  {
    abbr: 'CFO',
    fullName: 'Consent for Operation',
    category: 'Government & Legal',
    explanation:
      'A mandatory official statutory license issued by KSPCB under the Water (Prevention & Control of Pollution) Act and Air Act allowing an industrial plant to operate and generate specific waste outputs within legal quotas.',
  },
  {
    abbr: 'CTE',
    fullName: 'Consent to Establish',
    category: 'Government & Legal',
    explanation:
      'The initial regulatory green clearance required before constructing, expanding, or installing any factory or manufacturing unit in Karnataka.',
  },
  {
    abbr: 'XGN',
    fullName: 'Extended Green Node (Karnataka Online Portal)',
    category: 'Government & Legal',
    explanation:
      'The official online web governance portal used by KSPCB and industries across Karnataka to submit annual environmental statements, renew consents, and monitor authorized waste quotas in real time.',
  },
  {
    abbr: 'E-Way Bill',
    fullName: 'Electronic Way Bill',
    category: 'Supply Chain & Tech',
    explanation:
      'A mandatory digital travel document generated on the Karnataka Commercial Taxes GST portal for transporting goods valued over ₹50,000. It links the vehicle registration, transporter, sender, and recipient.',
  },
  {
    abbr: 'C&D Waste',
    fullName: 'Construction and Demolition Waste',
    category: 'Industry & Materials',
    explanation:
      'Waste material generated during construction, renovation, or demolition of buildings, roads, and bridges (concrete debris, bricks, stone, and plaster). Governed by C&D Waste Rules 2016.',
  },
  {
    abbr: 'RCA',
    fullName: 'Recycled Concrete Aggregate',
    category: 'Industry & Materials',
    explanation:
      'Crushed and washed aggregate recovered from concrete rubble that can replace up to 25%–50% of virgin natural sand and crushed stone gravel in structural and road construction under BIS IS:383:2016.',
  },
  {
    abbr: 'DWP',
    fullName: 'Digital Waste Passport',
    category: 'Supply Chain & Tech',
    explanation:
      'An immutable digital certificate tracking a byproduct batch from its origin factory through transport to the recycler. It proves material purity, regulatory approval, and carbon savings.',
  },
  {
    abbr: 'TSDF',
    fullName: 'Treatment, Storage, and Disposal Facility',
    category: 'Industry & Materials',
    explanation:
      'A specialized, secure hazardous waste handling and landfill facility (such as Karnataka Waste Management Project at Dobaspet) equipped to neutralize toxic industrial residues safely.',
  },
  {
    abbr: 'CETP',
    fullName: 'Common Effluent Treatment Plant',
    category: 'Industry & Materials',
    explanation:
      'A centralized industrial treatment installation (e.g., VIWA Eco-Club in Peenya) where multiple small MSME factories send their chemical wastewater for compliant collective treatment.',
  },
  {
    abbr: 'BBMP',
    fullName: 'Bruhat Bengaluru Mahanagara Palike',
    category: 'Karnataka Specific',
    explanation:
      'The municipal corporation of Greater Bengaluru that regulates civic infrastructure, waste disposal guidelines, and enforces peak-hour commercial truck entry curbs across city arteries.',
  },
  {
    abbr: 'NICE Road',
    fullName: 'Nandi Infrastructure Corridor Enterprises Road',
    category: 'Karnataka Specific',
    explanation:
      'A private tolled ring expressway on the outskirts of Bengaluru connecting Hosur Road, Bannerghatta, Kanakapura, Mysore Road, and Tumkur Road, heavily used by industrial freight trucks.',
  },
  {
    abbr: 'LOI',
    fullName: 'Loss on Ignition',
    category: 'Industry & Materials',
    explanation:
      'A laboratory test measuring the amount of unburnt carbon in thermal power plant fly ash. Lower LOI values are required for high-strength cement manufacturing.',
  },
  {
    abbr: 'XRF / XRD',
    fullName: 'X-Ray Fluorescence / X-Ray Diffraction',
    category: 'Supply Chain & Tech',
    explanation:
      'Advanced laboratory testing instruments used to analyze the precise elemental and mineral composition of slag, fly ash, and mineral residues.',
  },
  {
    abbr: 'PM10',
    fullName: 'Particulate Matter (≤10 Microns)',
    category: 'Government & Legal',
    explanation:
      'Fine inhalable dust particles suspended in air. Substituting recycled concrete and fly ash helps avoid quarry blasting and crushing dust, quantified under CSTEP Clean Air guidelines.',
  },
  {
    abbr: 'NABL',
    fullName: 'National Accreditation Board for Testing and Calibration Laboratories',
    category: 'Government & Legal',
    explanation:
      'The national autonomous body that inspects and certifies material testing laboratories in India, ensuring chemical assay certificates are legally and commercially valid.',
  },
  {
    abbr: 'CAAQMS',
    fullName: 'Continuous Ambient Air Quality Monitoring Station',
    category: 'Government & Legal',
    explanation:
      'Automated 24/7 pollution monitoring stations operated by KSPCB and CPCB (e.g. at Peenya NTTF, Silk Board, RVCE Mysore Road). They measure live PM10, PM2.5, SO2, and NOx levels. When ambient air dust spikes, triggers can restrict primary quarrying and prioritize recycled byproduct dispatch.',
  },
  {
    abbr: 'IoT Telemetry',
    fullName: 'Internet of Things Sensor Telemetry',
    category: 'Supply Chain & Tech',
    explanation:
      'Real-time industrial hopper sensors (measuring moisture % and contamination flags) and vehicle GPS tracking. High moisture (>15%) triggers price discounts; contamination flags halve usable volume; and GPS monitors compliance with BBMP truck entry curfews.',
  },
  {
    abbr: 'MSME',
    fullName: 'Micro, Small, and Medium Enterprises',
    category: 'Industry & Materials',
    explanation:
      'Small and medium manufacturing units forming the industrial backbone of clusters like Peenya, Bidadi, and Dobaspet.',
  },
];

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Government & Legal', 'Karnataka Specific', 'Industry & Materials', 'Supply Chain & Tech'];

  const filtered = GLOSSARY_TERMS.filter((term) => {
    if (selectedCategory !== 'all' && term.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        term.abbr.toLowerCase().includes(q) ||
        term.fullName.toLowerCase().includes(q) ||
        term.explanation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="glossary-modal"
        className="w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2 text-[#ea580c]">
            <BookOpen className="w-5 h-5" />
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
              Index of Abbreviations & Terms
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-foreground">
            Plain-English Glossary (No Technical Dictionary Needed)
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Clear definitions for all government permits, environmental rules, industrial abbreviations, and local Karnataka terms.
          </DialogDescription>
        </DialogHeader>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground/70 absolute left-3.5 top-3 z-10" />
            <Input
              type="text"
              placeholder="Search abbreviation or term (e.g. GSTIN, KSPCB, XGN, CFO, BBMP)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                size="sm"
                className="rounded-xl whitespace-nowrap"
              >
                {cat === 'all' ? 'All Terms' : cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Term Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((item) => (
            <div
              key={item.abbr}
              className="p-4 rounded-2xl border border-border bg-muted/50 hover:bg-orange-50/30 dark:hover:bg-orange-950/40 hover:border-orange-200 dark:hover:border-orange-800/60 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#ea580c] font-mono bg-orange-100/80 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-lg">
                  {item.abbr}
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {item.category}
                </Badge>
              </div>
              <div className="font-bold text-xs sm:text-sm text-foreground">{item.fullName}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 text-center py-10 text-xs text-muted-foreground/70">
              No matching abbreviation found for "{search}".
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="!mx-0 !mb-0 !rounded-none !border-0 !bg-transparent !p-0 pt-2 border-t border-border flex-row items-center justify-between text-xs text-muted-foreground/70">
          <span>{filtered.length} terms in index</span>
          <Button onClick={onClose} className="font-bold rounded-xl">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
