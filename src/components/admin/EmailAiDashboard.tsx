import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Inbox,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
  FileText,
  Sparkles,
  Clock,
  Shield,
  ShieldAlert,
  Plus,
  ChevronRight,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface ConnectedAccount {
  id: number;
  admin_user: string;
  google_email: string;
  display_name: string | null;
  scopes: string;
  connection_status: 'Connected' | 'Needs Reauthorization' | 'Disconnected' | 'Error';
  last_sync_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
}

interface EmailMessageSummary {
  accountId: number;
  accountEmail: string;
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  isUnread: boolean;
  needsReply: boolean;
}

interface ThreadMessage {
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string | null;
  subject: string;
  date: string;
  snippet: string;
  bodyPlain: string;
  bodyHtmlSanitized: string;
  attachments: Array<{ filename: string; mimeType: string; size: number }>;
  securityNotice: string;
}

interface EmailThreadDetail {
  accountId: number;
  accountEmail: string;
  threadId: string;
  subject: string;
  messagesCount: number;
  messages: ThreadMessage[];
}

interface EmailReplyDraft {
  id: number;
  account_id: number;
  thread_id: string;
  message_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  proposed_body: string;
  status: 'Proposed' | 'Reviewed' | 'Saved to Gmail' | 'Needs Attention' | 'Archived';
  gmail_draft_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export const EmailAiDashboard: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'inbox' | 'drafts'>('inbox');
  
  // Accounts state
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState<number | null>(null);

  // Search & Inbox state
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [likelyUnansweredOnly, setLikelyUnansweredOnly] = useState(true);
  const [searchResults, setSearchResults] = useState<EmailMessageSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Thread detail state
  const [selectedThread, setSelectedThread] = useState<EmailThreadDetail | null>(null);
  const [isLoadingThread, setIsLoadingThread] = useState(false);

  // Drafts state
  const [drafts, setDrafts] = useState<EmailReplyDraft[]>([]);
  const [draftStatusFilter, setDraftStatusFilter] = useState('All');
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [draftActionLoading, setDraftActionLoading] = useState<number | null>(null);

  // Draft Creation / Editing Modal state
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftFormAccountId, setDraftFormAccountId] = useState<number>(0);
  const [draftFormThreadId, setDraftFormThreadId] = useState('');
  const [draftFormMessageId, setDraftFormMessageId] = useState('');
  const [draftFormRecipient, setDraftFormRecipient] = useState('');
  const [draftFormSubject, setDraftFormSubject] = useState('');
  const [draftFormBody, setDraftFormBody] = useState('');
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [draftVersion, setDraftVersion] = useState<number>(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Notice banners
  const [bannerNotice, setBannerNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Check URL params for OAuth status redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('email_connected');
    const err = params.get('email_error');
    const emailParam = params.get('email');

    if (connected === 'true') {
      setBannerNotice({
        type: 'success',
        text: `Google account ${emailParam ? `(${emailParam}) ` : ''}connected successfully!`
      });
      // Clear URL parameter cleanly
      const newUrl = window.location.pathname + '?tab=email-ai';
      window.history.replaceState({}, '', newUrl);
    } else if (err) {
      setBannerNotice({
        type: 'error',
        text: `Account authorization failed: ${decodeURIComponent(err)}`
      });
      const newUrl = window.location.pathname + '?tab=email-ai';
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const res = await fetch('/api/admin/email-ai/accounts', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  // Fetch drafts
  const fetchDrafts = useCallback(async () => {
    setIsLoadingDrafts(true);
    try {
      const query = new URLSearchParams();
      if (draftStatusFilter !== 'All') query.set('status', draftStatusFilter);
      const res = await fetch(`/api/admin/email-ai/drafts?${query.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data.drafts || []);
      }
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setIsLoadingDrafts(false);
    }
  }, [draftStatusFilter]);

  // Execute Inbox search
  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setSelectedThread(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedAccountId !== 'all') {
        queryParams.set('accountId', selectedAccountId);
      }
      if (searchQuery.trim()) {
        queryParams.set('query', searchQuery.trim());
      }
      if (unreadOnly) {
        queryParams.set('unreadOnly', 'true');
      }
      if (likelyUnansweredOnly) {
        queryParams.set('likelyUnansweredOnly', 'true');
      }

      const res = await fetch(`/api/admin/email-ai/search?${queryParams.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.messages || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [selectedAccountId, searchQuery, unreadOnly, likelyUnansweredOnly]);

  useEffect(() => {
    fetchAccounts();
    fetchDrafts();
  }, [fetchAccounts, fetchDrafts]);

  // Trigger search on mount if accounts exist
  useEffect(() => {
    if (accounts.length > 0) {
      handleSearch();
    }
  }, [accounts.length, handleSearch]);

  // Connect Google account handler
  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/admin/email-ai/google/auth-url', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      } else {
        const err = await res.json();
        setBannerNotice({ type: 'error', text: err.error || 'Failed to start authorization.' });
      }
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err?.message || 'Connection error.' });
    }
  };

  // Refresh account status
  const handleRefreshAccount = async (id: number) => {
    setAccountActionLoading(id);
    try {
      const res = await fetch(`/api/admin/email-ai/accounts/${id}/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setBannerNotice({ type: 'success', text: `Account refreshed. Status: ${data.status}` });
        fetchAccounts();
      }
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err?.message || 'Failed to refresh account' });
    } finally {
      setAccountActionLoading(null);
    }
  };

  // Disconnect account
  const handleDisconnectAccount = async (id: number, email: string) => {
    if (!window.confirm(`Are you sure you want to disconnect ${email}? Historical reply drafts will be preserved.`)) {
      return;
    }
    setAccountActionLoading(id);
    try {
      const res = await fetch(`/api/admin/email-ai/accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setBannerNotice({ type: 'info', text: `Account ${email} disconnected.` });
        fetchAccounts();
        handleSearch();
      }
    } catch (err: any) {
      setBannerNotice({ type: 'error', text: err?.message || 'Failed to disconnect account' });
    } finally {
      setAccountActionLoading(null);
    }
  };

  // View full email thread
  const handleViewThread = async (accountId: number, threadId: string) => {
    setIsLoadingThread(true);
    try {
      const res = await fetch(`/api/admin/email-ai/threads/${accountId}/${threadId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSelectedThread(data);
      }
    } catch (err) {
      console.error('Failed to load thread:', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Open Draft preparation modal from thread
  const handlePrepareDraftFromThread = (msg: ThreadMessage) => {
    if (!selectedThread) return;
    setEditingDraftId(null);
    setDraftFormAccountId(selectedThread.accountId);
    setDraftFormThreadId(selectedThread.threadId);
    setDraftFormMessageId(msg.messageId);

    // Extract email address from 'Name <email@example.com>' or bare email
    const match = msg.from.match(/<([^>]+)>/);
    const cleanEmail = match ? match[1] : msg.from;
    setDraftFormRecipient(cleanEmail.trim());

    // Subject reply prefix
    const sub = msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`;
    setDraftFormSubject(sub);

    // Proposed draft body starter
    setDraftFormBody(`Hi,\n\nThank you for reaching out to Dawnexus.\n\n\n\nBest regards,\nDawnexus Team`);
    setIsDraftModalOpen(true);
  };

  // Open Draft modal for editing existing draft
  const handleEditDraft = (draft: EmailReplyDraft) => {
    setEditingDraftId(draft.id);
    setDraftFormAccountId(draft.account_id);
    setDraftFormThreadId(draft.thread_id);
    setDraftFormMessageId(draft.message_id);
    setDraftFormRecipient(draft.recipient_email);
    setDraftFormSubject(draft.subject);
    setDraftFormBody(draft.proposed_body);
    setDraftVersion(draft.version);
    setIsDraftModalOpen(true);
  };

  // Save draft to Dawnexus
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDraft(true);
    try {
      if (editingDraftId) {
        // Update
        const res = await fetch(`/api/admin/email-ai/drafts/${editingDraftId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            subject: draftFormSubject,
            proposed_body: draftFormBody,
            expected_version: draftVersion
          })
        });
        if (res.ok) {
          setBannerNotice({ type: 'success', text: `Draft #${editingDraftId} updated successfully.` });
          setIsDraftModalOpen(false);
          fetchDrafts();
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to update draft');
        }
      } else {
        // Create
        const res = await fetch('/api/admin/email-ai/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            account_id: draftFormAccountId,
            thread_id: draftFormThreadId,
            message_id: draftFormMessageId,
            recipient_email: draftFormRecipient,
            subject: draftFormSubject,
            proposed_body: draftFormBody
          })
        });
        if (res.ok) {
          setBannerNotice({ type: 'success', text: 'Proposed reply draft created and saved in Dawnexus.' });
          setIsDraftModalOpen(false);
          fetchDrafts();
          setActiveSubTab('drafts');
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to create draft');
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving draft');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Save approved draft to Gmail
  const handleSaveToGmail = async (draftId: number) => {
    if (!window.confirm("Confirm saving draft to Gmail?\n\nThis will save the draft into your Gmail account as an email draft. It will NOT send the email.")) {
      return;
    }

    setDraftActionLoading(draftId);
    try {
      const res = await fetch(`/api/admin/email-ai/drafts/${draftId}/save-to-gmail`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setBannerNotice({
          type: 'success',
          text: `Success: ${data.message} (Gmail Draft ID: ${data.gmailDraftId})`
        });
        fetchDrafts();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save draft to Gmail');
      }
    } catch (err: any) {
      alert(err?.message || 'Error saving to Gmail');
    } finally {
      setDraftActionLoading(null);
    }
  };

  // Mark draft as reviewed
  const handleMarkReviewed = async (draft: EmailReplyDraft) => {
    try {
      const res = await fetch(`/api/admin/email-ai/drafts/${draft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'Reviewed',
          expected_version: draft.version
        })
      });
      if (res.ok) {
        fetchDrafts();
      }
    } catch (err) {
      console.error('Failed to mark reviewed:', err);
    }
  };

  // Delete draft
  const handleDeleteDraft = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) return;
    try {
      const res = await fetch(`/api/admin/email-ai/drafts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        fetchDrafts();
      }
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-purple-950/40 border border-cyan-800/40 rounded-xl p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">Email AI & Multi-Inbox Management</h2>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-900/60 text-cyan-300 border border-cyan-700/50">
                  Version 8.2.5
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Connect multiple Gmail accounts, review customer enquiries, and prepare AI reply drafts with Claude & ChatGPT via MCP.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectGoogle}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-md transition-all duration-150"
            >
              <Plus className="w-4 h-4" />
              <span>Connect Gmail Account</span>
            </button>
          </div>
        </div>

        {/* Mandatory Safety Notice */}
        <div className="mt-4 pt-3 border-t border-cyan-800/30 flex items-center gap-2 text-xs text-cyan-300/80">
          <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong>Zero-Send Safety Guarantee:</strong> Dawnexus Email AI is strictly designed for reading email and preparing drafts. It has zero capability or code paths to send emails. Saving to Gmail only creates a draft in your Gmail account.
          </span>
        </div>
      </div>

      {/* Banner Notifications */}
      {bannerNotice && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : bannerNotice.type === 'error'
              ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
              : 'bg-blue-950/40 border-blue-800/50 text-blue-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerNotice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {bannerNotice.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {bannerNotice.type === 'info' && <HelpCircle className="w-4 h-4 text-blue-400" />}
            <span>{bannerNotice.text}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveSubTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'inbox'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Inbox & Search</span>
        </button>
        <button
          onClick={() => setActiveSubTab('drafts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'drafts'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Reply Drafts ({drafts.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            activeSubTab === 'accounts'
              ? 'border-cyan-500 text-cyan-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Connected Accounts ({accounts.length})</span>
        </button>
      </div>

      {/* TAB 1: INBOX & SEARCH */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-4">
          {/* Search Controls */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Account Dropdown */}
              <div className="md:col-span-3">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">All Connected Inboxes ({accounts.length})</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id.toString()}>
                      {acc.google_email} ({acc.connection_status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Keyword / Operator Search */}
              <div className="md:col-span-6 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search emails or Gmail operators (from:, subject:, quote...)"
                  className="w-full bg-gray-950 border border-gray-700/60 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
              </div>

              {/* Search Button */}
              <div className="md:col-span-3 flex items-center gap-2">
                <button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition-colors"
                >
                  {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Quick Filter Toggles */}
            <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-gray-800 text-xs text-gray-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={likelyUnansweredOnly}
                  onChange={(e) => setLikelyUnansweredOnly(e.target.checked)}
                  className="rounded border-gray-700 text-cyan-600 focus:ring-0 bg-gray-950"
                />
                <span className="font-medium text-cyan-300">Likely Unanswered Enquiries Only</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="rounded border-gray-700 text-cyan-600 focus:ring-0 bg-gray-950"
                />
                <span>Unread Only</span>
              </label>
            </div>
          </div>

          {/* Results & Thread Viewer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Message list */}
            <div className={`${selectedThread ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-2`}>
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>{searchResults.length} message(s) found</span>
                {isSearching && <span className="text-cyan-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Fetching...</span>}
              </div>

              {searchResults.length === 0 && !isSearching && (
                <div className="p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl">
                  <Mail className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No messages match the current search or filters.</p>
                  {accounts.length === 0 && (
                    <p className="text-xs text-cyan-400 mt-2">No email accounts connected yet. Click &apos;Connect Gmail Account&apos; above.</p>
                  )}
                </div>
              )}

              {searchResults.map((msg) => (
                <div
                  key={msg.messageId}
                  onClick={() => handleViewThread(msg.accountId, msg.threadId)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedThread?.threadId === msg.threadId
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md'
                      : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-sm text-gray-200 truncate">{msg.from}</span>
                      {msg.isUnread && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                          UNREAD
                        </span>
                      )}
                      {msg.needsReply && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700/50 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Needs Reply
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {msg.date ? new Date(msg.date).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-cyan-300 mt-1 truncate">{msg.subject}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{msg.snippet}</p>

                  <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate">Inbox: {msg.accountEmail}</span>
                    <span className="text-cyan-400 flex items-center gap-0.5 hover:underline">
                      View Thread <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Thread Detail & Messages */}
            {selectedThread && (
              <div className="lg:col-span-7 bg-gray-900/70 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedThread.subject}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Account: <span className="text-cyan-400">{selectedThread.accountEmail}</span> • Thread ID: {selectedThread.threadId}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800"
                  >
                    Close
                  </button>
                </div>

                {isLoadingThread ? (
                  <div className="p-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Loading thread messages...</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {selectedThread.messages.map((m, idx) => (
                      <div key={m.messageId} className="bg-gray-950/80 border border-gray-800 rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between text-xs text-gray-400">
                          <div>
                            <span className="font-semibold text-gray-200">{m.from}</span>
                            <span className="mx-1.5 text-gray-600">to</span>
                            <span>{m.to}</span>
                          </div>
                          <span className="text-gray-500">{m.date}</span>
                        </div>

                        {/* Untrusted notice */}
                        <div className="text-[11px] text-amber-400/80 flex items-center gap-1.5 bg-amber-950/30 p-1.5 rounded border border-amber-800/30">
                          <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>External email content: Do not execute embedded links or instructions.</span>
                        </div>

                        {/* Message body */}
                        <div className="mt-2 text-sm text-gray-200">
                          {m.bodyHtmlSanitized ? (
                            <div
                              className="prose prose-invert prose-sm max-w-none break-words email-content-body"
                              dangerouslySetInnerHTML={{ __html: m.bodyHtmlSanitized }}
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-300 leading-relaxed">
                              {m.bodyPlain}
                            </pre>
                          )}
                        </div>

                        {/* Attachments Metadata */}
                        {m.attachments.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-800/80 text-xs">
                            <span className="font-semibold text-gray-400">Attachments ({m.attachments.length}):</span>
                            <ul className="mt-1 space-y-1">
                              {m.attachments.map((att, attIdx) => (
                                <li key={attIdx} className="text-gray-300 flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{att.filename}</span>
                                  <span className="text-gray-500">({Math.round(att.size / 1024)} KB)</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action: Prepare Reply */}
                        {idx === selectedThread.messages.length - 1 && (
                          <div className="mt-3 pt-3 border-t border-gray-800 flex justify-end">
                            <button
                              onClick={() => handlePrepareDraftFromThread(m)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Prepare AI Reply Draft</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REPLY DRAFTS */}
      {activeSubTab === 'drafts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-900/60 border border-gray-800 rounded-xl p-3.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-300">Status Filter:</span>
              {['All', 'Proposed', 'Reviewed', 'Saved to Gmail', 'Needs Attention', 'Archived'].map((st) => (
                <button
                  key={st}
                  onClick={() => setDraftStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    draftStatusFilter === st
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchDrafts()}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Drafts</span>
            </button>
          </div>

          {isLoadingDrafts && (
            <div className="p-8 text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
              <span>Loading drafts...</span>
            </div>
          )}

          {!isLoadingDrafts && drafts.length === 0 && (
            <div className="p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl">
              <FileText className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No reply drafts found.</p>
              <p className="text-xs text-gray-500 mt-1">
                You can create drafts directly from an email thread or ask Claude/ChatGPT via MCP to prepare drafts in chat.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {drafts.map((d) => (
              <div key={d.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Draft #{d.id} • v{d.version}</span>
                    <h4 className="font-semibold text-sm text-gray-100 mt-0.5 truncate">{d.subject}</h4>
                    <p className="text-xs text-cyan-400">To: {d.recipient_email}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      d.status === 'Saved to Gmail'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                        : d.status === 'Reviewed'
                        ? 'bg-blue-950/60 text-blue-300 border-blue-700/50'
                        : d.status === 'Needs Attention'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                        : 'bg-gray-800 text-gray-300 border-gray-700'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>

                <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800 text-xs text-gray-300 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
                  {d.proposed_body}
                </div>

                {d.gmail_draft_id && (
                  <div className="text-[11px] text-emerald-400/90 flex items-center gap-1.5 bg-emerald-950/30 p-1.5 rounded border border-emerald-800/30">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Saved in Gmail (Draft ID: {d.gmail_draft_id}). Review and send manually in Gmail.</span>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditDraft(d)}
                      className="inline-flex items-center gap-1 text-gray-300 hover:text-white px-2 py-1 rounded bg-gray-800"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    {d.status !== 'Reviewed' && d.status !== 'Saved to Gmail' && (
                      <button
                        onClick={() => handleMarkReviewed(d)}
                        className="inline-flex items-center gap-1 text-blue-300 hover:text-white px-2 py-1 rounded bg-blue-950/60 border border-blue-800/50"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Mark Reviewed</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveToGmail(d.id)}
                      disabled={draftActionLoading === d.id}
                      className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-700/50 font-medium"
                    >
                      {draftActionLoading === d.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <ExternalLink className="w-3 h-3" />
                      )}
                      <span>Save to Gmail</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(d.id)}
                      className="text-gray-500 hover:text-rose-400 p-1"
                      title="Delete Draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONNECTED EMAIL ACCOUNTS */}
      {activeSubTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-200">Authorized Google Accounts</h3>
            <button
              onClick={handleConnectGoogle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Gmail Account</span>
            </button>
          </div>

          {isLoadingAccounts && (
            <div className="p-8 text-center text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
              <span>Loading accounts...</span>
            </div>
          )}

          {!isLoadingAccounts && accounts.length === 0 && (
            <div className="p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl space-y-3">
              <Mail className="w-10 h-10 text-gray-600 mx-auto" />
              <h4 className="text-base font-semibold text-gray-200">No Google Accounts Connected</h4>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Connect your business Gmail or Google Workspace accounts to enable email search, thread inspection, and AI reply drafting.
              </p>
              <button
                onClick={handleConnectGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Connect First Google Account</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-white">{acc.google_email}</h4>
                      {acc.display_name && (
                        <p className="text-xs text-gray-400">{acc.display_name}</p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      acc.connection_status === 'Connected'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50'
                        : acc.connection_status === 'Needs Reauthorization'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                        : 'bg-rose-950/60 text-rose-300 border-rose-700/50'
                    }`}
                  >
                    {acc.connection_status}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-gray-400 pt-2 border-t border-gray-800/80">
                  <div className="flex justify-between">
                    <span>Account ID:</span>
                    <span className="text-gray-300">#{acc.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Permissions:</span>
                    <span className="text-gray-300 truncate max-w-[200px]" title={acc.scopes}>
                      Gmail Read & Drafts
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Synchronized:</span>
                    <span className="text-gray-300">
                      {acc.last_sync_at ? new Date(acc.last_sync_at).toLocaleString() : 'Pending'}
                    </span>
                  </div>
                  {acc.last_error && (
                    <div className="text-rose-400 text-[11px] pt-1">
                      Error: {acc.last_error}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleRefreshAccount(acc.id)}
                    disabled={accountActionLoading === acc.id}
                    className="inline-flex items-center gap-1.5 text-gray-300 hover:text-white px-2.5 py-1 rounded bg-gray-800"
                  >
                    <RefreshCw className={`w-3 h-3 ${accountActionLoading === acc.id ? 'animate-spin' : ''}`} />
                    <span>Test & Refresh</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {acc.connection_status !== 'Connected' && (
                      <button
                        onClick={handleConnectGoogle}
                        className="text-cyan-400 hover:underline"
                      >
                        Reconnect
                      </button>
                    )}
                    <button
                      onClick={() => handleDisconnectAccount(acc.id, acc.google_email)}
                      disabled={accountActionLoading === acc.id}
                      className="text-gray-500 hover:text-rose-400 p-1"
                      title="Disconnect Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DRAFT CREATION / EDITING MODAL */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <span>{editingDraftId ? `Edit Reply Draft #${editingDraftId}` : 'Prepare Proposed Reply Draft'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Proposed draft will be stored safely in Dawnexus. It can be saved to Gmail after review.
                </p>
              </div>
              <button
                onClick={() => setIsDraftModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Recipient</label>
                <input
                  type="email"
                  required
                  value={draftFormRecipient}
                  onChange={(e) => setDraftFormRecipient(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={draftFormSubject}
                  onChange={(e) => setDraftFormSubject(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Proposed Reply Body</label>
                <textarea
                  required
                  rows={8}
                  value={draftFormBody}
                  onChange={(e) => setDraftFormBody(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 font-mono"
                  placeholder="Draft your professional response..."
                />
              </div>

              <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Will NOT be sent to recipient. Stored as draft only.</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDraftModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingDraft}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium"
                  >
                    {isSavingDraft ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>{editingDraftId ? 'Update Draft' : 'Save Draft in Dawnexus'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
