import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, SearchBar, FilterModal, LoadingOverlay, QuestionViewer } from './components';
import { useAnnotations } from './hooks/useAnnotations';
import { useSearch } from './hooks/useSearch';
import { Menu } from 'lucide-react';
import type { LevelFilter, CalculatorFilter, ViewMode } from './types/index';

function App() {
  // Filter state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<CalculatorFilter>('all');
  const [numMatches, setNumMatches] = useState<number>(25);

  // UI state
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

  // Search hook
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

  // Annotation hook
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

  // Handle window resize
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

  // Reset view mode when match changes
  useEffect(() => {
    setViewMode('question');
    setShowMarkscheme(false);
  }, [currentMatch?.labelId]);

  // Reset markscheme when not in question view
  useEffect(() => {
    if (viewMode !== 'question') {
      setShowMarkscheme(false);
    }
  }, [viewMode]);

  // Selection helpers
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

  // Search handlers
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

  const isLanding = !hasStarted && !isProcessing && (!currentMatch || currentMatch.labelId === 'error');

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', backgroundColor: 'var(--color-bg)' }}>
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
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: 'var(--color-surface)'
      }}>
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 30,
              width: '38px',
              height: '38px',
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--color-text)',
            }}
            title="Open menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Landing page */}
        {isLanding && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto',
              padding: isMobile ? '24px 20px' : '24px 32px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{
                  margin: '0 0 8px 0',
                  fontSize: isMobile ? '22px' : '32px',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}>
                  Describe a maths question or topic
                </h1>
                <p style={{
                  margin: 0,
                  fontSize: isMobile ? '14px' : '15px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}>
                  Upload an image or type a description to find similar GCSE questions
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
              bottom: '16px',
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '11px',
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
          />
        )}


        {/* Error state */}
        {currentMatch && !isProcessing && currentMatch.labelId === 'error' && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            fontSize: '15px'
          }}>
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
            padding: isMobile ? '10px 0' : '16px 0',
            paddingBottom: isMobile ? 'calc(10px + env(safe-area-inset-bottom, 0px))' : '16px',
            background: 'linear-gradient(to top, var(--color-surface) 70%, transparent)',
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
                  type="button"
                  onClick={() => setShowMarkscheme((prev) => !prev)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background var(--transition-fast)',
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
