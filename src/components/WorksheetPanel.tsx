import { useState, useCallback, useRef } from 'react';
import { formatLabelId } from '../utils/formatters';
import { generatePdf } from '../utils/pdf';
import { assetUrl } from '../utils/assets';
import type { PdfMode, Qualification } from '../types/index';

interface WorksheetPanelProps {
  qualification: Qualification;
  selectedQuestions: string[];
  removeSelectedQuestion: (labelId: string) => void;
  reorderSelectedQuestions: (next: string[]) => void;
  onHide: () => void;
}

export function WorksheetPanel({
  qualification,
  selectedQuestions,
  removeSelectedQuestion,
  reorderSelectedQuestions,
  onHide
}: WorksheetPanelProps) {
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [pdfMode, setPdfMode] = useState<PdfMode>('questions');
  const [showDialog, setShowDialog] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveItem = useCallback((from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= selectedQuestions.length || to >= selectedQuestions.length) return;
    const next = selectedQuestions.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    reorderSelectedQuestions(next);
  }, [selectedQuestions, reorderSelectedQuestions]);

  const handleDownloadSelected = useCallback(async () => {
    if (selectedQuestions.length === 0 || isSavingPdf) return;

    setIsSavingPdf(true);
    try {
      await generatePdf(selectedQuestions, pdfMode, 'selected', qualification);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsSavingPdf(false);
    }
  }, [isSavingPdf, selectedQuestions, pdfMode]);

  return (
    <div data-testid="worksheet-panel" style={{
      marginTop: '8px',
      padding: '16px',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--color-text)', fontWeight: 600 }}>Worksheet</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              data-testid="worksheet-hide-btn"
              onClick={onHide}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                padding: '4px 8px',
              }}
              aria-label="Hide worksheet"
            >
              Hide
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
                data-testid="worksheet-download-btn"
                onClick={() => {
                  const dropdown = document.getElementById('downloadDropdown');
                  if (dropdown) {
                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                  }
                }}
                disabled={selectedQuestions.length === 0 || isSavingPdf}
                style={{
                  backgroundColor: selectedQuestions.length === 0 || isSavingPdf ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  cursor: selectedQuestions.length === 0 || isSavingPdf ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '110px',
                  justifyContent: 'space-between',
                }}
              >
                {isSavingPdf ? 'Saving...' : `Download ${pdfMode === 'questions' ? 'Qs' : pdfMode === 'answers' ? 'As' : 'Q&A'}`}
                <span style={{ fontSize: '9px', marginLeft: '2px' }}>&#9662;</span>
              </button>
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 10,
                  marginTop: '4px',
                  minWidth: '160px',
                  display: 'none',
                  overflow: 'hidden',
                }}
                id="downloadDropdown"
              >
                {[
                  { mode: 'questions' as const, label: 'Questions Only' },
                  { mode: 'answers' as const, label: 'Answers Only' },
                  { mode: 'interleaved' as const, label: 'Questions & Answers' }
                ].map(({ mode, label }) => (
                  <div
                    key={mode}
                    data-testid={`worksheet-download-${mode}`}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      backgroundColor: 'transparent',
                      transition: 'all 0.15s',
                      borderBottom: mode === 'interleaved' ? 'none' : '1px solid var(--color-border-light)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => {
                      setPdfMode(mode);
                      document.getElementById('downloadDropdown')!.style.display = 'none';
                      handleDownloadSelected();
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          role={selectedQuestions.length > 0 ? 'button' : undefined}
          tabIndex={selectedQuestions.length > 0 ? 0 : -1}
          onClick={() => { if (selectedQuestions.length > 0) setShowDialog(true); }}
          onKeyDown={(e) => {
            if (selectedQuestions.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              setShowDialog(true);
            }
          }}
          title={selectedQuestions.length > 0 ? 'Edit & reorder worksheet' : undefined}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--color-border)',
            padding: '16px',
            textAlign: 'center',
            marginBottom: '4px',
            minHeight: '90px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            cursor: selectedQuestions.length > 0 ? 'pointer' : 'default',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (selectedQuestions.length > 0) {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          {selectedQuestions.length > 0 ? (
            <>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                justifyContent: 'center',
                maxHeight: '200px',
                overflowY: 'auto',
                padding: '4px',
              }}>
                {selectedQuestions.map((labelId) => (
                  <div
                    key={labelId}
                    data-testid={`worksheet-item-${labelId}`}
                    style={{
                      position: 'relative',
                      width: '56px',
                      height: '56px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      backgroundColor: 'var(--color-surface-alt)',
                    }}
                  >
                    <img
                      src={assetUrl(qualification, 'questions', labelId)}
                      alt={labelId}
                      draggable={false}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                Click to edit & reorder
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Selected questions will appear here
            </p>
          )}
        </div>
      </div>

      {showDialog && (
        <>
          <div
            onClick={() => setShowDialog(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
              zIndex: 200,
            }}
          />
          <div
            data-testid="worksheet-dialog"
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              background: '#f9fafb', borderRadius: '16px', zIndex: 201,
              width: 'min(820px, 92vw)', maxHeight: '88vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '20px 24px 14px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#111', fontFamily: 'var(--font-heading)' }}>
                  Your worksheet
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>
                  {selectedQuestions.length} question{selectedQuestions.length === 1 ? '' : 's'} · drag to reorder
                </p>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '22px', color: '#6b7280', padding: '2px 8px' }}
                aria-label="Close"
              >×</button>
            </div>

            <div style={{ overflowY: 'auto', padding: '18px', flex: 1 }}>
              {selectedQuestions.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                  Your worksheet is empty.
                </div>
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedQuestions.map((labelId, i) => {
                    const isDragOver = dragOverIndex === i;
                    return (
                      <li
                        key={labelId}
                        onDragOver={(e) => {
                          // Only show the drop target highlight when something is actually being dragged
                          if (dragIndexRef.current === null) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverIndex !== i) setDragOverIndex(i);
                        }}
                        onDragLeave={() => {
                          if (dragOverIndex === i) setDragOverIndex(null);
                        }}
                        onDrop={(e) => {
                          if (dragIndexRef.current === null) return;
                          e.preventDefault();
                          const from = dragIndexRef.current;
                          dragIndexRef.current = null;
                          setDragOverIndex(null);
                          moveItem(from, i);
                        }}
                        style={{
                          background: '#fff',
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: isDragOver ? 'var(--color-primary)' : '#e5e7eb',
                          boxShadow: isDragOver ? '0 0 0 3px rgba(124, 58, 237, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                          overflow: 'hidden',
                          transition: 'border-color 0.1s, box-shadow 0.1s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '8px 12px',
                            borderBottom: '1px solid #f3f4f6',
                            background: '#fafafa',
                          }}
                        >
                          <span
                            draggable
                            onDragStart={(e) => {
                              dragIndexRef.current = i;
                              e.dataTransfer.effectAllowed = 'move';
                              // Use the row element as the drag image for a clearer preview
                              const row = (e.currentTarget as HTMLElement).closest('li');
                              if (row) e.dataTransfer.setDragImage(row, 20, 20);
                            }}
                            onDragEnd={() => {
                              dragIndexRef.current = null;
                              setDragOverIndex(null);
                            }}
                            aria-label="Drag to reorder"
                            title="Drag to reorder"
                            style={{
                              cursor: 'grab',
                              color: '#9ca3af',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '2px',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="9" cy="5" r="1.6"/><circle cx="15" cy="5" r="1.6"/>
                              <circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/>
                              <circle cx="9" cy="19" r="1.6"/><circle cx="15" cy="19" r="1.6"/>
                            </svg>
                          </span>
                          <span style={{
                            fontSize: '12px', fontWeight: 700, color: '#6b7280',
                            background: '#fff', border: '1px solid #e5e7eb',
                            borderRadius: '999px', padding: '2px 8px',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ flex: 1, fontSize: '13px', color: '#111', fontWeight: 600 }}>
                            {formatLabelId(labelId)}
                          </span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              onClick={() => moveItem(i, i - 1)}
                              disabled={i === 0}
                              aria-label="Move up"
                              style={{
                                width: 30, height: 30, borderRadius: '6px',
                                border: 'none', background: 'transparent',
                                cursor: i === 0 ? 'default' : 'pointer',
                                color: i === 0 ? '#d1d5db' : '#6b7280',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button
                              onClick={() => moveItem(i, i + 1)}
                              disabled={i === selectedQuestions.length - 1}
                              aria-label="Move down"
                              style={{
                                width: 30, height: 30, borderRadius: '6px',
                                border: 'none', background: 'transparent',
                                cursor: i === selectedQuestions.length - 1 ? 'default' : 'pointer',
                                color: i === selectedQuestions.length - 1 ? '#d1d5db' : '#6b7280',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                            <button
                              onClick={() => removeSelectedQuestion(labelId)}
                              aria-label={`Remove ${formatLabelId(labelId)}`}
                              style={{
                                width: 30, height: 30, borderRadius: '6px',
                                border: 'none', background: 'transparent',
                                cursor: 'pointer', color: '#dc2626',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div style={{ background: '#fff', padding: '14px' }}>
                          <img
                            src={assetUrl(qualification, 'questions', labelId)}
                            alt={labelId}
                            style={{
                              display: 'block',
                              width: '100%',
                              height: 'auto',
                              borderRadius: '6px',
                              background: '#fff',
                            }}
                            draggable={false}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            <div style={{ padding: '12px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  padding: '8px 18px',
                  background: '#111', color: '#fff', border: 'none',
                  borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
