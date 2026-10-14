import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Briefcase,
  Plus,
  ExternalLink,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  Upload,
  Globe,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  X
} from 'lucide-react';

export interface ClientPortfolioItem {
  id: number;
  client_name: string;
  website_url: string;
  logo_url: string;
  hero_preview_url: string;
  service_category?: string;
  description?: string;
  display_order: number;
  status: 'Draft' | 'Published';
  created_at: string;
  updated_at: string;
}

export const ClientShowcaseManager: React.FC = () => {
  const [clients, setClients] = useState<ClientPortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientPortfolioItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientPortfolioItem | null>(null);

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [heroPreviewUrl, setHeroPreviewUrl] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');

  // Preview & Processing state
  const [isAutoCapturing, setIsAutoCapturing] = useState(false);
  const [autoCaptureError, setAutoCaptureError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all clients
  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/clients', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data.items || []);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to load client portfolio entries.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading clients.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Open modal for Create or Edit
  const openAddModal = () => {
    setEditingClient(null);
    setClientName('');
    setWebsiteUrl('');
    setLogoUrl('');
    setHeroPreviewUrl('');
    setServiceCategory('Website Design & Development');
    setDescription('');
    setStatus('Draft');
    setFormErrors({});
    setAutoCaptureError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: ClientPortfolioItem) => {
    setEditingClient(client);
    setClientName(client.client_name);
    setWebsiteUrl(client.website_url);
    setLogoUrl(client.logo_url);
    setHeroPreviewUrl(client.hero_preview_url);
    setServiceCategory(client.service_category || 'Website Design & Development');
    setDescription(client.description || '');
    setStatus(client.status);
    setFormErrors({});
    setAutoCaptureError(null);
    setIsModalOpen(true);
  };

  // Convert File to base64 data URL with client-side image compression
  const processImageUpload = (file: File, maxDim: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Logos: clean PNG/JPEG up to 600px
      const dataUrl = await processImageUpload(file, 600, 0.9);
      setLogoUrl(dataUrl);
      setFormErrors(prev => ({ ...prev, logoUrl: '' }));
    } catch (err: any) {
      alert('Failed to process logo file: ' + err.message);
    }
  };

  const handleHeroFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // Screenshots: up to 1600px width with 0.82 compression
      const dataUrl = await processImageUpload(file, 1600, 0.82);
      setHeroPreviewUrl(dataUrl);
      setFormErrors(prev => ({ ...prev, heroPreviewUrl: '' }));
      setAutoCaptureError(null);
    } catch (err: any) {
      alert('Failed to process screenshot file: ' + err.message);
    }
  };

  // Trigger Automatic Screenshot Capture via server
  const handleAutoCapture = async () => {
    if (!websiteUrl || !websiteUrl.trim()) {
      setFormErrors(prev => ({ ...prev, websiteUrl: 'Please enter a valid website URL first.' }));
      return;
    }

    setIsAutoCapturing(true);
    setAutoCaptureError(null);

    try {
      let formattedUrl = websiteUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
        setWebsiteUrl(formattedUrl);
      }

      const res = await fetch('/api/admin/clients/auto-preview', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formattedUrl })
      });

      const data = await res.json();
      if (res.ok && data.previewUrl) {
        setHeroPreviewUrl(data.previewUrl);
        setFormErrors(prev => ({ ...prev, heroPreviewUrl: '' }));
      } else {
        setAutoCaptureError(data.error || 'Automatic capture was unable to capture this website. Please upload a screenshot manually.');
      }
    } catch (err: any) {
      setAutoCaptureError('Capture request timed out. Please upload a screenshot manually.');
    } finally {
      setIsAutoCapturing(false);
    }
  };

  // Form Validation
  const validateForm = (targetStatus: 'Draft' | 'Published'): boolean => {
    const errs: Record<string, string> = {};

    if (!clientName.trim()) {
      errs.clientName = 'Client company name is required.';
    }

    if (!websiteUrl.trim()) {
      errs.websiteUrl = 'Client website URL is required.';
    } else {
      let urlCheck = websiteUrl.trim();
      if (!/^https?:\/\//i.test(urlCheck)) {
        urlCheck = 'https://' + urlCheck;
      }
      try {
        const parsed = new URL(urlCheck);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          errs.websiteUrl = 'Website URL must use http:// or https://.';
        }
      } catch {
        errs.websiteUrl = 'Please enter a valid website URL.';
      }
    }

    if (targetStatus === 'Published') {
      if (!logoUrl.trim()) {
        errs.logoUrl = 'Client logo is required before publishing.';
      }
      if (!heroPreviewUrl.trim()) {
        errs.heroPreviewUrl = 'Website hero preview is required before publishing.';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save or Publish
  const handleSave = async (targetStatus?: 'Draft' | 'Published') => {
    const finalStatus = targetStatus || status;
    if (!validateForm(finalStatus)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    let cleanUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const payload = {
      client_name: clientName.trim(),
      website_url: cleanUrl,
      logo_url: logoUrl.trim(),
      hero_preview_url: heroPreviewUrl.trim(),
      service_category: serviceCategory.trim(),
      description: description.trim(),
      status: finalStatus
    };

    try {
      const url = editingClient
        ? `/api/admin/clients/${editingClient.id}`
        : '/api/admin/clients';
      const method = editingClient ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(
          editingClient
            ? `Client "${payload.client_name}" updated successfully.`
            : `Client "${payload.client_name}" added successfully.`
        );
        setTimeout(() => setSuccessMsg(null), 4000);
        setIsModalOpen(false);
        fetchClients();
      } else {
        setError(data.error || 'Failed to save client entry.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error saving client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Publish / Unpublish directly from list
  const handleToggleStatus = async (client: ClientPortfolioItem) => {
    const nextStatus = client.status === 'Published' ? 'Draft' : 'Published';

    if (nextStatus === 'Published') {
      if (!client.logo_url || !client.hero_preview_url) {
        alert('Cannot publish client: Logo and Website Hero Preview are required.');
        return;
      }
    }

    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchClients();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update status.');
      }
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
    }
  };

  // Reorder Item (Up / Down)
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= clients.length) return;

    const copy = [...clients];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    setClients(copy);

    try {
      await fetch('/api/admin/clients/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: copy.map(c => c.id) })
      });
    } catch (err) {
      console.warn('Reorder sync error:', err);
      fetchClients();
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/clients/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setDeleteTarget(null);
        fetchClients();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete client.');
      }
    } catch (err: any) {
      alert('Error deleting client: ' + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252525]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Our Work & Client Showcase
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30">
              v3.5.297
            </span>
          </div>
          <p className="text-sm text-[#A5A5A5] mt-1.5 max-w-2xl">
            Manage your verified client portfolio. Add client websites, logos, and hero screenshots to display automatically in the public showcase.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53a] text-xs font-bold transition-all shadow-lg shadow-[#C7FF4D]/10 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-xs text-emerald-300">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Client List Table / Grid */}
      {isLoading ? (
        <div className="py-24 text-center text-[#A5A5A5] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#C7FF4D]" />
          <span className="text-xs font-mono">Loading client showcase...</span>
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          <Briefcase className="w-10 h-10 text-[#737373] mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Clients Added Yet</h3>
          <p className="text-xs text-[#A5A5A5] max-w-md mx-auto mb-6">
            Click "Add New Client" above to create your first portfolio entry. Once published, it will appear immediately on the homepage.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#1C1C1C] text-[#C7FF4D] border border-[#252525] text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add First Client</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-mono text-[#A5A5A5] flex items-center justify-between">
            <span>{clients.length} Total Client{clients.length === 1 ? '' : 's'}</span>
            <span className="text-[#C7FF4D]">{clients.filter(c => c.status === 'Published').length} Published Live</span>
          </div>

          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl overflow-hidden divide-y divide-[#202020]">
            {clients.map((client, index) => (
              <div
                key={client.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-[#101010] transition-colors"
              >
                {/* Left: Preview + Identity */}
                <div className="flex items-start gap-4">
                  {/* Order Controls */}
                  <div className="flex flex-col gap-1 shrink-0 pt-1">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded bg-[#141414] hover:bg-[#202020] text-[#A5A5A5] disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === clients.length - 1}
                      className="p-1 rounded bg-[#141414] hover:bg-[#202020] text-[#A5A5A5] disabled:opacity-30 disabled:pointer-events-none transition"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="w-24 h-16 rounded-lg bg-[#141414] border border-[#252525] overflow-hidden shrink-0 relative">
                    {client.hero_preview_url ? (
                      <img
                        src={client.hero_preview_url}
                        alt=""
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-[#737373] font-mono">
                        No Preview
                      </div>
                    )}
                  </div>

                  {/* Client Info */}
                  <div>
                    <div className="flex items-center gap-2.5">
                      {client.logo_url && (
                        <img
                          src={client.logo_url}
                          alt=""
                          className="w-5 h-5 rounded object-contain bg-[#141414] p-0.5 border border-[#252525]"
                        />
                      )}
                      <h4 className="text-base font-bold text-white">{client.client_name}</h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          client.status === 'Published'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}
                      >
                        {client.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-[#A5A5A5]">
                      <a
                        href={client.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-white flex items-center gap-1 font-mono transition"
                      >
                        <span>{client.website_url.replace(/^https?:\/\//, '')}</span>
                        <ExternalLink className="w-3 h-3 text-[#C7FF4D]" />
                      </a>
                      {client.service_category && (
                        <>
                          <span>•</span>
                          <span className="text-[#C7FF4D]">{client.service_category}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                  <button
                    onClick={() => handleToggleStatus(client)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                      client.status === 'Published'
                        ? 'bg-[#141414] hover:bg-amber-950/20 text-[#A5A5A5] hover:text-amber-400 border-[#252525] hover:border-amber-900/40'
                        : 'bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border-emerald-900/40'
                    }`}
                  >
                    {client.status === 'Published' ? 'Unpublish' : 'Publish'}
                  </button>

                  <button
                    onClick={() => openEditModal(client)}
                    className="p-2 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#252525] transition"
                    title="Edit Client"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteTarget(client)}
                    className="p-2 rounded-xl bg-[#141414] hover:bg-red-950/30 text-red-400 border border-[#252525] hover:border-red-900/40 transition"
                    title="Delete Client"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD / EDIT CLIENT MODAL                                         */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#252525]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#C7FF4D]" />
                <h3 className="text-lg font-bold text-white">
                  {editingClient ? 'Edit Client Portfolio Entry' : 'Add New Client Showcase'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#A5A5A5] hover:text-white hover:bg-[#141414] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Client Name & Website URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A5A5A5] mb-1.5">
                    Client / Company Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Acme Tech Solutions"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] text-white text-sm focus:outline-none transition"
                  />
                  {formErrors.clientName && (
                    <p className="text-[11px] text-red-400 mt-1">{formErrors.clientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A5A5A5] mb-1.5">
                    Client Website URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                    placeholder="https://clientwebsite.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] text-white text-sm focus:outline-none transition"
                  />
                  {formErrors.websiteUrl && (
                    <p className="text-[11px] text-red-400 mt-1">{formErrors.websiteUrl}</p>
                  )}
                </div>
              </div>

              {/* Service Category & Short Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#A5A5A5] mb-1.5">
                    Service Category (Optional)
                  </label>
                  <select
                    value={serviceCategory}
                    onChange={e => setServiceCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] text-white text-sm focus:outline-none transition"
                  >
                    <option value="Website Design & Development">Website Design & Development</option>
                    <option value="AI Video Creation">AI Video Creation</option>
                    <option value="AI-Integrated Advertising">AI-Integrated Advertising</option>
                    <option value="Search Engine Optimization">Search Engine Optimization</option>
                    <option value="Google Business Profile Optimization">Google Business Profile Optimization</option>
                    <option value="Enterprise Digital Strategy">Enterprise Digital Strategy</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A5A5A5] mb-1.5">
                    Short Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief highlight of deliverables or impact"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Logo Upload Section */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#252525] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    <span>Client Logo</span>
                    <span className="text-red-400">*</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] text-xs text-white border border-[#333] flex items-center gap-1.5 transition"
                  >
                    <Upload className="w-3 h-3 text-[#C7FF4D]" />
                    <span>Upload Logo Image</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={logoFileInputRef}
                  onChange={handleLogoFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <div className="w-14 h-14 rounded-xl bg-[#050505] border border-[#333] p-1.5 flex items-center justify-center shrink-0">
                      <img src={logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#050505] border border-dashed border-[#333] flex items-center justify-center text-[10px] text-[#737373] shrink-0 font-mono">
                      No Logo
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      placeholder="Or paste external logo image URL"
                      className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white focus:outline-none focus:border-[#C7FF4D] transition"
                    />
                  </div>
                </div>
                {formErrors.logoUrl && (
                  <p className="text-[11px] text-red-400">{formErrors.logoUrl}</p>
                )}
              </div>

              {/* Website Hero Screenshot Section */}
              <div className="p-4 rounded-xl bg-[#121212] border border-[#252525] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    <span>Website Hero Preview</span>
                    <span className="text-red-400">*</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoCapture}
                      disabled={isAutoCapturing}
                      className="px-3 py-1.5 rounded-lg bg-[#C7FF4D]/10 hover:bg-[#C7FF4D]/20 text-xs text-[#C7FF4D] border border-[#C7FF4D]/30 flex items-center gap-1.5 transition disabled:opacity-50"
                      title="Fetch live screenshot automatically from website URL"
                    >
                      {isAutoCapturing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>{isAutoCapturing ? 'Capturing...' : 'Auto-Capture'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => heroFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] text-xs text-white border border-[#333] flex items-center gap-1.5 transition"
                    >
                      <Upload className="w-3 h-3 text-[#C7FF4D]" />
                      <span>Upload Screenshot</span>
                    </button>
                  </div>
                </div>

                <input
                  type="file"
                  ref={heroFileInputRef}
                  onChange={handleHeroFileChange}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                {autoCaptureError && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
                    {autoCaptureError}
                  </div>
                )}

                {/* Hero Preview Box */}
                <div className="relative aspect-[16/9] w-full rounded-xl bg-[#050505] border border-[#282828] overflow-hidden flex items-center justify-center">
                  {heroPreviewUrl ? (
                    <img
                      src={heroPreviewUrl}
                      alt="Hero preview"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="text-center p-6 text-[#737373]">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No website preview yet</p>
                      <p className="text-[11px] text-[#555] mt-0.5">
                        Click "Auto-Capture" to fetch automatically or "Upload Screenshot" manually
                      </p>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={heroPreviewUrl}
                  onChange={e => setHeroPreviewUrl(e.target.value)}
                  placeholder="Or paste screenshot image URL directly"
                  className="w-full px-3 py-2 rounded-lg bg-[#181818] border border-[#282828] text-xs text-white focus:outline-none focus:border-[#C7FF4D] transition"
                />
                {formErrors.heroPreviewUrl && (
                  <p className="text-[11px] text-red-400">{formErrors.heroPreviewUrl}</p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#252525]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-[#141414] hover:bg-[#1E1E1E] text-xs font-semibold text-[#A5A5A5] hover:text-white border border-[#282828] transition"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSave('Draft')}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-[#181818] hover:bg-[#222] text-xs font-semibold text-white border border-[#333] transition disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('Published')}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53a] text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-[#C7FF4D]/10"
                >
                  {isSubmitting ? 'Saving...' : 'Publish to Showcase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL                                      */}
      {/* ============================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Client Portfolio Entry?</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Are you sure you want to remove <span className="text-white font-semibold">{deleteTarget.client_name}</span>? This will permanently delete this client from your showcase.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl bg-[#141414] text-xs font-semibold text-[#A5A5A5] hover:text-white border border-[#282828] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
