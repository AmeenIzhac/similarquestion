import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, Eye, MessageCircle } from 'lucide-react';
import type { Match, ViewMode, AnnotationMode, TextInputPosition } from '../types/index';
import { formatLabelId, getDocumentBaseFromLabel } from '../utils/formatters';
import { ChatBot } from './ChatBot';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface QuestionViewerProps {
  currentMatch: Match;
  currentMatchIndex: number;
  totalMatches: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  showMarkscheme: boolean;
  annotationMode: AnnotationMode;
  textInputPos: TextInputPosition | null;
  setTextInputPos: (pos: TextInputPosition | null) => void;
  textInputValue: string;
  setTextInputValue: (value: string) => void;
  questionCanvasRef: React.RefObject<HTMLCanvasElement>;
  markschemeCanvasRef: React.RefObject<HTMLCanvasElement>;
  questionContainerRef: React.RefObject<HTMLDivElement>;
  markschemeContainerRef: React.RefObject<HTMLDivElement>;
  handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  handleCanvasMouseUp: (target: 'question' | 'markscheme') => void;
  handleCanvasTouchStart: (e: React.TouchEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  handleCanvasTouchMove: (e: React.TouchEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  handleCanvasTouchEnd: (target: 'question' | 'markscheme') => void;
  handleTextSubmit: () => void;
  handleEraserClick: (e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  onImageLoad: () => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  isCurrentSelected: boolean;
  onToggleSelection: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isMobile: boolean;
  setAnnotationMode: (mode: AnnotationMode) => void;
  clearAnnotations: () => void;
  undoLastAnnotation: () => void;
}

export function QuestionViewer({
  currentMatch,
  currentMatchIndex,
  totalMatches,
  viewMode,
  setViewMode,
  showMarkscheme,
  annotationMode,
  textInputPos,
  setTextInputPos,
  textInputValue,
  setTextInputValue,
  questionCanvasRef,
  markschemeCanvasRef,
  questionContainerRef,
  markschemeContainerRef,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleCanvasTouchStart,
  handleCanvasTouchMove,
  handleCanvasTouchEnd,
  handleTextSubmit,
  handleEraserClick,
  onImageLoad,
  onPrevMatch,
  onNextMatch,
  isCurrentSelected,
  onToggleSelection,
  isChatOpen,
  onToggleChat,
  isMobile,
  setAnnotationMode,
  clearAnnotations,
  undoLastAnnotation
}: QuestionViewerProps) {
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [qMinScale, setQMinScale] = useState(0.1);
  const [mMinScale, setMMinScale] = useState(0.1);

  const calculateScales = () => {
    if (questionContainerRef.current) {
      const contentHeight = questionContainerRef.current.scrollHeight;
      const visibleHeight = questionContainerRef.current.clientHeight;
      if (contentHeight > 0) setQMinScale(Math.min(1, Math.max(0.05, visibleHeight / contentHeight)));
    }
    if (markschemeContainerRef.current) {
      const contentHeight = markschemeContainerRef.current.scrollHeight;
      const visibleHeight = markschemeContainerRef.current.clientHeight;
      if (contentHeight > 0) setMMinScale(Math.min(1, Math.max(0.05, visibleHeight / contentHeight)));
    }
  };

  useEffect(() => {
    setTimeout(calculateScales, 100);
    window.addEventListener('resize', calculateScales);
    return () => window.removeEventListener('resize', calculateScales);
  }, [showMarkscheme, currentMatch.labelId, isChatOpen]);

  const handleImageLoad = () => {
    onImageLoad();
    setTimeout(calculateScales, 50);
  };

  useEffect(() => {
    if (!pdfMenuOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (pdfMenuRef.current && !pdfMenuRef.current.contains(event.target as Node)) {
        setPdfMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [pdfMenuOpen]);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) {
        e.stopPropagation();
      }
    };

    const qContainer = questionContainerRef.current;
    const mContainer = markschemeContainerRef.current;

    if (qContainer) {
      qContainer.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    }
    if (mContainer) {
      mContainer.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    }

    return () => {
      if (qContainer) {
        qContainer.removeEventListener('wheel', handleWheel, { capture: true });
      }
      if (mContainer) {
        mContainer.removeEventListener('wheel', handleWheel, { capture: true });
      }
    };
  }, [questionContainerRef, markschemeContainerRef, showMarkscheme, isMobile, isChatOpen]);

  const documentBase = useMemo(() => getDocumentBaseFromLabel(currentMatch?.labelId), [currentMatch?.labelId]);
  const paperPdfUrl = documentBase ? `/edexcel-gcse-maths-papers/${documentBase}.pdf` : null;
  const markschemePdfUrl = documentBase ? `/edexcel-gcse-maths-markschemes/${documentBase}.pdf` : null;

  const toolbarBtn = (variant: 'default' | 'primary' | 'danger' = 'default'): React.CSSProperties => ({
    padding: isMobile ? '7px 10px' : '6px 12px',
    backgroundColor: variant === 'primary' ? 'var(--color-primary)' : variant === 'danger' ? 'var(--color-danger)' : 'var(--color-bg)',
    color: variant === 'default' ? 'var(--color-text)' : '#fff',
    border: 'none',
    borderRadius: 'var(--radius-full)',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    whiteSpace: 'nowrap',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-body)',
  });

  return (
    <>
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
            data-testid="viewer-clear-confirm-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--color-surface)',
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
                data-testid="viewer-clear-cancel"
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
                data-testid="viewer-clear-confirm"
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

      {/* Toolbar */}
      <div data-testid="question-toolbar" style={{
        flex: 'none',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        boxSizing: 'border-box',
      }}>
        {/* Row 1: Title + Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '8px' : '10px',
          padding: isMobile ? '12px 12px 6px' : '10px 18px',
          paddingLeft: isMobile ? '58px' : '18px',
        }}>
          <span
            data-testid="question-title"
            onClick={() => {
              if (isMobile) setIsTitleExpanded(!isTitleExpanded);
            }}
            style={{
              fontSize: isMobile ? '14px' : '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginRight: 'auto',
              overflow: (isMobile && isTitleExpanded) ? 'visible' : 'hidden',
              textOverflow: (isMobile && isTitleExpanded) ? 'clip' : 'ellipsis',
              whiteSpace: (isMobile && isTitleExpanded) ? 'normal' : 'nowrap',
              minWidth: 0,
              cursor: isMobile ? 'pointer' : 'default',
              wordBreak: 'break-word',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
            }}>
            {formatLabelId(currentMatch.labelId)}
          </span>

          <span data-testid="match-counter" style={{
            fontSize: '11px',
            color: 'var(--color-text-muted)',
            fontWeight: 500,
            flexShrink: 0,
            backgroundColor: 'var(--color-bg)',
            padding: '3px 10px',
            borderRadius: 'var(--radius-full)',
          }}>
            {currentMatchIndex + 1}/{totalMatches}
          </span>

          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button data-testid="prev-match-btn" onClick={onPrevMatch} style={toolbarBtn()} title="Previous">
              <ChevronLeft size={16} />
              {!isMobile && 'Prev'}
            </button>
            <button data-testid="next-match-btn" onClick={onNextMatch} style={toolbarBtn()} title="Next">
              {!isMobile && 'Next'}
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Action buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '5px' : '8px',
          padding: isMobile ? '4px 12px 10px' : '4px 18px 10px',
          paddingLeft: isMobile ? '12px' : '18px',
        }}>
          {isMobile ? (
            <>
              <button
                data-testid="viewer-pen-btn"
                onClick={() => setAnnotationMode(annotationMode === 'pen' ? 'none' : 'pen')}
                style={toolbarBtn(annotationMode === 'pen' ? 'primary' : 'default')}
                title="Pen"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
              </button>
              <button
                data-testid="viewer-eraser-btn"
                onClick={() => setAnnotationMode(annotationMode === 'eraser' ? 'none' : 'eraser')}
                style={toolbarBtn(annotationMode === 'eraser' ? 'primary' : 'default')}
                title="Eraser"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 20H7L3 16l9-9 9 9-4 4z"></path>
                  <path d="M6.5 13.5L12 8"></path>
                </svg>
              </button>
              <button data-testid="viewer-undo-btn" onClick={undoLastAnnotation} style={toolbarBtn()} title="Undo">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"></path>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
                </svg>
              </button>
              <button data-testid="viewer-clear-btn" onClick={() => setShowClearConfirm(true)} style={toolbarBtn('danger')} title="Clear all">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
              <div style={{ marginLeft: 'auto' }}>
                <button
                  data-testid="viewer-chat-toggle-btn"
                  onClick={onToggleChat}
                  style={toolbarBtn(isChatOpen ? 'danger' : 'primary')}
                  title={isChatOpen ? 'Close help' : 'Get help'}
                >
                  <MessageCircle size={13} />
                  {isChatOpen ? 'Close' : 'Help'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div ref={pdfMenuRef} style={{ position: 'relative' }}>
                <button
                  data-testid="viewer-pdf-menu-btn"
                  onClick={() => setPdfMenuOpen((prev: boolean) => !prev)}
                  style={toolbarBtn(viewMode !== 'question' ? 'primary' : 'default')}
                >
                  <Eye size={14} />
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
                      backgroundColor: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-lg)',
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: '200px',
                      zIndex: 20,
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
                        data-testid={`viewer-pdf-option-${mode}`}
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

              <button
                data-testid="viewer-add-worksheet-btn"
                onClick={onToggleSelection}
                style={toolbarBtn(isCurrentSelected ? 'danger' : 'primary')}
                title={isCurrentSelected ? 'Remove from worksheet' : 'Add to worksheet'}
              >
                {isCurrentSelected ? <Minus size={13} /> : <Plus size={13} />}
                {isCurrentSelected ? 'Remove' : 'Add to worksheet'}
              </button>

              <button
                data-testid="viewer-chat-toggle-desktop-btn"
                onClick={onToggleChat}
                style={toolbarBtn(isChatOpen ? 'danger' : 'primary')}
                title={isChatOpen ? 'Close help' : 'Get help'}
              >
                <MessageCircle size={13} />
                {isChatOpen ? 'Close Help' : 'Get Help'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{
        flex: 1,
        padding: '0px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {viewMode === 'question' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div
              ref={questionContainerRef}
              data-testid="question-image-container"
              style={{
                flex: (isMobile && isChatOpen) ? '0 1 auto' : '1 1 0%',
                overflowY: 'auto',
                minHeight: 0,
                maxHeight: (isMobile && isChatOpen) ? '45%' : 'none',
                paddingBottom: (isMobile && isChatOpen) ? '10px' : '150px',
                position: 'relative',
                backgroundColor: 'var(--color-surface-alt)',
              }}
            >
              <TransformWrapper
                minScale={qMinScale}
                maxScale={1}
                initialScale={1}
                centerZoomedOut={true}
                customTransform={(x, y, scale) => {
                  let newX = x;
                  if (questionContainerRef.current && scale <= 1) {
                    const w = questionContainerRef.current.clientWidth;
                    newX = (w - w * scale) / 2;
                  }
                  return `translate3d(${newX}px, ${Math.min(y, 0)}px, 0) scale(${scale})`;
                }}
                panning={{ disabled: annotationMode !== 'none' }}
                wheel={{ step: 0.5, disabled: annotationMode !== 'none' }}
                pinch={{ step: 15, disabled: annotationMode !== 'none' }}
                doubleClick={{ disabled: true }}
              >
                <TransformComponent wrapperStyle={{ width: '100%', minHeight: '100%' }} contentStyle={{ width: '100%' }}>
                  <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--color-surface)' }}>
                    <img
                      src={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
                      alt={currentMatch.labelId}
                      onLoad={handleImageLoad}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                        pointerEvents: annotationMode !== 'none' ? 'none' : 'auto',
                      }}
                    />
                    <canvas
                      ref={questionCanvasRef}
                      onMouseDown={(e) => {
                        if (annotationMode === 'eraser') {
                          handleEraserClick(e, 'question');
                        } else {
                          handleCanvasMouseDown(e, 'question');
                        }
                      }}
                      onMouseMove={(e) => handleCanvasMouseMove(e, 'question')}
                      onMouseUp={() => handleCanvasMouseUp('question')}
                      onMouseLeave={() => handleCanvasMouseUp('question')}
                      onTouchStart={(e) => handleCanvasTouchStart(e, 'question')}
                      onTouchMove={(e) => handleCanvasTouchMove(e, 'question')}
                      onTouchEnd={() => handleCanvasTouchEnd('question')}
                      onTouchCancel={() => handleCanvasTouchEnd('question')}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: annotationMode !== 'none' ? 'auto' : 'none',
                        touchAction: annotationMode !== 'none' ? 'none' : 'auto',
                        cursor: annotationMode === 'pen' ? 'crosshair' : annotationMode === 'text' ? 'text' : annotationMode === 'eraser' ? 'pointer' : 'default',
                      }}
                    />
                    {textInputPos && textInputPos.target === 'question' && (
                      <div style={{ position: 'absolute', left: textInputPos.x, top: textInputPos.y, zIndex: 10 }}>
                        <input
                          type="text"
                          value={textInputValue}
                          onChange={(e) => setTextInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextSubmit();
                            if (e.key === 'Escape') setTextInputPos(null);
                          }}
                          onBlur={handleTextSubmit}
                          autoFocus
                          style={{
                            padding: '6px 10px',
                            border: '2px solid var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '14px',
                            outline: 'none',
                            minWidth: '100px',
                            fontFamily: 'var(--font-body)',
                          }}
                          placeholder="Type and press Enter"
                        />
                      </div>
                    )}
                  </div>
                </TransformComponent>
              </TransformWrapper>
            </div>
            {showMarkscheme && (!isMobile || !isChatOpen) && (
              <div
                ref={markschemeContainerRef}
                data-testid="markscheme-container"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  paddingBottom: '150px',
                  position: 'relative',
                  backgroundColor: 'var(--color-bg)',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <TransformWrapper
                  minScale={mMinScale}
                  maxScale={1}
                  initialScale={1}
                  centerZoomedOut={true}
                  customTransform={(x, y, scale) => {
                    let newX = x;
                    if (markschemeContainerRef.current && scale <= 1) {
                      const w = markschemeContainerRef.current.clientWidth;
                      newX = (w - w * scale) / 2;
                    }
                    return `translate3d(${newX}px, ${Math.min(y, 0)}px, 0) scale(${scale})`;
                  }}
                  panning={{ disabled: annotationMode !== 'none' }}
                  wheel={{ step: 0.5, disabled: annotationMode !== 'none' }}
                  pinch={{ step: 15, disabled: annotationMode !== 'none' }}
                  doubleClick={{ disabled: true }}
                >
                  <TransformComponent wrapperStyle={{ width: '100%', minHeight: '100%' }} contentStyle={{ width: '100%' }}>
                    <div style={{ position: 'relative', width: '100%', backgroundColor: 'var(--color-surface)' }}>
                      <img
                        src={`/edexcel-gcse-maths-answers/${currentMatch.labelId}`}
                        alt={`Markscheme for ${currentMatch.labelId}`}
                        onLoad={handleImageLoad}
                        style={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                          pointerEvents: annotationMode !== 'none' ? 'none' : 'auto',
                        }}
                      />
                      <canvas
                        ref={markschemeCanvasRef}
                        onMouseDown={(e) => {
                          if (annotationMode === 'eraser') {
                            handleEraserClick(e, 'markscheme');
                          } else {
                            handleCanvasMouseDown(e, 'markscheme');
                          }
                        }}
                        onMouseMove={(e) => handleCanvasMouseMove(e, 'markscheme')}
                        onMouseUp={() => handleCanvasMouseUp('markscheme')}
                        onMouseLeave={() => handleCanvasMouseUp('markscheme')}
                        onTouchStart={(e) => handleCanvasTouchStart(e, 'markscheme')}
                        onTouchMove={(e) => handleCanvasTouchMove(e, 'markscheme')}
                        onTouchEnd={() => handleCanvasTouchEnd('markscheme')}
                        onTouchCancel={() => handleCanvasTouchEnd('markscheme')}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          pointerEvents: annotationMode !== 'none' ? 'auto' : 'none',
                          touchAction: annotationMode !== 'none' ? 'none' : 'auto',
                          cursor: annotationMode === 'pen' ? 'crosshair' : annotationMode === 'text' ? 'text' : annotationMode === 'eraser' ? 'pointer' : 'default',
                        }}
                      />
                      {textInputPos && textInputPos.target === 'markscheme' && (
                        <div style={{ position: 'absolute', left: textInputPos.x, top: textInputPos.y, zIndex: 10 }}>
                          <input
                            type="text"
                            value={textInputValue}
                            onChange={(e) => setTextInputValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleTextSubmit();
                              if (e.key === 'Escape') setTextInputPos(null);
                            }}
                            onBlur={handleTextSubmit}
                            autoFocus
                            style={{
                              padding: '6px 10px',
                              border: '2px solid var(--color-primary)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '14px',
                              outline: 'none',
                              minWidth: '100px',
                              fontFamily: 'var(--font-body)',
                            }}
                            placeholder="Type and press Enter"
                          />
                        </div>
                      )}
                    </div>
                  </TransformComponent>
                </TransformWrapper>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
            <iframe
              src={viewMode === 'paper' ? paperPdfUrl ?? undefined : markschemePdfUrl ?? undefined}
              title={viewMode === 'paper' ? `${currentMatch.labelId} full paper` : `${currentMatch.labelId} markscheme`}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        {isMobile && isChatOpen && (
          <ChatBot
            questionId={currentMatch.labelId}
            questionText={currentMatch.text}
            questionImageUrl={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
            markschemeImageUrl={`/edexcel-gcse-maths-answers/${currentMatch.labelId}`}
            isOpen={true}
            onClose={onToggleChat}
            isInline={true}
          />
        )}
      </div>

      {!isMobile && (
        <ChatBot
          questionId={currentMatch.labelId}
          questionText={currentMatch.text}
          questionImageUrl={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
          markschemeImageUrl={`/edexcel-gcse-maths-answers/${currentMatch.labelId}`}
          isOpen={isChatOpen}
          onClose={onToggleChat}
          isInline={false}
        />
      )}
    </>
  );
}
