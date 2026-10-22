import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Calculator,
  Bot,
  User,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{
    tool: string;
    args: Record<string, any>;
    result: any;
  }>;
  timestamp: string;
}

const QUICK_PROMPTS = [
  'Estimate website cost for my business',
  'What services does Dawnexus provide?',
  'Tell me about your interactive 3D solutions',
  'I would like to discuss a project with your team'
];

export const AiChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize greeting on first open
  useEffect(() => {
    if (isOpen && !hasStarted && messages.length === 0) {
      setHasStarted(true);
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I am the Dawnexus AI Project Assistant. I can answer questions about our digital engineering services, calculate an instant website development cost estimate, or connect you with our strategy team. How can I help you today?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, hasStarted, messages.length]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const historyForApi = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/public/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const assistantMessage: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.text || 'I processed your request.',
          toolCalls: data.toolCallsExecuted,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: data.error || 'I encountered an error connecting to the intelligence service. Please feel free to reach out via our contact form or try again shortly.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Network connection error. Please verify your connection or use our contact form.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-[#141414] border border-[#C7FF4D]/30 text-white shadow-2xl hover:border-[#C7FF4D] hover:shadow-[0_0_25px_rgba(199,255,77,0.3)] transition-all duration-300"
          aria-label="Open Dawnexus AI Project Assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C7FF4D] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C7FF4D]"></span>
          </span>
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="w-4 h-4 text-[#C7FF4D]" />
            <span>Ask AI Assistant</span>
          </div>
        </button>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="w-[92vw] sm:w-[410px] h-[580px] max-h-[85vh] flex flex-col rounded-2xl bg-[#0c0c0c] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-[#141414] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-[#C7FF4D]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  Dawnexus Assistant
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/20">
                    MCP v7.1.8
                  </span>
                </h3>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Online • Grounded Knowledge
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-[#181818] border border-white/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#C7FF4D] text-black font-medium rounded-tr-sm'
                    : 'bg-[#181818] border border-white/10 text-neutral-200 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Render Tool Invocations Badge if any */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5">
                      {msg.toolCalls.map((tc, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-[#C7FF4D]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px]">
                            {tc.tool === 'chatbot_estimate_pricing' && 'Calculated official website estimate'}
                            {tc.tool === 'chatbot_get_public_knowledge' && 'Verified Dawnexus knowledge base'}
                            {tc.tool === 'chatbot_submit_enquiry' && 'Enquiry successfully registered'}
                            {!['chatbot_estimate_pricing', 'chatbot_get_public_knowledge', 'chatbot_submit_enquiry'].includes(tc.tool) && `Executed ${tc.tool}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-black/60' : 'text-neutral-500'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-[#C7FF4D]/20 border border-[#C7FF4D]/40 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <User className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-[#181818] border border-white/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D] animate-spin" />
                </div>
                <div className="bg-[#181818] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-neutral-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C7FF4D]" />
                  <span className="text-xs">Reasoning with Dawnexus tools...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (if early in chat) */}
          {messages.length <= 2 && !isLoading && (
            <div className="px-4 py-2 border-t border-white/5 bg-[#0e0e0e] flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-[#C7FF4D]/40 hover:bg-[#C7FF4D]/5 transition-all text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Footer Input Form */}
          <div className="p-3 border-t border-white/10 bg-[#141414]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about pricing, services, or plans..."
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#C7FF4D] focus:ring-1 focus:ring-[#C7FF4D]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-[#C7FF4D] text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#b5f233] transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="mt-1.5 px-1 flex items-center justify-between text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Zero unconfirmed submissions
              </span>
              <span>Dawnexus AI</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
