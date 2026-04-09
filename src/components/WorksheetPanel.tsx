import { useState, useCallback } from 'react';
import { formatLabelId } from '../utils/formatters';
import { generatePdf } from '../utils/pdf';
import type { PdfMode } from '../types/index';

interface WorksheetPanelProps {
  selectedQuestions: string[];
  removeSelectedQuestion: (labelId: string) => void;
  onHide: () => void;
}

export function WorksheetPanel({
  selectedQuestions,
  removeSelectedQuestion,
  onHide
}: WorksheetPanelProps) {
  const [hoveredSelected, setHoveredSelected] = useState<string | null>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [pdfMode, setPdfMode] = useState<PdfMode>('questions');

  const handleDownloadSelected = useCallback(async () => {
    if (selectedQuestions.length === 0 || isSavingPdf) return;

    setIsSavingPdf(true);
    try {
      await generatePdf(selectedQuestions, pdfMode, 'selected');
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

        <div style={{
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
        }}>
          {selectedQuestions.length > 0 ? (
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
                  onMouseEnter={() => setHoveredSelected(labelId)}
                  onMouseLeave={() => setHoveredSelected(null)}
                >
                  <img
                    src={`/edexcel-gcse-maths-questions/${labelId}`}
                    alt={labelId}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: hoveredSelected === labelId ? 0.6 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedQuestion(labelId);
                    }}
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: 'none',
                      backgroundColor: 'var(--color-danger)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      opacity: hoveredSelected === labelId ? 1 : 0,
                      transition: 'opacity 0.15s',
                      lineHeight: 1,
                    }}
                    aria-label={`Remove ${formatLabelId(labelId)}`}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Selected questions will appear here
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
