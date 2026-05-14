import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Lightbulb, X, ArrowUp } from 'lucide-react';
import { useTutorChat } from '../hooks/useTutorChat';

interface TutorDockProps {
  open: boolean;
  onClose: () => void;
  questionId: string;
  questionImageUrl: string;
  markschemeImageUrl?: string;
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.3px',
  color: '#9A9A9A',
  margin: 0,
};

const ACTION_BTN: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  height: '40px',
  padding: '0 14px',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: '12px',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: 500,
  color: '#111',
  fontFamily: 'var(--font-body)',
};

const BUBBLE_AI: React.CSSProperties = {
  alignSelf: 'flex-start',
  maxWidth: '92%',
  background: '#fff',
  color: '#1A1A1A',
  borderRadius: '14px',
  padding: '10px 14px',
  fontSize: '13px',
  lineHeight: 1.5,
  boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.04)',
};

const BUBBLE_USER: React.CSSProperties = {
  alignSelf: 'flex-end',
  maxWidth: '92%',
  background: '#111',
  color: '#fff',
  borderRadius: '14px',
  padding: '10px 14px',
  fontSize: '13px',
  lineHeight: 1.5,
};

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 6px 0', lineHeight: 1.5 }}>{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600 }}>{children}</strong>
  ),
};

export function TutorDock({ open, onClose, questionId, questionImageUrl, markschemeImageUrl }: TutorDockProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isLoading,
    streamingContent,
    hasMoreSteps,
    sendMessage,
    handleQuickAction,
    handleNextStep,
  } = useTutorChat(questionId, questionImageUrl, markschemeImageUrl);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streamingContent]);

  if (!open) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft.trim());
    setDraft('');
  };

  const showQuickHelp = messages.length === 0;

  return (
    <aside
      data-testid="tutor-dock"
      style={{
        width: '380px',
        flexShrink: 0,
        background: '#FAFAF6',
        margin: '8px 8px 8px 0',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-body)',
      }}
    >
      <header
        style={{
          height: '60px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: '#FFF6E0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C49000',
            }}
          >
            <Lightbulb size={14} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>Tutor</span>
        </div>
        <button
          data-testid="tutor-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Close tutor"
          style={{
            width: '28px',
            height: '28px',
            background: 'transparent',
            border: 'none',
            color: '#9A9A9A',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
        >
          <X size={16} />
        </button>
      </header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <div style={SECTION_LABEL}>About this question</div>

        <div style={BUBBLE_AI}>
          Pick a quick-help action below, or type a question for the tutor.
        </div>

        {messages.map((m, i) => (
          <div key={i} style={m.role === 'assistant' ? BUBBLE_AI : BUBBLE_USER}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {m.content}
            </ReactMarkdown>
          </div>
        ))}

        {streamingContent && (
          <div style={BUBBLE_AI}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={markdownComponents}>
              {streamingContent}
            </ReactMarkdown>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div style={{ ...BUBBLE_AI, color: '#9A9A9A', fontStyle: 'italic' }}>Thinking…</div>
        )}

        {showQuickHelp && (
          <>
            <div style={SECTION_LABEL}>Quick help</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                style={ACTION_BTN}
                onClick={() => handleQuickAction('hint')}
                disabled={isLoading}
              >
                <Lightbulb size={14} color="#C49000" />
                Give me a hint
              </button>
              <button
                type="button"
                style={ACTION_BTN}
                onClick={() => handleQuickAction('walk')}
                disabled={isLoading}
              >
                <Lightbulb size={14} color="#C49000" />
                Walk me through it
              </button>
              <button
                type="button"
                style={ACTION_BTN}
                onClick={() => handleQuickAction('solution')}
                disabled={isLoading}
              >
                <Lightbulb size={14} color="#C49000" />
                Show worked solution
              </button>
            </div>
          </>
        )}

        {hasMoreSteps && (
          <button
            type="button"
            style={{ ...ACTION_BTN, justifyContent: 'center' }}
            onClick={handleNextStep}
            disabled={isLoading}
          >
            Next step →
          </button>
        )}

        <div style={{ flex: 1 }} />

        <form
          onSubmit={onSubmit}
          style={{
            height: '44px',
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '999px',
            padding: '0 6px 0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything about this question…"
            disabled={isLoading}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: '#111',
              fontFamily: 'var(--font-body)',
            }}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={isLoading || !draft.trim()}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#111',
              color: '#fff',
              border: 'none',
              cursor: isLoading || !draft.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !draft.trim() ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowUp size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
}
