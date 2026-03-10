import { useState } from 'react';
import { AnnotationTools } from './AnnotationTools';
import { WorksheetPanel } from './WorksheetPanel';
import { FeedbackForm } from './FeedbackForm';
import { Menu, X, SlidersHorizontal, FileText, MessageSquare, Download } from 'lucide-react';
import type { AnnotationMode, Match } from '../types/index';

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
  setMobileOpen
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

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

  const sidebarBtnStyle = (active = false): React.CSSProperties => ({
    width: '100%',
    padding: '10px 14px',
    backgroundColor: active ? 'var(--color-primary-hover)' : 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background var(--transition-fast)',
  });

  const sidebarContent = (
    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={onOpenFilters} style={sidebarBtnStyle()}>
          <SlidersHorizontal size={16} />
          Filters
        </button>

        <AnnotationTools
          annotationMode={annotationMode}
          setAnnotationMode={setAnnotationMode}
          clearAnnotations={clearAnnotations}
          undoLastAnnotation={undoLastAnnotation}
        />

        <button
          onClick={() => setShowWorksheet(!showWorksheet)}
          style={sidebarBtnStyle()}
        >
          <FileText size={16} />
          {showWorksheet ? 'Hide Worksheet' : 'Make Worksheet'}
        </button>

        {topMatches && topMatches.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={isSavingAll}
            style={{
              ...sidebarBtnStyle(),
              opacity: isSavingAll ? 0.6 : 1,
              cursor: isSavingAll ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={16} />
            {isSavingAll ? 'Saving…' : 'Download All'}
          </button>
        )}

        <button
          onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          style={sidebarBtnStyle(showFeedbackForm)}
        >
          <MessageSquare size={16} />
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
              background: 'rgba(0,0,0,0.4)',
              zIndex: 40,
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
        )}
        <div
          className={mobileOpen ? 'animate-fade-in' : ''}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90vw',
            maxWidth: '350px',
            maxHeight: '85vh',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            zIndex: 50,
            display: mobileOpen ? 'flex' : 'none',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          {/* Drawer header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '18px' }}>SQ</span>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-secondary)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={22} />
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
    <div style={{
      width: sidebarOpen ? `${openSidebarWidth}px` : '50px',
      minHeight: '100%',
      backgroundColor: 'var(--color-surface)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width var(--transition-normal)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
      }}>
        {sidebarOpen && (
          <span style={{ fontWeight: 700, color: 'var(--color-text-secondary)', fontSize: '18px' }}>SQ</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '34px',
            height: '34px',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background var(--transition-fast)',
          }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu size={18} />
        </button>
      </div>

      {sidebarOpen && sidebarContent}
    </div>
  );
}
