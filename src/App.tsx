import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Sidebar, SearchBar, BoardSelector, FilterModal, LoadingOverlay, QuestionViewer, TutorDock } from './components';
import { PhotoCapture } from './components/PhotoCapture';
import { useAnnotations } from './hooks/useAnnotations';
import { useSearch } from './hooks/useSearch';
import { Menu, Eye, EyeOff, Check } from 'lucide-react';
import type { LevelFilter, CalculatorFilter, Qualification, Board, ExamBoard, ViewMode } from './types/index';
import { getDocumentBaseFromLabel } from './utils/formatters';
import { assetUrl } from './utils/assets';
import { callMarkWithAI, exportPenWork, type MarkResult } from './utils/markWithAI';
import { createMarkSession } from './utils/markSession';

const QUALIFICATION_STORAGE_KEY = 'qualification';
const BOARD_STORAGE_KEY = 'board';

function readStoredQualification(): Qualification {
  if (typeof window === 'undefined') return 'gcse';
  const v = window.localStorage.getItem(QUALIFICATION_STORAGE_KEY);
  return v === 'alevel' ? 'alevel' : 'gcse';
}

function readStoredBoard(): Board {
  if (typeof window === 'undefined') return 'all';
  const v = window.localStorage.getItem(BOARD_STORAGE_KEY);
  return v === 'aqa' || v === 'edexcel' || v === 'ocr' ? v : 'all';
}

function App() {
  const [qualification, setQualification] = useState<Qualification>(readStoredQualification);
  const [board, setBoard] = useState<Board>(readStoredBoard);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<CalculatorFilter>('all');
  const [numMatches, setNumMatches] = useState<number>(25);

  const [searchText, setSearchText] = useState<string>('');
  const [showCenterFilter, setShowCenterFilter] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [showMarkscheme, setShowMarkscheme] = useState<boolean>(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [boardByLabel, setBoardByLabel] = useState<Record<string, ExamBoard>>({});
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [tutorOpen, setTutorOpen] = useState<boolean>(false);
  const [markAIMenuOpen, setMarkAIMenuOpen] = useState<boolean>(false);
  const [markAIMode, setMarkAIMode] = useState<null | 'pen' | 'upload' | 'qr'>(null);
  const [uploadedMarkImages, setUploadedMarkImages] = useState<string[]>([]);
  const [markLoading, setMarkLoading] = useState<boolean>(false);
  const [markResult, setMarkResult] = useState<MarkResult | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const [submittedWork, setSubmittedWork] = useState<string[]>([]);
  const [qrSessionUrl, setQrSessionUrl] = useState<string | null>(null);
  const [qrWaiting, setQrWaiting] = useState<boolean>(false);
  const qrUnsubRef = useRef<(() => void) | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const markMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    isProcessing,
    topMatches,
    currentMatch,
    currentMatchIndex,
    hasStarted,
    setHasStarted,
    nextMatch,
    prevMatch,
    searchByText
  } = useSearch({ levelFilter, calculatorFilter, numMatches, qualification, board });

  const {
    annotationMode,
    setAnnotationMode,
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
    clearAnnotations,
    resizeCanvases,
    undoLastAnnotation,
    redoLastAnnotation,
    handleEraserClick
  } = useAnnotations({
    currentLabelId: currentMatch?.labelId,
    viewMode,
    showMarkscheme
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(QUALIFICATION_STORAGE_KEY, qualification);
    }
    setLevelFilter('all');
    setCalculatorFilter('all');
    setSelectedQuestions([]);
    setBoardByLabel({});
    if (hasStarted && searchText.trim()) {
      searchByText(searchText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualification]);

  // Persist the chosen board and re-run the active search when it changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BOARD_STORAGE_KEY, board);
    }
    if (hasStarted && searchText.trim()) {
      searchByText(searchText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setViewMode('question');
    setShowMarkscheme(false);
  }, [currentMatch?.labelId]);

  useEffect(() => {
    if (viewMode !== 'question') {
      setShowMarkscheme(false);
    }
  }, [viewMode]);

  const closeMarkAI = useCallback(() => {
    setMarkAIMode(null);
    setUploadedMarkImages([]);
    setMarkResult(null);
    setMarkError(null);
    setMarkLoading(false);
    setSubmittedWork([]);
    qrUnsubRef.current?.();
    qrUnsubRef.current = null;
    setQrSessionUrl(null);
    setQrWaiting(false);
  }, []);

  const runMark = useCallback(async (workImages: string[]) => {
    if (!currentMatch || currentMatch.labelId === 'error') return;
    setMarkLoading(true);
    setMarkError(null);
    setMarkResult(null);
    setSubmittedWork(workImages);
    try {
      const result = await callMarkWithAI({
        questionImageUrl: assetUrl(qualification, 'questions', currentMatch.labelId, currentMatch.board),
        markschemeImageUrl: assetUrl(qualification, 'answers', currentMatch.labelId, currentMatch.board),
        workImages,
        qualification: qualification === 'alevel' ? 'A-Level' : 'GCSE',
      });
      setMarkResult(result);
    } catch (e: any) {
      setMarkError(e?.message || 'Marking failed');
    } finally {
      setMarkLoading(false);
    }
  }, [currentMatch, qualification]);

  const handleMarkPen = useCallback(async () => {
    if (!currentMatch || currentMatch.labelId === 'error') return;
    const canvas = questionCanvasRef.current;
    if (!canvas) {
      setMarkError('No pen canvas available — try drawing something first.');
      return;
    }
    try {
      const work = exportPenWork(canvas);
      await runMark([work]);
    } catch (e: any) {
      setMarkError(e?.message || 'Failed to capture your pen work');
      setMarkLoading(false);
    }
  }, [currentMatch, questionCanvasRef, runMark]);

  const startQrSession = useCallback(async () => {
    setMarkError(null);
    setQrSessionUrl(null);
    setQrWaiting(true);
    try {
      const session = await createMarkSession((workImages) => {
        setQrWaiting(false);
        runMark(workImages);
      });
      qrUnsubRef.current?.();
      qrUnsubRef.current = session.unsubscribe;
      setQrSessionUrl(session.url);
    } catch (e: any) {
      setQrWaiting(false);
      setMarkError(e?.message || 'Could not start phone-camera session');
    }
  }, [runMark]);

  useEffect(() => () => { qrUnsubRef.current?.(); }, []);

  // Close the Check-markscheme dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!markAIMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const root = markMenuRef.current;
      if (root && !root.contains(e.target as Node)) {
        setMarkAIMenuOpen(false);
      }
    };
    // mousedown so we fire before any click handlers on the page
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [markAIMenuOpen]);

  useEffect(() => {
    // On mobile, the QR option just opens the camera directly — no session needed.
    if (markAIMode === 'qr' && !isMobile && !qrSessionUrl && !qrWaiting) {
      startQrSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAIMode, isMobile]);

  const MAX_UPLOAD_IMAGES = 6;

  const addUploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    // Read every file first (side effects must NOT live inside a setState updater —
    // React StrictMode runs updaters twice in dev, which would double-append).
    const dataUrls = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
    setUploadedMarkImages((prev) => {
      const room = MAX_UPLOAD_IMAGES - prev.length;
      if (room <= 0) return prev;
      return [...prev, ...dataUrls.slice(0, room)];
    });
  }, []);

  // Global paste listener while the upload modal is open — works anywhere on the page,
  // no focused input needed. Skip if a text field has focus so we don't hijack normal paste.
  useEffect(() => {
    if (markAIMode !== 'upload' || markResult || markLoading) return;
    const handler = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = Array.from(items)
        .filter((it) => it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter((f): f is File => !!f);
      if (files.length === 0) return;
      e.preventDefault();
      addUploadFiles(files);
    };
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [markAIMode, markResult, markLoading, addUploadFiles]);

  const isCurrentSelected = useMemo(() => {
    if (!currentMatch || currentMatch.labelId === 'error') return false;
    return selectedQuestions.includes(currentMatch.labelId);
  }, [currentMatch, selectedQuestions]);

  const toggleCurrentQuestionSelection = useCallback(() => {
    if (!currentMatch || currentMatch.labelId === 'error') return;
    setSelectedQuestions((prev) => {
      const exists = prev.includes(currentMatch.labelId);
      return exists
        ? prev.filter((item) => item !== currentMatch.labelId)
        : [...prev, currentMatch.labelId];
    });
    setBoardByLabel((prev) => {
      const next = { ...prev };
      if (currentMatch.labelId in next) {
        delete next[currentMatch.labelId];
      } else if (currentMatch.board) {
        next[currentMatch.labelId] = currentMatch.board;
      }
      return next;
    });
  }, [currentMatch]);

  const removeSelectedQuestion = useCallback((labelId: string) => {
    setSelectedQuestions((prev) => prev.filter((item) => item !== labelId));
    setBoardByLabel((prev) => {
      const next = { ...prev };
      delete next[labelId];
      return next;
    });
  }, []);

  const reorderSelectedQuestions = useCallback((next: string[]) => {
    setSelectedQuestions(next);
  }, []);

  const handleTextSearch = (e?: React.FormEvent, directText?: string) => {
    e?.preventDefault();
    const query = directText || searchText.trim();
    if (query) {
      setHasStarted(true);
      searchByText(query);
    }
  };

  const handleApplyFilters = useCallback(() => {
    setShowCenterFilter(false);
    if (hasStarted && searchText.trim()) {
      searchByText(searchText);
    }
  }, [hasStarted, searchText, searchByText]);

  const documentBase = useMemo(() => currentMatch ? getDocumentBaseFromLabel(currentMatch.labelId) : null, [currentMatch?.labelId]);
  const paperPdfUrl = documentBase ? assetUrl(qualification, 'papers', `${documentBase}.pdf`, currentMatch?.board) : null;
  const markschemePdfUrl = documentBase ? assetUrl(qualification, 'markschemes', `${documentBase}.pdf`, currentMatch?.board) : null;

  const isLanding = !hasStarted && !isProcessing && (!currentMatch || currentMatch.labelId === 'error');

  return (
    <div data-testid="app-root" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--color-surface-alt)', padding: isMobile ? '0' : '0' }}>
      <Sidebar
        qualification={qualification}
        isMobile={isMobile}
        annotationMode={annotationMode}
        setAnnotationMode={setAnnotationMode}
        clearAnnotations={clearAnnotations}
        undoLastAnnotation={undoLastAnnotation}
        redoLastAnnotation={redoLastAnnotation}
        selectedQuestions={selectedQuestions}
        boardByLabel={boardByLabel}
        removeSelectedQuestion={removeSelectedQuestion}
        reorderSelectedQuestions={reorderSelectedQuestions}
        onOpenFilters={() => setShowCenterFilter(true)}
        topMatches={topMatches}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
        viewMode={viewMode}
        setViewMode={setViewMode}
        paperPdfUrl={paperPdfUrl}
        markschemePdfUrl={markschemePdfUrl}
        isCurrentSelected={isCurrentSelected}
        onToggleSelection={toggleCurrentQuestionSelection}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        margin: isMobile ? '0' : '8px',
        borderRadius: isMobile ? '0' : 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface)',
        boxShadow: isMobile ? 'none' : 'var(--shadow-md)',
      }}>
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            data-testid="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 30,
              width: '38px',
              height: '38px',
              backgroundColor: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--color-text)',
            }}
            title="Open menu"
          >
            <Menu size={18} />
          </button>
        )}

        {/* Landing page */}
        {isLanding && (
          <div
            data-testid="landing-page"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: '#FAFAF6',
            }}
          >
            {/* Math glyphs */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {[
                { char: '∫', left: 12, top: 18, size: 90, rotation: -8 },
                { char: 'π', left: 78, top: 12, size: 70, rotation: 6 },
                { char: 'Σ', left: 8,  top: 72, size: 80, rotation: 4 },
                { char: '√', left: 82, top: 70, size: 75, rotation: -5 },
                { char: 'ƒ', left: 50, top: 8,  size: 55, rotation: 0 },
                { char: 'θ', left: 22, top: 45, size: 50, rotation: 8 },
                { char: '≈', left: 72, top: 42, size: 55, rotation: -3 },
                { char: '∞', left: 45, top: 82, size: 60, rotation: 2 },
                { char: 'Δ', left: 90, top: 30, size: 45, rotation: 0 },
                { char: 'λ', left: 32, top: 28, size: 45, rotation: -6 },
              ].map((g, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${g.left}%`,
                    top: `${g.top}%`,
                    fontSize: `${g.size}px`,
                    fontFamily: '"Times New Roman", serif',
                    color: 'rgba(0, 0, 0, 0.045)',
                    transform: `translate(-50%, -50%) rotate(${g.rotation}deg)`,
                    lineHeight: 1,
                  }}
                >
                  {g.char}
                </span>
              ))}
            </div>

            {/* Vignette — fades glyphs around the centered content */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(ellipse 55% 45% at center, rgba(250, 250, 246, 0.92) 0%, transparent 100%)',
              }}
            />

            <div style={{
              width: '100%',
              maxWidth: '720px',
              margin: '0 auto',
              padding: isMobile ? '24px 20px' : '24px 32px',
              position: 'relative',
              zIndex: 1,
            }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{
                  margin: '0 0 10px 0',
                  fontSize: isMobile ? '26px' : '40px',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.03em',
                  fontFamily: 'var(--font-heading)',
                }}>
                  Describe a maths question or topic
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '14px' : '16px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Upload an image or type a description to find similar questions
                </p>
              </div>
              <div
                data-testid="qualification-tabs"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '32px',
                  marginBottom: '20px',
                }}
              >
                {([
                  { value: 'gcse', label: 'GCSE' },
                  { value: 'alevel', label: 'A-level' },
                ] as const).map((tab) => {
                  const active = qualification === tab.value;
                  return (
                    <button
                      key={tab.value}
                      data-testid={`qualification-tab-${tab.value}`}
                      type="button"
                      onClick={() => setQualification(tab.value)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '8px 4px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: active ? 700 : 500,
                        color: active ? '#111' : '#9A9A9A',
                        fontFamily: 'var(--font-body)',
                        borderBottom: active ? '2px solid #111' : '2px solid transparent',
                        transition: 'color var(--transition-fast), border-color var(--transition-fast)',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                <BoardSelector board={board} setBoard={setBoard} />
              </div>
              <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                onSearch={handleTextSearch}
                isProcessing={isProcessing}
                isMobile={isMobile}
                autoGrow
              />
            </div>
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              zIndex: 1,
              fontWeight: 500,
            }}>
              Similar Question 2026
            </div>
          </div>
        )}

        {/* Question viewer */}
        {currentMatch && !isProcessing && currentMatch.labelId !== 'error' && (
          <QuestionViewer
            qualification={qualification}
            currentMatch={currentMatch}
            currentMatchIndex={currentMatchIndex}
            totalMatches={topMatches.length}
            viewMode={viewMode}
            showMarkscheme={showMarkscheme}
            annotationMode={annotationMode}
            textInputPos={textInputPos}
            setTextInputPos={setTextInputPos}
            textInputValue={textInputValue}
            setTextInputValue={setTextInputValue}
            questionCanvasRef={questionCanvasRef}
            markschemeCanvasRef={markschemeCanvasRef}
            questionContainerRef={questionContainerRef}
            markschemeContainerRef={markschemeContainerRef}
            handleCanvasMouseDown={handleCanvasMouseDown}
            handleCanvasMouseMove={handleCanvasMouseMove}
            handleCanvasMouseUp={handleCanvasMouseUp}
            handleCanvasTouchStart={handleCanvasTouchStart}
            handleCanvasTouchMove={handleCanvasTouchMove}
            handleCanvasTouchEnd={handleCanvasTouchEnd}
            handleTextSubmit={handleTextSubmit}
            handleEraserClick={handleEraserClick}
            onImageLoad={resizeCanvases}
            onPrevMatch={prevMatch}
            onNextMatch={nextMatch}
            isCurrentSelected={isCurrentSelected}
            onToggleSelection={toggleCurrentQuestionSelection}
            isChatOpen={isChatOpen}
            onToggleChat={() => setIsChatOpen(prev => !prev)}
            isMobile={isMobile}
            setAnnotationMode={setAnnotationMode}
            clearAnnotations={clearAnnotations}
            undoLastAnnotation={undoLastAnnotation}
            redoLastAnnotation={redoLastAnnotation}
            onToggleTutor={() => setTutorOpen((prev) => !prev)}
          />
        )}

        {/* Error state */}
        {currentMatch && !isProcessing && currentMatch.labelId === 'error' && (
          <div
            data-testid="error-state"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              fontSize: '15px',
            }}
          >
            {currentMatch.text}
          </div>
        )}

        {/* Loading overlay */}
        {isProcessing && <LoadingOverlay />}

        {/* Bottom search bar (mobile + error state only — desktop question view uses the bottom dock below) */}
        {hasStarted && !isProcessing && (isMobile || !currentMatch || currentMatch.labelId === 'error') && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: isMobile ? '12px 0' : '16px 0',
            paddingBottom: isMobile ? 'calc(12px + env(safe-area-inset-bottom, 0px))' : '20px',
            background: 'linear-gradient(to top, var(--color-surface) 60%, transparent)',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              padding: isMobile ? '0 12px' : '0 24px',
              display: 'flex',
              alignItems: 'flex-end',
              gap: '10px',
            }}>
              {viewMode === 'question' && currentMatch && currentMatch.labelId !== 'error' && (
                <button
                  data-testid="toggle-markscheme-btn"
                  type="button"
                  onClick={() => setShowMarkscheme((prev) => !prev)}
                  style={{
                    padding: '0 18px',
                    height: isMobile ? '52px' : '56px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)',
                    flexShrink: 0,
                  }}
                >
                  {showMarkscheme ? 'Hide markscheme' : 'View markscheme'}
                </button>
              )}
              <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                onSearch={handleTextSearch}
                isProcessing={isProcessing}
                isMobile={isMobile}
                autoGrow
              />
            </div>
          </div>
        )}

        {/* Bottom dock (desktop question view only) */}
        {!isMobile && hasStarted && !isProcessing && currentMatch && currentMatch.labelId !== 'error' && (
          <div
            data-testid="question-bottom-dock"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              padding: '0 32px 14px 32px',
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              boxSizing: 'border-box',
              zIndex: 5,
            }}
          >
            {/* Left: Find similar questions input (SearchBar so paperclip/OCR is kept) */}
            <div style={{ flex: '1 1 480px', maxWidth: '480px', display: 'flex', minWidth: 0 }}>
              <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                onSearch={handleTextSearch}
                isProcessing={isProcessing}
                isMobile={isMobile}
                placeholder="Find similar questions…"
              />
            </div>

            {/* Right cluster */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                data-testid="dock-view-paper-btn"
                type="button"
                onClick={() => setViewMode(viewMode === 'paper' ? 'question' : 'paper')}
                disabled={!paperPdfUrl}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  background: 'transparent',
                  color: paperPdfUrl ? '#5A5A5A' : '#C0C0C0',
                  border: 'none',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: paperPdfUrl ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-body)',
                  whiteSpace: 'nowrap',
                }}
              >
                {viewMode === 'paper' ? <EyeOff size={14} /> : <Eye size={14} />}
                {viewMode === 'paper' ? 'Hide paper' : 'View paper'}
              </button>

              <div ref={markMenuRef} style={{ position: 'relative' }}>
                <button
                  data-testid="dock-check-markscheme-btn"
                  type="button"
                  onClick={() => {
                    if (showMarkscheme) {
                      setShowMarkscheme(false);
                    } else {
                      setMarkAIMenuOpen((p) => !p);
                    }
                  }}
                  style={{
                    marginLeft: '4px',
                    height: '44px',
                    padding: '0 22px',
                    background: '#111',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '999px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontFamily: 'var(--font-body)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Check size={16} />
                  {showMarkscheme ? 'Hide markscheme' : 'Check markscheme'}
                  {!showMarkscheme && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '2px', opacity: 0.85 }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  )}
                </button>

                {markAIMenuOpen && !showMarkscheme && (
                  <>
                    <div
                      data-testid="check-markscheme-menu"
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        right: 0,
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        padding: '6px',
                        minWidth: '280px',
                        zIndex: 51,
                      }}
                    >
                      <button
                        data-testid="check-markscheme-option-view"
                        onClick={() => { setShowMarkscheme((prev) => !prev); setMarkAIMenuOpen(false); }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 12px', background: 'transparent', border: 'none',
                          borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>
                          {showMarkscheme ? 'Hide markscheme' : 'View markscheme'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                          Show the official answer key alongside the question
                        </div>
                      </button>

                      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '4px 6px' }} />

                      {[
                        { id: 'pen' as const, label: 'Mark what I drew with the pen', desc: 'Use your on-screen annotations' },
                        { id: 'upload' as const, label: 'Upload or paste work', desc: 'Image from your computer' },
                        isMobile
                          ? { id: 'qr' as const, label: 'Take photos with my camera', desc: 'Snap one or more pages of your work' }
                          : { id: 'qr' as const, label: 'Scan QR to use phone camera', desc: 'Send one or more photos from your phone' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          data-testid={`mark-with-ai-option-${opt.id}`}
                          onClick={() => { setMarkAIMode(opt.id); setMarkAIMenuOpen(false); }}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 12px',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#111' }}>{opt.label}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {markAIMode && (
          <>
            <div
              onClick={closeMarkAI}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 200 }}
            />
            <div
              data-testid="mark-with-ai-modal"
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                background: '#fff', borderRadius: '16px', padding: '28px', zIndex: 201,
                width: 'min(560px, 92vw)', maxHeight: '85vh', overflow: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {markResult ? 'AI marking results' :
                    markAIMode === 'pen' ? 'Mark your pen annotations' :
                    markAIMode === 'upload' ? 'Upload or paste your work' :
                    isMobile ? 'Photograph your work' : 'Scan to connect your phone'}
                </h3>
                <button
                  onClick={closeMarkAI}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280' }}
                >
                  ×
                </button>
              </div>

              {markLoading && (
                <div>
                  {submittedWork.length > 0 && (
                    <div style={{
                      marginBottom: '18px',
                      padding: '10px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '1px solid #f3f4f6',
                    }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                        {submittedWork.length === 1 ? 'Your work' : `Your work · ${submittedWork.length} photos`}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: submittedWork.length > 1 ? 'auto' : 'visible',
                        paddingBottom: submittedWork.length > 1 ? '4px' : 0,
                      }}>
                        {submittedWork.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`submitted work ${i + 1}`}
                            style={{
                              width: submittedWork.length === 1 ? '100%' : '140px',
                              height: submittedWork.length === 1 ? 'auto' : '180px',
                              maxHeight: submittedWork.length === 1 ? '300px' : '180px',
                              objectFit: submittedWork.length === 1 ? 'contain' : 'cover',
                              borderRadius: '8px',
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '14px',
                    padding: '20px 0',
                    color: '#374151', fontSize: '14px',
                  }}>
                    <span
                      className="animate-spin"
                      aria-hidden
                      style={{
                        width: 22, height: 22,
                        border: '2.5px solid #e5e7eb',
                        borderTopColor: '#111',
                        borderRadius: '50%',
                        display: 'inline-block',
                      }}
                    />
                    <span>
                      <span style={{ fontWeight: 600 }}>Marking your work with AI</span>
                      <span className="animate-pulse" style={{ display: 'inline-block', marginLeft: '6px', color: '#6b7280' }}>
                        usually only takes a few seconds
                      </span>
                    </span>
                  </div>
                </div>
              )}

              {markError && !markLoading && (
                <div style={{ padding: '12px 14px', background: '#FEE2E2', color: '#991B1B', borderRadius: '8px', fontSize: '13px', marginBottom: '12px' }}>
                  {markError}
                </div>
              )}

              {markResult && !markLoading && (
                <div>
                  {submittedWork.length > 0 && (
                    <div style={{
                      marginBottom: '18px',
                      padding: '10px',
                      background: '#f9fafb',
                      borderRadius: '12px',
                      border: '1px solid #f3f4f6',
                    }}>
                      <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                        {submittedWork.length === 1 ? 'Your work' : `Your work · ${submittedWork.length} photos`}
                      </div>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: submittedWork.length > 1 ? 'auto' : 'visible',
                        paddingBottom: submittedWork.length > 1 ? '4px' : 0,
                      }}>
                        {submittedWork.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt={`submitted work ${i + 1}`}
                            style={{
                              width: submittedWork.length === 1 ? '100%' : '140px',
                              height: submittedWork.length === 1 ? 'auto' : '180px',
                              maxHeight: submittedWork.length === 1 ? '300px' : '180px',
                              objectFit: submittedWork.length === 1 ? 'contain' : 'cover',
                              borderRadius: '8px',
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '40px', fontWeight: 800, color: '#111' }}>{markResult.score}</span>
                    <span style={{ fontSize: '18px', color: '#6b7280' }}>/ {markResult.total}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5, marginBottom: '16px' }}>
                    {markResult.overallComment}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(markResult.feedback || []).map((item, i) => (
                      <div key={i} style={{
                        padding: '10px 12px',
                        background: item.awarded ? '#ECFDF5' : '#FEF2F2',
                        borderLeft: `3px solid ${item.awarded ? '#10B981' : '#EF4444'}`,
                        borderRadius: '6px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: item.awarded ? '#065F46' : '#991B1B' }}>
                          <span>{item.awarded ? '✓' : '✗'}</span>
                          <span>{item.mark}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px', lineHeight: 1.4 }}>
                          {item.reasoning}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!markResult && !markLoading && markAIMode === 'pen' && (
                <div>
                  <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                    The AI will analyse what you've drawn on this question with the pen tool and mark it against the markscheme.
                  </p>
                  <button
                    onClick={handleMarkPen}
                    style={{ marginTop: '16px', padding: '10px 18px', background: '#111', color: '#fff', border: 'none', borderRadius: '999px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Mark now
                  </button>
                </div>
              )}

              {!markResult && !markLoading && markAIMode === 'upload' && (
                <div>
                  <p style={{ fontSize: '14px', color: '#374151', marginBottom: '14px' }}>
                    Drop, pick, or paste one or more images of your work — anywhere on this page.
                  </p>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length) addUploadFiles(files);
                      if (e.target) e.target.value = '';
                    }}
                  />
                  {uploadedMarkImages.length === 0 ? (
                    <div
                      onClick={() => uploadInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#111'; e.currentTarget.style.background = '#fafafa'; }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.background = '#fff'; }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.background = '#fff';
                        addUploadFiles(Array.from(e.dataTransfer.files));
                      }}
                      style={{
                        padding: '28px 20px',
                        border: '2px dashed #d1d5db',
                        borderRadius: '14px',
                        background: '#fff',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'border-color 120ms, background 120ms',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111' }}>
                        Click to choose files
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        or drag images here · or paste with ⌘V / Ctrl+V · up to {MAX_UPLOAD_IMAGES}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          addUploadFiles(Array.from(e.dataTransfer.files));
                        }}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                          gap: '8px',
                        }}
                      >
                        {uploadedMarkImages.map((src, i) => (
                          <div key={i} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            <img src={src} alt={`upload ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{
                              position: 'absolute', top: 4, left: 4,
                              background: 'rgba(17,17,17,0.78)', color: '#fff',
                              fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
                            }}>{i + 1}</span>
                            <button
                              aria-label={`remove image ${i + 1}`}
                              onClick={() => setUploadedMarkImages((prev) => prev.filter((_, idx) => idx !== i))}
                              style={{
                                position: 'absolute', top: 4, right: 4,
                                width: 24, height: 24, borderRadius: '50%', border: 'none',
                                background: 'rgba(17,17,17,0.78)', color: '#fff',
                                cursor: 'pointer', fontSize: 14, lineHeight: 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >×</button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                        <button
                          onClick={() => uploadInputRef.current?.click()}
                          disabled={uploadedMarkImages.length >= MAX_UPLOAD_IMAGES}
                          style={{
                            flex: '0 0 auto', padding: '10px 16px',
                            background: '#fff', color: '#111',
                            border: '1.5px solid #111',
                            borderRadius: '999px',
                            cursor: uploadedMarkImages.length >= MAX_UPLOAD_IMAGES ? 'not-allowed' : 'pointer',
                            opacity: uploadedMarkImages.length >= MAX_UPLOAD_IMAGES ? 0.4 : 1,
                            fontWeight: 600, fontSize: '13px',
                          }}
                        >
                          {uploadedMarkImages.length >= MAX_UPLOAD_IMAGES ? `Max ${MAX_UPLOAD_IMAGES}` : `Add more (${uploadedMarkImages.length}/${MAX_UPLOAD_IMAGES})`}
                        </button>
                        <button
                          onClick={() => runMark(uploadedMarkImages)}
                          style={{
                            flex: 1, padding: '10px 18px',
                            background: '#111', color: '#fff', border: 'none',
                            borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                          }}
                        >
                          Mark now {uploadedMarkImages.length > 1 ? `(${uploadedMarkImages.length} images)` : ''}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!markResult && !markLoading && markAIMode === 'qr' && isMobile && (
                <PhotoCapture
                  helperText="Take one or more photos of your written work. Tap 'Mark now' when you're done."
                  submitLabel="Mark now"
                  onSubmit={(photos) => runMark(photos)}
                />
              )}

              {!markResult && !markLoading && markAIMode === 'qr' && !isMobile && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  <p style={{ fontSize: '14px', color: '#374151', marginBottom: '20px', maxWidth: '380px' }}>
                    Scan this QR code with your phone to open the camera. Your photos will appear here automatically and the AI will start marking.
                  </p>
                  {qrSessionUrl ? (
                    <>
                      <div style={{
                        padding: '14px',
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                      }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrSessionUrl)}`}
                          alt="QR code"
                          style={{ width: '240px', height: '240px', display: 'block' }}
                        />
                      </div>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '16px' }}>
                        {qrWaiting ? 'Waiting for your phone…' : 'Session expired — close and reopen this dialog.'}
                      </p>
                      <details style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af', maxWidth: '420px' }}>
                        <summary style={{ cursor: 'pointer' }}>Or open this link on your phone</summary>
                        <code style={{ display: 'block', marginTop: '6px', wordBreak: 'break-all', userSelect: 'all' }}>{qrSessionUrl}</code>
                      </details>
                    </>
                  ) : (
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>Preparing secure session…</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Filter modal */}
        {showCenterFilter && (
          <FilterModal
            qualification={qualification}
            board={board}
            setBoard={setBoard}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            calculatorFilter={calculatorFilter}
            setCalculatorFilter={setCalculatorFilter}
            numMatches={numMatches}
            setNumMatches={setNumMatches}
            onClose={() => setShowCenterFilter(false)}
            onApply={handleApplyFilters}
          />
        )}
      </div>

      {!isMobile && hasStarted && !isProcessing && currentMatch && currentMatch.labelId !== 'error' && (
        <TutorDock
          open={tutorOpen}
          onClose={() => setTutorOpen(false)}
          questionId={currentMatch.labelId}
          questionImageUrl={assetUrl(qualification, 'questions', currentMatch.labelId, currentMatch.board)}
          markschemeImageUrl={assetUrl(qualification, 'answers', currentMatch.labelId, currentMatch.board)}
        />
      )}
    </div>
  );
}

export default App;
