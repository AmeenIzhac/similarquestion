import { useState, useRef, useEffect } from 'react';
import { AnnotationTools } from './AnnotationTools';
import { WorksheetPanel } from './WorksheetPanel';
import { FeedbackForm } from './FeedbackForm';
import { X, SlidersHorizontal, FileText, MessageSquare, Download, Plus, Minus, Eye } from 'lucide-react';
import type { AnnotationMode, Match, ViewMode } from '../types/index';

interface SidebarProps {
  isMobile: boolean;
  annotationMode: AnnotationMode;
  setAnnotationMode: (mode: AnnotationMode) => void;
  clearAnnotations: () => void;
  undoLastAnnotation: () => void;
  selectedQuestions: string[];
  removeSelectedQuestion: (labelId: string) => void;
  onOpenFilters: () => void;
  topMatches?: Match[];
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  viewMode?: ViewMode;
  setViewMode?: (mode: ViewMode) => void;
  paperPdfUrl?: string | null;
  markschemePdfUrl?: string | null;
  isCurrentSelected?: boolean;
  onToggleSelection?: () => void;
}

export function Sidebar({
  isMobile,
  annotationMode,
  setAnnotationMode,
  clearAnnotations,
  undoLastAnnotation,
  selectedQuestions,
  removeSelectedQuestion,
  onOpenFilters,
  topMatches,
  mobileOpen,
  setMobileOpen,
  viewMode,
  setViewMode,
  paperPdfUrl,
  markschemePdfUrl,
  isCurrentSelected,
  onToggleSelection
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(e.target as Node)) {
        setPdfMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDownloadAll = async () => {
    if (!topMatches || topMatches.length === 0 || isSavingAll) return;
    setIsSavingAll(true);
    try {
      const { generatePdf } = await import('../utils/pdf');
      const matchLabels = topMatches.map(m => m.labelId);
      await generatePdf(matchLabels, 'questions', 'all-matches');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsSavingAll(false);
    }
  };

  const btnBase: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  };

  const primaryBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  };

  const ghostBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text)',
  };

  const sidebarContent = (
    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button data-testid="sidebar-filters-btn" onClick={onOpenFilters} style={ghostBtn}>
          <SlidersHorizontal size={15} />
          Filters
        </button>

        {isMobile && viewMode !== undefined && setViewMode && (
          <>
            <div ref={pdfMenuRef} style={{ position: 'relative' }}>
              <button
                data-testid="sidebar-pdf-menu-btn"
                onClick={() => setPdfMenuOpen((prev) => !prev)}
                style={viewMode !== 'question' ? primaryBtn : ghostBtn}
              >
                <Eye size={15} />
                {viewMode === 'question' ? 'View paper/markscheme' : viewMode === 'paper' ? 'Paper PDF' : 'Markscheme PDF'}
                <span style={{ fontSize: '9px' }}>&#9662;</span>
              </button>
              {pdfMenuOpen && (
                <div
                  className="animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 60,
                    overflow: 'hidden',
                  }}
                >
                  {[
                    { label: 'Show question image', mode: 'question' as ViewMode, url: true },
                    { label: 'View full paper PDF', mode: 'paper' as ViewMode, url: !!paperPdfUrl },
                    { label: 'View markscheme PDF', mode: 'markscheme' as ViewMode, url: !!markschemePdfUrl },
                  ].map(({ label, mode, url }, i) => (
                    <button
                      key={mode}
                      data-testid={`sidebar-pdf-option-${mode}`}
                      type="button"
                      onClick={() => { if (url) { setViewMode(mode); setPdfMenuOpen(false); } }}
                      disabled={!url}
                      style={{
                        padding: '11px 16px',
                        background: viewMode === mode ? 'var(--color-primary-light)' : 'transparent',
                        border: 'none',
                        borderBottom: i < 2 ? '1px solid var(--color-border-light)' : 'none',
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: url ? 'pointer' : 'not-allowed',
                        color: url ? 'var(--color-text)' : 'var(--color-text-muted)',
                        fontWeight: viewMode === mode ? 600 : 400,
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onToggleSelection && (
              <button
                data-testid="sidebar-toggle-selection-btn"
                onClick={onToggleSelection}
                style={isCurrentSelected ? { ...ghostBtn, color: 'var(--color-danger)' } : primaryBtn}
              >
                {isCurrentSelected ? <Minus size={15} /> : <Plus size={15} />}
                {isCurrentSelected ? 'Remove from worksheet' : 'Add to worksheet'}
              </button>
            )}
          </>
        )}

        <AnnotationTools
          annotationMode={annotationMode}
          setAnnotationMode={setAnnotationMode}
          clearAnnotations={clearAnnotations}
          undoLastAnnotation={undoLastAnnotation}
        />

        <button
          data-testid="sidebar-worksheet-btn"
          onClick={() => setShowWorksheet(!showWorksheet)}
          style={ghostBtn}
        >
          <FileText size={15} />
          {showWorksheet ? 'Hide Worksheet' : 'Make Worksheet'}
        </button>

        {topMatches && topMatches.length > 0 && (
          <button
            data-testid="sidebar-download-all-btn"
            onClick={handleDownloadAll}
            disabled={isSavingAll}
            style={{
              ...ghostBtn,
              opacity: isSavingAll ? 0.5 : 1,
              cursor: isSavingAll ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={15} />
            {isSavingAll ? 'Saving...' : 'Download All'}
          </button>
        )}

        <button
          data-testid="sidebar-feedback-btn"
          onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          style={showFeedbackForm ? primaryBtn : ghostBtn}
        >
          <MessageSquare size={15} />
          {showFeedbackForm ? 'Hide Feedback' : 'Request Features'}
        </button>

        {showFeedbackForm && <FeedbackForm />}

        {showWorksheet && (
          <WorksheetPanel
            selectedQuestions={selectedQuestions}
            removeSelectedQuestion={removeSelectedQuestion}
            onHide={() => setShowWorksheet(false)}
          />
        )}
      </div>
    </div>
  );

  /* ════════════════ MOBILE DRAWER ════════════════ */
  if (isMobile) {
    return (
      <>
        {mobileOpen && (
          <div
            className="animate-fade-in"
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.25)',
              zIndex: 40,
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
        )}
        <div
          className={mobileOpen ? 'animate-scale-in' : ''}
          data-testid="mobile-sidebar-drawer"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: '360px',
            maxHeight: '85vh',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            zIndex: 50,
            display: mobileOpen ? 'flex' : 'none',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 18px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '16px', fontFamily: 'var(--font-heading)' }}>Menu</span>
            <button
              data-testid="mobile-sidebar-close-btn"
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'var(--color-bg)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={18} />
            </button>
          </div>
          {sidebarContent}
        </div>
      </>
    );
  }

  /* ════════════════ DESKTOP SIDEBAR ════════════════ */
  const openSidebarWidth = 280;

  return (
    <div
      data-testid="desktop-sidebar"
      style={{
        width: sidebarOpen ? `${openSidebarWidth}px` : '56px',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width var(--transition-normal)',
        position: 'relative',
        margin: '8px 0 8px 8px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: sidebarOpen ? 'space-between' : 'center',
        padding: '14px 16px',
      }}>
        {sidebarOpen && (
          <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '16px', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>SQ</span>
        )}
        <button
          data-testid="sidebar-toggle-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-fast)',
          }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>

      {sidebarOpen && sidebarContent}
    </div>
  );
}
