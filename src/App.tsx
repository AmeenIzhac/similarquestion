import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, SearchBar, FilterModal, LoadingOverlay, QuestionViewer, ChatBot } from './components';
import { useAnnotations } from './hooks/useAnnotations';
import { useSearch } from './hooks/useSearch';
import type { LevelFilter, CalculatorFilter, SearchMethod, ViewMode } from './types/index';

function App() {
  // Filter state
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [calculatorFilter, setCalculatorFilter] = useState<CalculatorFilter>('all');
  const [numMatches, setNumMatches] = useState<number>(25);
  const [searchMethod, setSearchMethod] = useState<SearchMethod>('method1');
  const hasSearchMethod2 = Boolean(import.meta.env.VITE_PINECONE_INDEX_HOST2);

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
  } = useSearch({ levelFilter, calculatorFilter, numMatches, searchMethod });

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
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
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
  const handleTextSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchText.trim()) {
      setHasStarted(true);
      searchByText(searchText);
    }
  };

  const handleApplyFilters = useCallback(() => {
    setShowCenterFilter(false);
    if (hasStarted && searchText.trim()) {
      searchByText(searchText);
    }
  }, [hasStarted, searchText, searchByText]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f7f7f8' }}>
      <Sidebar
        isMobile={isMobile}
        annotationMode={annotationMode}
        setAnnotationMode={setAnnotationMode}
        clearAnnotations={clearAnnotations}
        undoLastAnnotation={undoLastAnnotation}
        selectedQuestions={selectedQuestions}
        removeSelectedQuestion={removeSelectedQuestion}
        onOpenFilters={() => setShowCenterFilter(true)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        position: 'relative',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#ffffff'
      }}>
        {/* Landing page */}
        {!hasStarted && !isProcessing && (!currentMatch || currentMatch.labelId === 'error') && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#111' }}>
                  Find Similar Edexcel GCSE Maths Questions
                </h1>
              </div>
              <SearchBar
                searchText={searchText}
                setSearchText={setSearchText}
                onSearch={handleTextSearch}
                isProcessing={isProcessing}
                isMobile={isMobile}
              />
            </div>
            <div style={{ position: 'absolute', bottom: '16px', left: 0, right: 0, textAlign: 'center', color: '#8e8ea0', fontSize: '11px' }}>
              Similar Question 2025.
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
          />
        )}

        {/* ChatBot panel */}
        {currentMatch && !isProcessing && currentMatch.labelId !== 'error' && (
          <ChatBot
            questionId={currentMatch.labelId}
            questionText={currentMatch.text}
            questionImageUrl={`/edexcel-gcse-maths-questions/${currentMatch.labelId}`}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
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
            color: '#555',
            fontSize: '16px'
          }}>
            {currentMatch.text}
          </div>
        )}

        {/* Loading overlay */}
        {isProcessing && <LoadingOverlay />}

        {/* Bottom search bar */}
        {hasStarted && !isProcessing && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 0' }}>
            <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {viewMode === 'question' && currentMatch && currentMatch.labelId !== 'error' && (
                <button
                  type="button"
                  onClick={() => setShowMarkscheme((prev) => !prev)}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#10a37f',
                    color: '#fff',
                    border: '1px solid #109e7b',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginLeft: '-24px'
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
            searchMethod={searchMethod}
            setSearchMethod={setSearchMethod}
            hasSearchMethod2={hasSearchMethod2}
            onClose={() => setShowCenterFilter(false)}
            onApply={handleApplyFilters}
          />
        )}
      </div>
    </div>
  );
}

export default App;
