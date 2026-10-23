import React, { useState } from 'react';
import { CircularPurchaseOrder, EWayBill, HazardousManifestForm10, SettlementRecord } from '../types';
import {
  FileText,
  Truck,
  ShieldAlert,
  Printer,
  CheckCircle,
  Copy,
  Check,
  DollarSign,
  AlertTriangle,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: CircularPurchaseOrder;
  ewayBill?: EWayBill;
  hazardManifest?: HazardousManifestForm10;
  settlement?: SettlementRecord;
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  ewayBill,
  hazardManifest,
  settlement,
}) => {
  const [activeTab, setActiveTab] = useState<'po' | 'eway' | 'hazard'>('po');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen && Boolean(contract || ewayBill)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh] gap-0 [&>button]:z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-orange-950/30 border-b border-orange-200/80 dark:border-orange-800/60 p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ea580c]">
                LEGAL & STATUTORY DISPATCH DOCUMENTATION
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                Circular Purchase Order & GST E-Way Bill
              </h2>
            </div>
          </div>

          <Button
            onClick={() => window.print()}
            variant="outline"
            size="icon"
            className="rounded-xl mr-8"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 min-h-0 flex flex-col gap-0">
          {/* Tab Selector */}
          <TabsList variant="line" className="border-b border-border px-6 pt-3 bg-muted shrink-0 gap-2 h-auto rounded-none w-full justify-start">
            {contract && (
              <TabsTrigger value="po" className="pb-3 px-4 text-xs font-bold gap-2 rounded-none data-active:border-b-2 data-active:border-[#ff5d02] data-active:text-[#ff5d02] data-active:shadow-none">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Purchase Order & Tax Invoice</span>
              </TabsTrigger>
            )}

            {ewayBill && (
              <TabsTrigger value="eway" className="pb-3 px-4 text-xs font-bold gap-2 rounded-none data-active:border-b-2 data-active:border-[#ff5d02] data-active:text-[#ff5d02] data-active:shadow-none">
                <Truck className="w-3.5 h-3.5" />
                <span>GST E-Way Bill (INS-01)</span>
              </TabsTrigger>
            )}

            {hazardManifest && (
              <TabsTrigger value="hazard" className="pb-3 px-4 text-xs font-bold gap-2 rounded-none data-active:border-b-2 data-active:border-[#ff5d02] data-active:text-[#ff5d02] data-active:shadow-none">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                <span>Hazardous Manifest (Form 10)</span>
              </TabsTrigger>
            )}
          </TabsList>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-foreground">
          {activeTab === 'po' && contract && (
            <div className="space-y-6 font-sans">
              {/* PO Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border gap-3">
                <div>
                  <div className="text-xs text-muted-foreground/70 font-mono uppercase">PO Identifier</div>
                  <div className="text-base font-extrabold text-foreground font-mono flex items-center gap-2">
                    <span>{contract.po_number}</span>
                    <button
                      onClick={() => handleCopy(contract.po_number)}
                      className="p-1 text-muted-foreground/70 hover:text-muted-foreground transition"
                      title="Copy PO Number"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground/70 font-mono">
                  <span>Issued Date: </span>
                  <strong className="text-foreground">{contract.date_issued}</strong>
                </div>
              </div>

              {/* Bilateral Parties */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    SUPPLIER / SELLER (DISPATCHING UNIT)
                  </span>
                  <h4 className="font-bold text-foreground text-sm">{contract.seller_name}</h4>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    GSTIN: <span className="font-bold text-[#ea580c]">{contract.seller_gstin}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5">State: 29 - Karnataka (CGST & SGST Applicable)</div>
                </div>

                <div className="p-4 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/70 block mb-1">
                    BUYER / OFF-TAKER (VALORIZATION UNIT)
                  </span>
                  <h4 className="font-bold text-foreground text-sm">{contract.buyer_name}</h4>
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    GSTIN: <span className="font-bold text-[#ea580c]">{contract.buyer_gstin}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 mt-0.5">State: 29 - Karnataka (Intra-state Supply)</div>
                </div>
              </div>

              {/* Line Item Table */}
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-semibold border-b border-border font-mono">
                    <tr>
                      <th className="p-3">Description of Secondary Good</th>
                      <th className="p-3">HSN Code</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Rate / Ton</th>
                      <th className="p-3 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    <tr>
                      <td className="p-3 font-sans font-medium text-foreground">
                        {contract.material_description}
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Assay Ref: {contract.quality_assay_ref}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{contract.hsn_sac_code}</td>
                      <td className="p-3 text-right font-bold text-foreground">{contract.quantity_tons} Tons</td>
                      <td className="p-3 text-right font-bold text-foreground">₹{contract.unit_price_inr}</td>
                      <td className="p-3 text-right font-bold text-foreground">₹{contract.subtotal_inr.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax Calculations */}
              <div className="flex flex-col md:flex-row md:justify-end">
                <div className="w-full md:w-80 space-y-2 p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxable Subtotal:</span>
                    <span>₹{contract.subtotal_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST ({contract.gst_rate_pct / 2}%):</span>
                    <span>₹{contract.cgst_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST ({contract.gst_rate_pct / 2}%):</span>
                    <span>₹{contract.sgst_inr.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-orange-200 dark:border-orange-800/60 text-foreground font-bold text-sm">
                    <span>Total Invoice Value:</span>
                    <span className="text-[#ea580c]">₹{contract.total_invoice_inr.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Freight Line Item (Logistics/Carrier Negotiation Agent) */}
              {contract.freight_line_item && (
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200 text-xs space-y-3">
                  <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-sky-600" />
                    <span>Freight & Logistics Line Item</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground/70 block">Carrier</span>
                      <span className="font-bold text-foreground">
                        {contract.freight_line_item.carrier_name} ({contract.freight_line_item.vehicle_type})
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 block">Rate & Distance</span>
                      <span className="font-bold text-foreground font-mono">
                        ₹{contract.freight_line_item.rate_inr_per_ton_km}/ton-km × {contract.freight_line_item.distance_km} km
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 font-mono pt-2 border-t border-sky-200">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Freight Subtotal:</span>
                      <span>₹{contract.freight_line_item.freight_subtotal_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST ({contract.freight_line_item.freight_gst_rate_pct / 2}%):</span>
                      <span>₹{contract.freight_line_item.freight_cgst_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST ({contract.freight_line_item.freight_gst_rate_pct / 2}%):</span>
                      <span>₹{contract.freight_line_item.freight_sgst_inr.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-sky-200 text-foreground font-bold text-sm">
                      <span>Freight Total:</span>
                      <span className="text-sky-700">₹{contract.freight_line_item.freight_total_inr.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Settlement & Escrow Agent */}
              {settlement && (
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-3">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
                    <span>Smart Escrow Settlement: {settlement.escrow_voucher_id}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2.5 rounded-lg bg-card border border-emerald-200 dark:border-emerald-800/60">
                      <span className="text-muted-foreground/70 block font-sans">T+0 Advance ({settlement.advance_pct}%)</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">₹{settlement.advance_inr.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-muted-foreground/70 block font-sans">{settlement.advance_upi_ref}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border border-emerald-200 dark:border-emerald-800/60">
                      <span className="text-muted-foreground/70 block font-sans">Balance on Delivery</span>
                      <span className="font-bold text-foreground text-sm">₹{settlement.balance_inr.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-muted-foreground/70 block font-sans">{settlement.balance_release_condition}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-sans">
                    Middleman ("katoti") deduction capped at {settlement.katoti_cap_pct}% — well below traditional uncapped deductions.
                  </div>
                </div>
              )}

              {/* Legal Terms & Demurrage */}
              <div className="p-4 rounded-2xl bg-muted border border-border text-xs space-y-2 text-muted-foreground">
                <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                  <span>Statutory Terms & Demurrage Clauses</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                  <div>
                    <span className="font-semibold text-foreground">Payment & Weighbridge: </span>
                    {contract.payment_terms}
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Demurrage Policy: </span>
                    {contract.demurrage_clause}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'eway' && ewayBill && (
            <div className="space-y-5 font-sans">
              {/* E-Way Bill Barcode Header */}
              <div className="p-4 rounded-2xl bg-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                    GOVERNMENT OF INDIA • GST E-WAY BILL SYSTEM
                  </div>
                  <div className="text-xl font-mono font-extrabold text-white mt-0.5 tracking-wider">
                    {ewayBill.eway_bill_number}
                  </div>
                  <div className="text-[11px] text-stone-300 mt-1">
                    Generated Date: {ewayBill.generated_date} • Valid Until: {ewayBill.valid_until}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-stone-800 border border-stone-700 flex items-center gap-2 self-start sm:self-auto font-mono text-[11px] text-emerald-300">
                  <QrCode className="w-6 h-6 text-white shrink-0" />
                  <span>GST-29-INS-01 VALIDATED</span>
                </div>
              </div>

              {/* Transportation Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Vehicle Number</span>
                  <span className="text-sm font-extrabold text-foreground font-mono mt-0.5 block">
                    {ewayBill.vehicle_number}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">Commercial Multi-Axle</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Transporter Name</span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block">
                    {ewayBill.transporter_name}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground/70">{ewayBill.transporter_id}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Dispatch Window</span>
                  <span className="text-xs font-bold text-[#ea580c] font-mono mt-0.5 block">
                    {ewayBill.dispatch_window}
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">Peak Traffic Compliant</span>
                </div>
              </div>

              {/* Road Corridor & Toll Gate Path */}
              <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-xs space-y-2">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#ea580c]" />
                  <span>Designated Industrial Road Corridor: {ewayBill.corridor_name}</span>
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  <strong>Origin → Destination: </strong>
                  {ewayBill.origin_cluster} Industrial Area → {ewayBill.destination_cluster} Industrial Area ({ewayBill.distance_km} km)
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                  <strong>Toll Gates Traversed: </strong>
                  {ewayBill.toll_route}
                </div>
              </div>

              {/* Digital Barcode Data */}
              <div className="p-3 rounded-xl bg-muted border border-border text-[10px] font-mono text-muted-foreground break-all">
                <span className="font-bold text-foreground">2D Encoded Barcode Payload: </span>
                {ewayBill.digital_barcode_data}
              </div>
            </div>
          )}

          {activeTab === 'hazard' && hazardManifest && (
            <div className="space-y-4 font-sans">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">
                    KSPCB Form 10 - Hazardous Waste Manifest (Rule 19)
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                    Governed under the Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016. Required for all inter-facility movements of Category II & IV industrial residues.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Manifest Number</span>
                  <span className="text-sm font-extrabold text-foreground font-mono mt-0.5 block">
                    {hazardManifest.manifest_number}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Sender KSPCB Authorization</span>
                  <span className="text-xs font-bold text-foreground font-mono mt-0.5 block">
                    {hazardManifest.sender_authorization}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Receiver / TSDF Authorization</span>
                  <span className="text-xs font-bold text-foreground font-mono mt-0.5 block">
                    {hazardManifest.receiver_authorization}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-muted border border-border">
                  <span className="text-[10px] font-mono text-muted-foreground/70 uppercase font-bold block">Hazardous Carrier Vehicle</span>
                  <span className="text-xs font-bold text-foreground font-mono mt-0.5 block">
                    {hazardManifest.transporter_vehicle}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-muted border border-border text-xs space-y-2">
                <span className="font-bold text-foreground block">Emergency TREM Card & Spillage Response:</span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {hazardManifest.emergency_procedure_guide}
                </p>
                <div className="pt-2 border-t border-border text-[11px] text-muted-foreground/70 font-mono">
                  Color Routing: {hazardManifest.color_code}
                </div>
              </div>
            </div>
          )}
        </div>
        </Tabs>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
            <span>Cryptographically anchored in Digital Waste Passport</span>
          </div>

          <Button onClick={onClose} variant="default" className="bg-foreground text-background hover:bg-foreground/90 rounded-xl">
            Close Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
