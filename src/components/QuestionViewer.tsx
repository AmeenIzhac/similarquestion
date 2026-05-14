import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, MessageCircle, Lightbulb } from 'lucide-react';
import type { Match, ViewMode, AnnotationMode, TextInputPosition, Qualification } from '../types/index';
import { formatLabelId, getDocumentBaseFromLabel } from '../utils/formatters';
import { assetUrl } from '../utils/assets';
import { ChatBot } from './ChatBot';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

interface QuestionViewerProps {
  qualification: Qualification;
  currentMatch: Match;
  currentMatchIndex: number;
  totalMatches: number;
  viewMode: ViewMode;
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
  onToggleTutor: () => void;
}

export function QuestionViewer({
  qualification,
  currentMatch,
  currentMatchIndex,
  totalMatches,
  viewMode,
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
  undoLastAnnotation,
  onToggleTutor,
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
  const paperPdfUrl = documentBase ? assetUrl(qualification, 'papers', `${documentBase}.pdf`) : null;
  const markschemePdfUrl = documentBase ? assetUrl(qualification, 'markschemes', `${documentBase}.pdf`) : null;

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
        borderBottom: isMobile ? '1px solid var(--color-border)' : '1px solid rgba(0,0,0,0.05)',
        backgroundColor: 'var(--color-surface)',
        boxSizing: 'border-box',
      }}>
      {!isMobile && (
        /* Desktop: single 64px row */
        <div style={{
          height: '64px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          {/* Breadcrumb */}
          <div
            data-testid="question-breadcrumb"
            style={{
              fontSize: '12px',
              color: '#9A9A9A',
              fontFamily: 'var(--font-body)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              flex: 1,
            }}
          >
            {formatLabelId(currentMatch.labelId, qualification).replace(/\s•\s/g, ' · ')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              data-testid="viewer-add-worksheet-btn"
              type="button"
              onClick={onToggleSelection}
              style={{
                height: '36px',
                padding: '0 14px',
                background: 'transparent',
                color: '#5A5A5A',
                border: 'none',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
              }}
              title={isCurrentSelected ? 'Remove from worksheet' : 'Add to worksheet'}
            >
              {isCurrentSelected ? <Minus size={14} /> : <Plus size={14} />}
              {isCurrentSelected ? 'Added' : 'Add to worksheet'}
            </button>

            <button
              data-testid="viewer-ask-tutor-btn"
              type="button"
              onClick={onToggleTutor}
              style={{
                height: '36px',
                padding: '0 14px',
                background: '#2D7FF9',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'var(--font-body)',
                whiteSpace: 'nowrap',
              }}
              title="Ask tutor"
            >
              <Lightbulb size={14} />
              Ask tutor
            </button>

            <div style={{
              width: '1px',
              height: '24px',
              background: 'rgba(0,0,0,0.08)',
              margin: '0 4px',
            }} />

            <span
              data-testid="match-counter"
              title={`Question ${currentMatchIndex + 1} of ${totalMatches} in this set`}
              style={{
                fontSize: '12px',
                color: '#6A6A6A',
                background: 'rgba(0,0,0,0.04)',
                padding: '5px 10px',
                borderRadius: '999px',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: 'var(--font-body)',
              }}
            >
              {currentMatchIndex + 1}/{totalMatches}
            </span>

            <button
              data-testid="prev-match-btn"
              type="button"
              onClick={onPrevMatch}
              aria-label="Previous question"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.12)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5A5A5A',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              data-testid="next-match-btn"
              type="button"
              onClick={onNextMatch}
              aria-label="Next question"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.12)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5A5A5A',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {isMobile && (
        /* Mobile: existing two-row toolbar */
        <>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 12px 6px',
          paddingLeft: '58px',
        }}>
          <span
            data-testid="question-title"
            onClick={() => setIsTitleExpanded(!isTitleExpanded)}
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginRight: 'auto',
              overflow: isTitleExpanded ? 'visible' : 'hidden',
              textOverflow: isTitleExpanded ? 'clip' : 'ellipsis',
              whiteSpace: isTitleExpanded ? 'normal' : 'nowrap',
              minWidth: 0,
              cursor: 'pointer',
              wordBreak: 'break-word',
              fontFamily: 'var(--font-heading)',
              letterSpacing: '-0.01em',
            }}>
            {formatLabelId(currentMatch.labelId, qualification)}
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
            </button>
            <button data-testid="next-match-btn" onClick={onNextMatch} style={toolbarBtn()} title="Next">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 12px 10px',
        }}>
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
        </div>
        </>
      )}
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
                touchAction: isMobile && annotationMode === 'none' ? 'pan-y pinch-zoom' : undefined,
              }}
            >
              <TransformWrapper
                minScale={isMobile ? 1 : qMinScale}
                maxScale={isMobile ? 4 : 1}
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
                      src={assetUrl(qualification, 'questions', currentMatch.labelId)}
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
                  touchAction: isMobile && annotationMode === 'none' ? 'pan-y pinch-zoom' : undefined,
                }}
              >
                <TransformWrapper
                  minScale={isMobile ? 1 : mMinScale}
                  maxScale={isMobile ? 4 : 1}
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
                        src={assetUrl(qualification, 'answers', currentMatch.labelId)}
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
            questionImageUrl={assetUrl(qualification, 'questions', currentMatch.labelId)}
            markschemeImageUrl={assetUrl(qualification, 'answers', currentMatch.labelId)}
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
          questionImageUrl={assetUrl(qualification, 'questions', currentMatch.labelId)}
          markschemeImageUrl={assetUrl(qualification, 'answers', currentMatch.labelId)}
          isOpen={isChatOpen}
          onClose={onToggleChat}
          isInline={false}
        />
      )}
    </>
  );
}
