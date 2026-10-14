import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Phone, 
  Copy, 
  Check, 
  Trash2, 
  Save, 
  Calendar, 
  DollarSign, 
  Building,
  User,
  Clock,
  Layers,
  FileText
} from 'lucide-react';
import type { EnquiryRecord } from '../../types';

interface EnquiryDetailModalProps {
  enquiry: EnquiryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, updates: { status?: string; admin_notes?: string }) => Promise<void>;
  onDeleteRequest: (enquiry: EnquiryRecord) => void;
}

export const EnquiryDetailModal: React.FC<EnquiryDetailModalProps> = ({
  enquiry,
  isOpen,
  onClose,
  onUpdate,
  onDeleteRequest
}) => {
  if (!isOpen || !enquiry) return null;

  const [status, setStatus] = useState<string>(enquiry.status);
  const [adminNotes, setAdminNotes] = useState<string>(enquiry.admin_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setStatus(enquiry.status);
    setAdminNotes(enquiry.admin_notes || '');
    setSaveSuccess(false);
  }, [enquiry]);

  const copyToClipboard = (text: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await onUpdate(enquiry.id, {
        status,
        admin_notes: adminNotes
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  let servicesList: string[] = [];
  try {
    const parsed = JSON.parse(enquiry.requested_services);
    if (Array.isArray(parsed)) servicesList = parsed;
    else if (typeof enquiry.requested_services === 'string') servicesList = [enquiry.requested_services];
  } catch {
    servicesList = [enquiry.requested_services];
  }

  const statuses = ['New', 'Contacted', 'In Progress', 'Completed', 'Archived'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl flex flex-col">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-[#0B0B0B] border-b border-[#252525] px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#050505] border border-[#252525] font-mono text-xs text-[#C7FF4D]">
              ENQ-#{enquiry.id}
            </span>
            <h2 className="text-xl font-bold text-white truncate max-w-md">
              {enquiry.full_name}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDeleteRequest(enquiry)}
              className="p-2 rounded-lg text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-500/40 transition-colors"
              title="Delete Enquiry"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#A5A5A5] hover:text-white hover:bg-[#161616] border border-[#252525] transition-colors"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-8 flex-1">
          
          {/* Quick Contact & Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Email Box */}
            <div className="bg-[#050505] border border-[#252525] rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1 overflow-hidden pr-2">
                <span className="text-[11px] font-mono text-[#A5A5A5] uppercase tracking-wider block">
                  Customer Email
                </span>
                <a
                  href={`mailto:${enquiry.email}`}
                  className="text-sm font-medium text-white hover:text-[#C7FF4D] transition-colors truncate block"
                >
                  {enquiry.email}
                </a>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(enquiry.email, 'email')}
                  className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D] text-[#A5A5A5] hover:text-white transition-colors"
                  title="Copy email address"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-[#C7FF4D]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`mailto:${enquiry.email}`}
                  className="p-2 rounded-lg bg-[#C7FF4D] text-[#050505] hover:bg-[#d4ff70] transition-colors font-medium"
                  title="Compose email draft"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Phone Box */}
            <div className="bg-[#050505] border border-[#252525] rounded-xl p-4 flex items-center justify-between">
              <div className="space-y-1 overflow-hidden pr-2">
                <span className="text-[11px] font-mono text-[#A5A5A5] uppercase tracking-wider block">
                  Customer Phone
                </span>
                <span className="text-sm font-medium text-white truncate block">
                  {enquiry.phone || 'Not provided'}
                </span>
              </div>
              {enquiry.phone && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => copyToClipboard(enquiry.phone, 'phone')}
                    className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D] text-[#A5A5A5] hover:text-white transition-colors"
                    title="Copy phone number"
                  >
                    {copiedPhone ? <Check className="w-3.5 h-3.5 text-[#C7FF4D]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a
                    href={`tel:${enquiry.phone}`}
                    className="p-2 rounded-lg bg-[#C7FF4D] text-[#050505] hover:bg-[#d4ff70] transition-colors font-medium"
                    title="Call customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* Metadata Meta Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#050505] border border-[#252525] text-xs">
            <div>
              <span className="text-[#A5A5A5] block mb-1">Business:</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#C7FF4D]" />
                <span className="truncate">{enquiry.business_name || 'Individual / None'}</span>
              </span>
            </div>
            <div>
              <span className="text-[#A5A5A5] block mb-1">Submitted:</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#C7FF4D]" />
                <span>{new Date(enquiry.created_at).toLocaleDateString()}</span>
              </span>
            </div>
            <div>
              <span className="text-[#A5A5A5] block mb-1">Budget Target:</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#C7FF4D]" />
                <span>{enquiry.budget || 'Not specified'}</span>
              </span>
            </div>
            <div>
              <span className="text-[#A5A5A5] block mb-1">Last Updated:</span>
              <span className="text-[#A5A5A5] font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C7FF4D]" />
                <span>{new Date(enquiry.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </div>
          </div>

          {/* Requested Services */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#C7FF4D]" />
              <span>Requested Services</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {servicesList.length > 0 ? (
                servicesList.map((service, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 rounded-lg bg-[#050505] text-[#C7FF4D] border border-[#252525] text-xs font-medium"
                  >
                    {service}
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#A5A5A5]">No specific services selected</span>
              )}
            </div>
          </div>

          {/* Project Details Description */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-[#C7FF4D]" />
              <span>Project Details & Requirements</span>
            </h4>
            <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] text-sm text-[#FFFFFF] leading-relaxed whitespace-pre-wrap">
              {enquiry.project_details}
            </div>
          </div>

          {/* Website Cost Estimator Breakdown (Version 5.8) */}
          {enquiry.estimate_data && (() => {
            let parsedData: any = null;
            try {
              parsedData = typeof enquiry.estimate_data === 'string'
                ? JSON.parse(enquiry.estimate_data)
                : enquiry.estimate_data;
            } catch {
              parsedData = null;
            }

            if (!parsedData) return null;
            const breakdown = parsedData.breakdown || parsedData;

            return (
              <div className="rounded-xl border border-[#C7FF4D]/30 bg-[#070b04] p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#C7FF4D] animate-pulse" />
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#C7FF4D] font-bold">
                      Website Cost Estimator Breakdown
                    </h4>
                  </div>
                  {enquiry.estimate_ref_id && (
                    <span className="px-2 py-0.5 rounded bg-[#050505] border border-[#252525] font-mono text-xs text-white">
                      Ref: {enquiry.estimate_ref_id}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-[#050505] p-3 rounded-lg border border-[#252525]">
                    <span className="text-[#A5A5A5] block">Website Type</span>
                    <span className="text-white font-semibold capitalize mt-1 block">
                      {parsedData.selections?.websiteType?.replace('-', ' ') || 'Website'}
                    </span>
                  </div>
                  <div className="bg-[#050505] p-3 rounded-lg border border-[#252525]">
                    <span className="text-[#A5A5A5] block">Total Pages</span>
                    <span className="text-white font-semibold mt-1 block">
                      {parsedData.selections?.pageCount || 1} pages
                    </span>
                  </div>
                  <div className="bg-[#050505] p-3 rounded-lg border border-[#252525]">
                    <span className="text-[#A5A5A5] block">Design Tier</span>
                    <span className="text-white font-semibold capitalize mt-1 block">
                      {parsedData.selections?.designTier || 'standard'}
                    </span>
                  </div>
                  <div className="bg-[#050505] p-3 rounded-lg border border-[#252525]">
                    <span className="text-[#A5A5A5] block">Timeline</span>
                    <span className="text-white font-semibold capitalize mt-1 block">
                      {parsedData.selections?.timeline?.replace('-', ' ') || 'standard'}
                    </span>
                  </div>
                </div>

                {/* Line items table */}
                {breakdown?.lineItems && breakdown.lineItems.length > 0 && (
                  <div className="border border-[#252525] rounded-lg overflow-hidden bg-[#050505]">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0e0e0e] text-[#A5A5A5] uppercase font-mono text-[10px] border-b border-[#252525]">
                        <tr>
                          <th className="px-3 py-2">Item Description</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Cost (INR)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#252525]/60 text-white">
                        {breakdown.lineItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-[#0c0c0c]">
                            <td className="px-3 py-2">{item.description}</td>
                            <td className="px-3 py-2 text-right text-[#A5A5A5]">{item.quantity}</td>
                            <td className="px-3 py-2 text-right font-mono text-[#C7FF4D]">
                              ₹{item.total?.toLocaleString('en-IN') || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                  <div>
                    {breakdown?.recurringMonthly > 0 ? (
                      <span className="text-[#A5A5A5]">
                        Recurring Maintenance: <span className="text-amber-400 font-mono font-semibold">₹{breakdown.recurringMonthly.toLocaleString('en-IN')}/mo</span>
                      </span>
                    ) : (
                      <span className="text-[#A5A5A5]">No recurring maintenance selected</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono text-[#A5A5A5]">Calculated Total:</span>
                    <span className="text-lg font-bold font-mono text-[#C7FF4D]">
                      {breakdown?.requiresCustomQuote
                        ? 'Custom Enterprise Quote'
                        : `₹${(breakdown?.estimatedTotal || 0).toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Manage Status & Private Administrator Notes */}
          <div className="pt-6 border-t border-[#252525] space-y-5">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#C7FF4D] font-bold">
              // Administrative Controls & Notes
            </h4>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                Enquiry Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statuses.map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      status === st
                        ? 'bg-[#C7FF4D] text-[#050505] font-bold border-[#C7FF4D]'
                        : 'bg-[#050505] text-[#A5A5A5] hover:text-white border-[#252525]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Private Notes */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#A5A5A5] mb-2">
                Private Admin Notes <span className="text-[#555]">(Visible only to authenticated team)</span>
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Add confidential notes on client budget discussions, call logs, next actions..."
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D] transition-colors"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {saveSuccess && (
                  <span className="text-xs text-[#C7FF4D] font-mono flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Enquiry changes saved to database!</span>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

