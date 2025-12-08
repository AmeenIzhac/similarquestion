import { useState, useRef, useEffect, useMemo } from 'react';
import type { Match, ViewMode, AnnotationMode, TextInputPosition } from '../types/index';
import { formatLabelId, getDocumentBaseFromLabel } from '../utils/formatters';

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
  handleTextSubmit: () => void;
  handleEraserClick: (e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => void;
  onImageLoad: () => void;
  onPrevMatch: () => void;
  onNextMatch: () => void;
  isCurrentSelected: boolean;
  onToggleSelection: () => void;
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
  handleTextSubmit,
  handleEraserClick,
  onImageLoad,
  onPrevMatch,
  onNextMatch,
  isCurrentSelected,
  onToggleSelection
}: QuestionViewerProps) {
  const pdfMenuRef = useRef<HTMLDivElement | null>(null);
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false);

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

  const documentBase = useMemo(() => getDocumentBaseFromLabel(currentMatch?.labelId), [currentMatch?.labelId]);
  const paperPdfUrl = documentBase ? `/edexcel-gcse-maths-papers/${documentBase}.pdf` : null;
  const markschemePdfUrl = documentBase ? `/edexcel-gcse-maths-markschemes/${documentBase}.pdf` : null;

  return (
    <>
      <div style={{
        flex: 'none',
        padding: '8px 16px',
        borderBottom: '1px solid #e5e5e5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box'
      }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#333', flex: 1, marginRight: '10px' }}>
          {formatLabelId(currentMatch.labelId)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div ref={pdfMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setPdfMenuOpen((prev: boolean) => !prev)}
              style={{
                padding: '6px 10px',
                backgroundColor: viewMode === 'question' ? '#f2f2f3' : '#10a37f',
                color: viewMode === 'question' ? '#111' : '#fff',
                border: '1px solid #e5e5e5',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {viewMode === 'question' ? 'View paper/markscheme' : viewMode === 'paper' ? 'Showing paper PDF' : 'Showing markscheme PDF'}
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>
            {pdfMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: '200px',
                  zIndex: 20
                }}
              >
                <button
                  type="button"
                  onClick={() => { setViewMode('question'); setPdfMenuOpen(false); }}
                  style={{
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f2f2f3',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#111'
                  }}
                >
                  Show question image
                </button>
                <button
                  type="button"
                  onClick={() => { if (paperPdfUrl) { setViewMode('paper'); setPdfMenuOpen(false); } }}
                  disabled={!paperPdfUrl}
                  style={{
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #f2f2f3',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: paperPdfUrl ? 'pointer' : 'not-allowed',
                    color: paperPdfUrl ? '#111' : '#9ca3af'
                  }}
                >
                  View full paper PDF
                </button>
                <button
                  type="button"
                  onClick={() => { if (markschemePdfUrl) { setViewMode('markscheme'); setPdfMenuOpen(false); } }}
                  disabled={!markschemePdfUrl}
                  style={{
                    padding: '10px 14px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '12px',
                    textAlign: 'left',
                    cursor: markschemePdfUrl ? 'pointer' : 'not-allowed',
                    color: markschemePdfUrl ? '#111' : '#9ca3af'
                  }}
                >
                  View full markscheme PDF
                </button>
              </div>
            )}
          </div>
          <span style={{ fontSize: '11px', color: '#555' }}>
            Match {currentMatchIndex + 1} of {totalMatches}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onPrevMatch}
              style={{ padding: '6px 10px', backgroundColor: '#f2f2f3', color: '#111', border: '1px solid #e5e5e5', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >
              Previous
            </button>
            <button
              onClick={onNextMatch}
              style={{ padding: '6px 10px', backgroundColor: '#f2f2f3', color: '#111', border: '1px solid #e5e5e5', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
            >
              Next
            </button>
          </div>
          <button
            onClick={onToggleSelection}
            style={{
              padding: '6px 10px',
              backgroundColor: isCurrentSelected ? '#ef4444' : '#10a37f',
              color: '#fff',
              border: '1px solid',
              borderColor: isCurrentSelected ? '#ef4444' : '#10a37f',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 'bold'
            }}
          >
            {isCurrentSelected ? 'Remove from list' : 'Add to worksheet'}
          </button>
        </div>
      </div>
      
      <div style={{
        flex: 1,
        padding: '0px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewMode === 'question' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div 
              ref={questionContainerRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                minHeight: 0,
                borderRadius: '6px',
                paddingBottom: '150px',
                position: 'relative'
              }}
            >
              <img
                src={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
                alt={currentMatch.labelId}
                onLoad={onImageLoad}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  pointerEvents: annotationMode !== 'none' ? 'none' : 'auto'
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
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: annotationMode !== 'none' ? 'auto' : 'none',
                  cursor: annotationMode === 'pen' ? 'crosshair' : annotationMode === 'text' ? 'text' : annotationMode === 'eraser' ? 'pointer' : 'default'
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
                      padding: '4px 8px',
                      border: '2px solid #2563eb',
                      borderRadius: '4px',
                      fontSize: '14px',
                      outline: 'none',
                      minWidth: '100px'
                    }}
                    placeholder="Type and press Enter"
                  />
                </div>
              )}
            </div>
            {showMarkscheme && (
              <div 
                ref={markschemeContainerRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  minHeight: 0,
                  paddingBottom: '150px',
                  position: 'relative'
                }}
              >
                <img
                  src={`/edexcel-gcse-maths-answers/${currentMatch.labelId}`}
                  alt={`Markscheme for ${currentMatch.labelId}`}
                  onLoad={onImageLoad}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    pointerEvents: annotationMode !== 'none' ? 'none' : 'auto'
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
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    pointerEvents: annotationMode !== 'none' ? 'auto' : 'none',
                    cursor: annotationMode === 'pen' ? 'crosshair' : annotationMode === 'text' ? 'text' : annotationMode === 'eraser' ? 'pointer' : 'default'
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
                        padding: '4px 8px',
                        border: '2px solid #2563eb',
                        borderRadius: '4px',
                        fontSize: '14px',
                        outline: 'none',
                        minWidth: '100px'
                      }}
                      placeholder="Type and press Enter"
                    />
                  </div>
                )}
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
      </div>
    </>
  );
}
