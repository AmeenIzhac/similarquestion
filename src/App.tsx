import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, SearchBar, FilterModal, LoadingOverlay, QuestionViewer, TutorDock } from './components';
import { useAnnotations } from './hooks/useAnnotations';
import { useSearch } from './hooks/useSearch';
import { Menu, Eye, EyeOff, Check } from 'lucide-react';
import type { LevelFilter, CalculatorFilter, Qualification, ViewMode } from './types/index';
import { getDocumentBaseFromLabel } from './utils/formatters';
import { assetUrl } from './utils/assets';

const QUALIFICATION_STORAGE_KEY = 'qualification';

function readStoredQualification(): Qualification {
  if (typeof window === 'undefined') return 'gcse';
  const v = window.localStorage.getItem(QUALIFICATION_STORAGE_KEY);
  return v === 'alevel' ? 'alevel' : 'gcse';
}

function App() {
  const [qualification, setQualification] = useState<Qualification>(readStoredQualification);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<CalculatorFilter>('all');
  const [numMatches, setNumMatches] = useState<number>(25);

  const [searchText, setSearchText] = useState<string>('');
  const [showCenterFilter, setShowCenterFilter] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('question');
  const [showMarkscheme, setShowMarkscheme] = useState<boolean>(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [tutorOpen, setTutorOpen] = useState<boolean>(false);

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
  } = useSearch({ levelFilter, calculatorFilter, numMatches, qualification });

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
    if (hasStarted && searchText.trim()) {
      searchByText(searchText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qualification]);

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
  }, [currentMatch]);

  const removeSelectedQuestion = useCallback((labelId: string) => {
    setSelectedQuestions((prev) => prev.filter((item) => item !== labelId));
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
  const paperPdfUrl = documentBase ? assetUrl(qualification, 'papers', `${documentBase}.pdf`) : null;
  const markschemePdfUrl = documentBase ? assetUrl(qualification, 'markschemes', `${documentBase}.pdf`) : null;

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
        selectedQuestions={selectedQuestions}
        removeSelectedQuestion={removeSelectedQuestion}
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

              <button
                data-testid="dock-check-markscheme-btn"
                type="button"
                onClick={() => setShowMarkscheme((prev) => !prev)}
                style={{
                  marginLeft: '4px',
                  height: '44px',
                  padding: '0 24px',
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
              </button>
            </div>
          </div>
        )}

        {/* Filter modal */}
        {showCenterFilter && (
          <FilterModal
            qualification={qualification}
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
          questionImageUrl={assetUrl(qualification, 'questions', currentMatch.labelId)}
          markschemeImageUrl={assetUrl(qualification, 'answers', currentMatch.labelId)}
        />
      )}
    </div>
  );
}

export default App;
