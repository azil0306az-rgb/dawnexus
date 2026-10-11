import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { EnquiryRecord } from '../../types';

interface DeleteConfirmModalProps {
  enquiry: EnquiryRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  enquiry,
  isOpen,
  onClose,
  onConfirm,
  isDeleting
}) => {
  if (!isOpen || !enquiry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B0B0B] border border-red-500/40 rounded-2xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-[#A5A5A5] hover:text-white hover:bg-[#161616] border border-[#252525] transition-colors"
          disabled={isDeleting}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Delete Enquiry #{enquiry.id}</h3>
            <p className="text-xs text-[#A5A5A5] mt-0.5">Permanent record removal</p>
          </div>
        </div>

        <p className="text-sm text-[#A5A5A5] leading-relaxed">
          Are you sure you want to permanently delete the enquiry from <strong className="text-white">{enquiry.full_name}</strong>? This action cannot be undone and will remove all associated notes.
        </p>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252525]">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

