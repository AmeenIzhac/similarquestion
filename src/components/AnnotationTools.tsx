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
  const buttonStyle = (isActive: boolean, isDanger = false): React.CSSProperties => ({
    flex: 1,
    padding: '8px 10px',
    backgroundColor: isActive ? 'var(--color-primary)' : isDanger ? 'var(--color-danger)' : 'var(--color-surface)',
    color: isActive ? '#fff' : isDanger ? '#fff' : 'var(--color-text)',
    border: `1px solid ${isActive ? 'var(--color-primary)' : isDanger ? 'var(--color-danger)' : 'var(--color-border)'}`,
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-family)',
  });

  return (
    <>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
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
          onClick={() => setAnnotationMode(annotationMode === 'text' ? 'none' : 'text')}
          style={buttonStyle(annotationMode === 'text')}
          title="Add text annotation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 7 4 4 20 4 20 7"></polyline>
            <line x1="9" y1="20" x2="15" y2="20"></line>
            <line x1="12" y1="4" x2="12" y2="20"></line>
          </svg>
          Text
        </button>
        <button
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
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
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
          onClick={clearAnnotations}
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
    </>
  );
}
