/**
 * Dawnexus First-Party Visitor Behaviour & Interaction Tracker
 * Version: Dawnexus 6.1.3
 * 
 * Features:
 * - Privacy-First: Zero raw form inputs, zero keystrokes, zero IP collection
 * - Asynchronous batching with navigator.sendBeacon fallback
 * - Scroll depth milestone tracking (25%, 50%, 75%, 100%)
 * - Normalized coordinate tracking for responsive heatmaps
 * - Safe interaction replay recorder for debugging conversion friction
 * - Excludes /admin routes automatically
 */

interface QueuedEvent {
  eventId: string;
  eventType: 'page_view' | 'click' | 'scroll' | 'visibility' | 'cta_click' | 'form_start' | 'form_step' | 'form_error' | 'form_abandon' | 'form_submit';
  pagePath: string;
  elementId?: string;
  sectionId?: string;
  scrollDepth?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  xPos?: number; // 0.0 to 1.0
  yPos?: number; // 0.0 to 1.0
  properties?: Record<string, any>;
  timestamp: string;
}

interface ReplayAction {
  type: 'scroll' | 'click' | 'step' | 'section_enter';
  x?: number;
  y?: number;
  scrollPct?: number;
  target?: string;
  timeOffset: number;
}

class Tracker {
  private sessionId: string = '';
  private visitorId: string = '';
  private eventQueue: QueuedEvent[] = [];
  private replayQueue: ReplayAction[] = [];
  private sessionStartTime: number = Date.now();
  private maxScrollReached: number = 0;
  private scrollMilestonesReported = new Set<number>();
  private batchTimer: any = null;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // Do not track administrative dashboard views
    if (window.location.pathname.startsWith('/admin')) {
      return;
    }

    this.ensureSessionAndVisitor();
    this.sessionStartTime = Date.now();

    // 1. Initial Page View
    this.trackPageView();

    // 2. Global Click & CTA listener
    window.addEventListener('click', this.handleClick, { passive: true });

    // 3. Scroll depth listener with throttle
    window.addEventListener('scroll', this.handleScroll, { passive: true });

    // 4. Batch timer (flushes every 2500ms)
    this.batchTimer = setInterval(() => {
      this.flush();
    }, 2500);

    // 5. Page exit / unload listener
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });

    window.addEventListener('pagehide', () => {
      this.flush(true);
    });
  }

  private ensureSessionAndVisitor() {
    try {
      // Visitor ID (persists across visits)
      let vid = localStorage.getItem('d_vid');
      if (!vid) {
        vid = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        localStorage.setItem('d_vid', vid);
      }
      this.visitorId = vid;

      // Session ID (persists per browsing session)
      let sid = sessionStorage.getItem('d_sid');
      if (!sid) {
        sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        sessionStorage.setItem('d_sid', sid);
      }
      this.sessionId = sid;
    } catch {
      this.visitorId = `v_${Date.now()}`;
      this.sessionId = `s_${Date.now()}`;
    }
  }

  public trackPageView(pathOverride?: string) {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;

    const pagePath = pathOverride || window.location.pathname;
    this.maxScrollReached = 0;
    this.scrollMilestonesReported.clear();

    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'page_view',
      pagePath,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      timestamp: new Date().toISOString()
    });
  }

  public trackCtaClick(elementId: string, sectionId?: string, label?: string) {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;

    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'cta_click',
      pagePath: window.location.pathname,
      elementId,
      sectionId,
      properties: label ? { label } : undefined,
      timestamp: new Date().toISOString()
    });

    this.replayQueue.push({
      type: 'click',
      target: elementId,
      timeOffset: Date.now() - this.sessionStartTime
    });
  }

  public track(eventType: string, properties?: Record<string, any>) {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;

    const mappedType = eventType === 'cta_displayed' ? 'visibility' : eventType === 'cta_clicked' ? 'cta_click' : (eventType as any);

    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: mappedType,
      pagePath: window.location.pathname,
      properties,
      timestamp: new Date().toISOString()
    });
  }

  public trackFormStart(formId: string = 'contact_form') {
    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'form_start',
      pagePath: window.location.pathname,
      elementId: formId,
      timestamp: new Date().toISOString()
    });

    this.replayQueue.push({
      type: 'step',
      target: `${formId}_start`,
      timeOffset: Date.now() - this.sessionStartTime
    });
  }

  public trackFormStep(step: number, formId: string = 'contact_form') {
    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'form_step',
      pagePath: window.location.pathname,
      elementId: formId,
      properties: { step },
      timestamp: new Date().toISOString()
    });

    this.replayQueue.push({
      type: 'step',
      target: `${formId}_step_${step}`,
      timeOffset: Date.now() - this.sessionStartTime
    });
  }

  public trackFormError(category: string, formId: string = 'contact_form') {
    // Strictly records only the error category (e.g. 'invalid_email'), NEVER raw input values
    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'form_error',
      pagePath: window.location.pathname,
      elementId: category,
      sectionId: formId,
      timestamp: new Date().toISOString()
    });
  }

  public trackFormSubmit(enquiryRefId?: string, formId: string = 'contact_form') {
    this.queueEvent({
      eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventType: 'form_submit',
      pagePath: window.location.pathname,
      elementId: formId,
      properties: enquiryRefId ? { enquiryRefId } : undefined,
      timestamp: new Date().toISOString()
    });

    this.replayQueue.push({
      type: 'step',
      target: `${formId}_submitted`,
      timeOffset: Date.now() - this.sessionStartTime
    });

    // Flush immediately upon successful submission
    this.flush(true);
  }

  private handleClick = (e: MouseEvent) => {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Detect if this is an interactive element
    const btn = target.closest('button');
    const anchor = target.closest('a');
    const analyticsEl = target.closest('[data-analytics-id]') as HTMLElement | null;

    const elementId = analyticsEl?.getAttribute('data-analytics-id') || btn?.id || btn?.innerText?.trim().slice(0, 30) || anchor?.getAttribute('href') || undefined;

    // Compute normalized coordinates (0.0 to 1.0)
    const normX = Number((e.clientX / window.innerWidth).toFixed(4));
    const normY = Number((e.clientY / window.innerHeight).toFixed(4));

    // Record click event if on link, button, or tracked element
    if (btn || anchor || analyticsEl) {
      this.queueEvent({
        eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        eventType: 'click',
        pagePath: window.location.pathname,
        elementId,
        xPos: normX,
        yPos: normY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        timestamp: new Date().toISOString()
      });
    }

    // Add to lightweight replay trail
    if (this.replayQueue.length < 150) {
      this.replayQueue.push({
        type: 'click',
        x: normX,
        y: normY,
        target: elementId,
        timeOffset: Date.now() - this.sessionStartTime
      });
    }
  };

  private handleScroll = () => {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/admin')) return;

    const h = document.documentElement;
    const b = document.body;
    const st = 'scrollTop';
    const sh = 'scrollHeight';

    const percent = Math.round(((h[st] || b[st]) / ((h[sh] || b[sh]) - h.clientHeight)) * 100);
    if (isNaN(percent) || percent < 0) return;

    this.maxScrollReached = Math.max(this.maxScrollReached, percent);

    // Check milestones
    const milestones = [25, 50, 75, 100];
    for (const m of milestones) {
      if (this.maxScrollReached >= m && !this.scrollMilestonesReported.has(m)) {
        this.scrollMilestonesReported.add(m);
        this.queueEvent({
          eventId: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          eventType: 'scroll',
          pagePath: window.location.pathname,
          scrollDepth: m,
          timestamp: new Date().toISOString()
        });

        if (this.replayQueue.length < 150) {
          this.replayQueue.push({
            type: 'scroll',
            scrollPct: m,
            timeOffset: Date.now() - this.sessionStartTime
          });
        }
      }
    }
  };

  private queueEvent(ev: QueuedEvent) {
    this.eventQueue.push(ev);
    if (this.eventQueue.length >= 10) {
      this.flush();
    }
  }

  private flush(isUnload: boolean = false) {
    if (this.eventQueue.length === 0 && this.replayQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    const replayToSend = [...this.replayQueue];
    this.eventQueue = [];
    this.replayQueue = [];

    const payload = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      events: eventsToSend,
      replayChunks: replayToSend.length > 0 ? replayToSend : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop'
    };

    const jsonStr = JSON.stringify(payload);

    if (isUnload && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/collect', blob);
        return;
      } catch {}
    }

    fetch('/api/analytics/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: jsonStr,
      keepalive: isUnload
    }).catch(() => {
      // Non-fatal: analytics fails silently without disrupting user experience
    });
  }
}

export const tracker = new Tracker();

