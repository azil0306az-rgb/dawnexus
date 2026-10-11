import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { BlogRecord } from '../../types';

interface BlogCalendarProps {
  blogs: BlogRecord[];
  onSelectBlog: (blog: BlogRecord) => void;
  onCreateBlogForDate: (dateStr: string) => void;
  onRefresh: () => void;
}

export const BlogCalendar: React.FC<BlogCalendarProps> = ({
  blogs,
  onSelectBlog,
  onCreateBlogForDate,
  onRefresh
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [isPublishingCheck, setIsPublishingCheck] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Manual Trigger for publish due scheduler
  const handleRunScheduler = async () => {
    setIsPublishingCheck(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/admin/blogs/publish-due', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCheckResult(`Scheduler executed: ${data.publishedCount} articles published.`);
        onRefresh();
      } else {
        setCheckResult('Scheduler error: ' + (data.error || 'Request failed'));
      }
    } catch (err: any) {
      setCheckResult('Failed to trigger scheduler: ' + err.message);
    } finally {
      setIsPublishingCheck(false);
    }
  };

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  // Generate grid cells for the current month in Asia/Kolkata context
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Group blogs by YYYY-MM-DD
  const blogsByDate = useMemo(() => {
    const map: Record<string, BlogRecord[]> = {};
    for (const b of blogs) {
      const targetDate = b.scheduled_at || b.published_at || b.created_at;
      if (!targetDate) continue;
      try {
        const d = new Date(targetDate);
        const pad = (n: number) => (n < 10 ? '0' + n : n);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        if (!map[key]) map[key] = [];
        map[key].push(b);
      } catch {
        // Ignore date parse issues
      }
    }
    return map;
  }, [blogs]);

  // Unscheduled drafts
  const unscheduledDrafts = useMemo(() => {
    return blogs.filter(b => b.status === 'Draft' && !b.scheduled_at);
  }, [blogs]);

  // Agenda upcoming items
  const upcomingAgenda = useMemo(() => {
    return blogs
      .filter(b => b.scheduled_at || b.status === 'Scheduled')
      .sort((a, b) => {
        const tA = new Date(a.scheduled_at || a.created_at).getTime();
        const tB = new Date(b.scheduled_at || b.created_at).getTime();
        return tA - tB;
      });
  }, [blogs]);

  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const nowIsoDate = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#202020]">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-[#C7FF4D]" />
            <h2 className="text-xl font-bold text-white tracking-tight">Editorial Publishing Calendar</h2>
          </div>
          <div className="flex items-center space-x-3 text-xs text-neutral-400 mt-1">
            <span className="flex items-center space-x-1 text-[#C7FF4D]">
              <Clock className="w-3.5 h-3.5" />
              <span>Timezone: Asia/Kolkata (IST • UTC+5:30)</span>
            </span>
            <span>•</span>
            <span>Auto-publishing runs independently on server</span>
          </div>
        </div>

        {/* View Switcher & Action buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center bg-[#141414] border border-[#252525] rounded-lg p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'month' ? 'bg-[#252525] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Month View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'agenda' ? 'bg-[#252525] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Agenda Queue ({upcomingAgenda.length})
            </button>
          </div>

          <button
            type="button"
            disabled={isPublishingCheck}
            onClick={handleRunScheduler}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] text-neutral-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
            title="Check and trigger publication for any due articles"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#C7FF4D] ${isPublishingCheck ? 'animate-spin' : ''}`} />
            <span>Check Due Posts</span>
          </button>
        </div>
      </div>

      {/* Scheduler feedback notice */}
      {checkResult && (
        <div className="p-3 bg-[#141414] border border-[#252525] rounded-lg text-xs text-neutral-300 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-[#C7FF4D]" />
            <span>{checkResult}</span>
          </div>
          <button onClick={() => setCheckResult(null)} className="text-neutral-500 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Calendar Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Calendar Grid or Agenda */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {viewMode === 'month' ? (
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl overflow-hidden p-4">
              {/* Month Navigation Bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {monthNames[month]} {year}
                  </h3>
                  <button
                    type="button"
                    onClick={today}
                    className="text-xs px-2.5 py-1 rounded bg-[#181818] hover:bg-[#252525] border border-[#2e2e2e] text-neutral-300 transition"
                  >
                    Today
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded bg-[#141414] hover:bg-[#222] border border-[#252525] text-neutral-400 hover:text-white transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded bg-[#141414] hover:bg-[#222] border border-[#252525] text-neutral-400 hover:text-white transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-500 py-2 border-b border-[#1e1e1e]">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Date Cells */}
              <div className="grid grid-cols-7 gap-1 mt-1 auto-rows-fr">
                {/* Empty cells before start of month */}
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="min-h-[90px] bg-[#080808]/40 rounded-lg border border-[#161616]" />
                ))}

                {/* Days of month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${year}-${pad(month + 1)}-${pad(dayNum)}`;
                  const isCurrentDay = dateStr === nowIsoDate;
                  const dayBlogs = blogsByDate[dateStr] || [];

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (dayBlogs.length === 0) {
                          onCreateBlogForDate(dateStr);
                        }
                      }}
                      className={`min-h-[90px] p-1.5 rounded-lg border transition flex flex-col justify-between group ${
                        isCurrentDay
                          ? 'bg-[#141414] border-[#C7FF4D]/40'
                          : 'bg-[#0f0f0f] border-[#1e1e1e] hover:border-[#333]'
                      }`}
                    >
                      {/* Top Bar inside cell: Date number & quick add button */}
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${isCurrentDay ? 'text-[#C7FF4D]' : 'text-neutral-400'}`}>
                          {dayNum}
                        </span>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onCreateBlogForDate(dateStr);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#222] text-neutral-400 hover:text-[#C7FF4D] transition"
                          title={`Schedule article on ${dateStr}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Article Badges inside Day Cell */}
                      <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                        {dayBlogs.map(b => {
                          let badgeBg = 'bg-neutral-800 text-neutral-300';
                          if (b.status === 'Published') badgeBg = 'bg-[#C7FF4D]/15 text-[#C7FF4D] border border-[#C7FF4D]/30';
                          else if (b.status === 'Scheduled') badgeBg = 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30';
                          else if (b.status === 'Failed') badgeBg = 'bg-red-500/15 text-red-400 border border-red-500/30';

                          return (
                            <div
                              key={b.id}
                              onClick={e => {
                                e.stopPropagation();
                                onSelectBlog(b);
                              }}
                              className={`p-1 rounded text-[11px] leading-tight truncate cursor-pointer hover:scale-[1.02] transition font-medium ${badgeBg}`}
                              title={`${b.status}: ${b.title}`}
                            >
                              {b.title}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda View */
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white tracking-wide">
                Upcoming Publication Queue ({upcomingAgenda.length})
              </h3>
              {upcomingAgenda.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-sm">
                  No scheduled articles currently in the queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAgenda.map(item => (
                    <div
                      key={item.id}
                      onClick={() => onSelectBlog(item)}
                      className="p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-[#242424] hover:border-[#38BDF8]/40 rounded-xl cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.status === 'Published' ? 'bg-[#C7FF4D]/10 text-[#C7FF4D]' : 'bg-cyan-500/10 text-cyan-400'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-xs text-neutral-400">
                            {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : 'Unscheduled'} (IST)
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        <p className="text-xs text-neutral-400">{item.primary_keyword || 'No keyword'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Legend & Unscheduled Drafts Drawer */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* Status Legend */}
          <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Status Indicators
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C7FF4D]" />
                <span className="text-neutral-300">Published (Live)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-neutral-300">Scheduled (Queued in IST)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-neutral-400" />
                <span className="text-neutral-300">Draft (Unpublished)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="text-neutral-300">Failed / Requires Attention</span>
              </div>
            </div>
          </div>

          {/* Unscheduled Drafts Tray */}
          <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Unscheduled Drafts ({unscheduledDrafts.length})
              </h4>
              <button
                type="button"
                onClick={() => onCreateBlogForDate(nowIsoDate)}
                className="text-xs text-[#C7FF4D] hover:underline"
              >
                + New Draft
              </button>
            </div>

            {unscheduledDrafts.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3">All drafts have been scheduled or published.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {unscheduledDrafts.map(draft => (
                  <div
                    key={draft.id}
                    onClick={() => onSelectBlog(draft)}
                    className="p-2.5 bg-[#141414] hover:bg-[#1c1c1c] border border-[#222] rounded-lg cursor-pointer transition text-xs space-y-1"
                  >
                    <div className="font-medium text-white truncate">{draft.title}</div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{draft.category}</span>
                      <span className="text-cyan-400 hover:underline">Click to schedule ›</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

