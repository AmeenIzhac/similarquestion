import { useState } from 'react';
import type { AnnotationMode } from '../types/index';

interface AnnotationToolsProps {
  annotationMode: AnnotationMode;
  setAnnotationMode: (mode: AnnotationMode) => void;
  clearAnnotations: () => void;
  undoLastAnnotation: () => void;
}

export function AnnotationTools({
  annotationMode,
  setAnnotationMode,
  clearAnnotations,
  undoLastAnnotation
}: AnnotationToolsProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const btnBase: React.CSSProperties = {
    flex: 1,
    padding: '9px 12px',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  };

  const buttonStyle = (isActive: boolean, isDanger = false): React.CSSProperties => ({
    ...btnBase,
    backgroundColor: isActive ? 'var(--color-primary)' : isDanger ? 'var(--color-danger)' : 'var(--color-bg)',
    color: isActive ? '#fff' : isDanger ? '#fff' : 'var(--color-text)',
    border: 'none',
  });

  return (
    <>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          data-testid="annotation-pen-btn"
          onClick={() => setAnnotationMode(annotationMode === 'pen' ? 'none' : 'pen')}
          style={buttonStyle(annotationMode === 'pen')}
          title="Draw on question"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
          Pen
        </button>
        <button
          data-testid="annotation-eraser-btn"
          onClick={() => setAnnotationMode(annotationMode === 'eraser' ? 'none' : 'eraser')}
          style={buttonStyle(annotationMode === 'eraser')}
          title="Erase annotations"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16l9-9 9 9-4 4z"></path>
            <path d="M6.5 13.5L12 8"></path>
          </svg>
          Eraser
        </button>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          data-testid="annotation-undo-btn"
          onClick={undoLastAnnotation}
          style={buttonStyle(false)}
          title="Undo last annotation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
          </svg>
          Undo
        </button>
        <button
          data-testid="annotation-clear-btn"
          onClick={() => setShowClearConfirm(true)}
          style={buttonStyle(false, true)}
          title="Clear all annotations"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Clear
        </button>
      </div>

      {showClearConfirm && (
        <>
          <div
            onClick={() => setShowClearConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.25)',
              zIndex: 100,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <div
            className="animate-scale-in"
            data-testid="clear-confirm-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              zIndex: 101,
              boxShadow: 'var(--shadow-lg)',
              textAlign: 'center',
              maxWidth: '300px',
              width: '90vw',
            }}
          >
            <p style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
              Clear all annotations?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                data-testid="clear-confirm-cancel"
                onClick={() => setShowClearConfirm(false)}
                style={{
                  padding: '9px 22px',
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                }}
              >
                Cancel
              </button>
              <button
                data-testid="clear-confirm-yes"
                onClick={() => { clearAnnotations(); setShowClearConfirm(false); }}
                style={{
                  padding: '9px 22px',
                  backgroundColor: 'var(--color-danger)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
