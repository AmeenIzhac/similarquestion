import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, SearchBar, FilterModal, LoadingOverlay, QuestionViewer } from './components';
import { useAnnotations } from './hooks/useAnnotations';
import { useSearch } from './hooks/useSearch';
import { Menu } from 'lucide-react';
import type { LevelFilter, CalculatorFilter, ViewMode } from './types/index';
import { getDocumentBaseFromLabel } from './utils/formatters';

function App() {
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
  } = useSearch({ levelFilter, calculatorFilter, numMatches });

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
  const paperPdfUrl = documentBase ? `/edexcel-gcse-maths-papers/${documentBase}.pdf` : null;
  const markschemePdfUrl = documentBase ? `/edexcel-gcse-maths-markschemes/${documentBase}.pdf` : null;

  const isLanding = !hasStarted && !isProcessing && (!currentMatch || currentMatch.labelId === 'error');

  return (
    <div data-testid="app-root" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--color-bg)', padding: isMobile ? '0' : '0' }}>
      <Sidebar
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
        margin: isMobile ? '0' : '8px 8px 8px 0',
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
              backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/a4ffc6e3-906d-4567-9188-ce517a662ad7/images/a5390a53ddc570b746500516f862346ae0f15f05b395aece0b8fae2c2cf4cb3c.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.55)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }} />

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
                  Find similar questions
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '14px' : '16px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Upload an image or describe a topic to search GCSE questions
                </p>
              </div>
              <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                onSearch={handleTextSearch}
                isProcessing={isProcessing}
                isMobile={isMobile}
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
            currentMatch={currentMatch}
            currentMatchIndex={currentMatchIndex}
            totalMatches={topMatches.length}
            viewMode={viewMode}
            setViewMode={setViewMode}
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

        {/* Bottom search bar */}
        {hasStarted && !isProcessing && (
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
              alignItems: 'center',
              gap: '10px',
            }}>
              {viewMode === 'question' && currentMatch && currentMatch.labelId !== 'error' && (
                <button
                  data-testid="toggle-markscheme-btn"
                  type="button"
                  onClick={() => setShowMarkscheme((prev) => !prev)}
                  style={{
                    padding: '10px 18px',
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
              />
            </div>
          </div>
        )}

        {/* Filter modal */}
        {showCenterFilter && (
          <FilterModal
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
    </div>
  );
}

export default App;
