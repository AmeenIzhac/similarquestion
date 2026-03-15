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
    <div style={{
      marginTop: '15px',
      padding: '12px',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'var(--color-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--color-text)', fontWeight: 'bold' }}>Worksheet</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onHide}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 8px'
              }}
              aria-label="Hide worksheet"
            >
              Hide
            </button>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button
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
                  border: selectedQuestions.length === 0 || isSavingPdf ? '1px solid var(--color-text-muted)' : '1px solid var(--color-primary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: selectedQuestions.length === 0 || isSavingPdf ? 'not-allowed' : 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '120px',
                  justifyContent: 'space-between'
                }}
              >
                {isSavingPdf ? 'Saving...' : `Download ${pdfMode === 'questions' ? 'Questions' : pdfMode === 'answers' ? 'Answers' : 'Q&A'}`}
                <span style={{ fontSize: '10px', marginLeft: '4px' }}>▼</span>
              </button>
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 10,
                  marginTop: '4px',
                  minWidth: '160px',
                  display: 'none',
                  border: '1px solid var(--color-border)'
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
                    style={{
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s',
                      borderBottom: mode === 'interleaved' ? 'none' : '1px solid var(--color-border-light)',
                      ...(mode === 'interleaved' && {
                        borderBottomLeftRadius: '4px',
                        borderBottomRightRadius: '4px'
                      }),
                      ...(mode === 'questions' && {
                        borderTopLeftRadius: '4px',
                        borderTopRightRadius: '4px'
                      })
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f2f2f3';
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
          borderRadius: 'var(--radius-sm)',
          border: '1px dashed var(--color-border)',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '10px',
          minHeight: '100px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {selectedQuestions.length > 0 ? (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              justifyContent: 'center',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '5px'
            }}>
              {selectedQuestions.map((labelId) => (
                <div
                  key={labelId}
                  style={{
                    position: 'relative',
                    width: '60px',
                    height: '60px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface-alt)'
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
                      opacity: hoveredSelected === labelId ? 0.7 : 1,
                      transition: 'opacity 0.2s'
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
                      backgroundColor: 'rgba(255, 77, 79, 0.9)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      opacity: hoveredSelected === labelId ? 1 : 0,
                      transition: 'opacity 0.2s',
                      lineHeight: 1
                    }}
                    aria-label={`Remove ${formatLabelId(labelId)}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Once you select questions for the worksheet they'll appear here
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
