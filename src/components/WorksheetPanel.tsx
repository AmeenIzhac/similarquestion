import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import { formatLabelId } from '../utils/formatters';
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
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });

      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;
      let currentY = margin;
      let atPageStart = true;

      const renderItems = selectedQuestions.flatMap((labelId) => {
        const questionPath = `/edexcel-gcse-maths-questions/${labelId}`;
        const answerPath = `/edexcel-gcse-maths-answers/${labelId}`;

        if (pdfMode === 'questions') {
          return [{ labelId, path: questionPath, type: 'question' as const }];
        }
        if (pdfMode === 'answers') {
          return [{ labelId, path: answerPath, type: 'answer' as const }];
        }
        return [
          { labelId, path: questionPath, type: 'question' as const },
          { labelId, path: answerPath, type: 'answer' as const }
        ];
      });

      for (let index = 0; index < renderItems.length; index += 1) {
        const { labelId, path, type } = renderItems[index];

        if (type === 'question') {
          if (!atPageStart) {
            pdf.addPage();
            currentY = margin;
            atPageStart = true;
          }
        }

        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${type} image: ${labelId}`);
        }

        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const { width: imageWidth, height: imageHeight } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = reject;
          img.src = dataUrl;
        });

        let renderWidth = maxWidth;
        let renderHeight = (imageHeight * renderWidth) / imageWidth;

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight;
          renderWidth = (imageWidth * renderHeight) / imageHeight;
        }

        if (currentY + renderHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        const x = (pageWidth - renderWidth) / 2;
        const imageType = labelId.toLowerCase().endsWith('.jpg') || labelId.toLowerCase().endsWith('.jpeg') ? 'JPEG' : 'PNG';

        pdf.addImage(dataUrl, imageType as 'PNG' | 'JPEG', x, currentY, renderWidth, renderHeight);
        atPageStart = false;

        currentY += renderHeight + 5;

        if (index < renderItems.length - 1 && currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          atPageStart = true;
        }
      }

      const fileSuffix = pdfMode === 'questions' ? 'questions' : pdfMode === 'answers' ? 'answers' : 'interleaved';
      pdf.save(`selected-${fileSuffix}.pdf`);
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
      border: '1px solid #e5e5e5',
      borderRadius: '6px',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '13px', color: '#333', fontWeight: 'bold' }}>Worksheet</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onHide}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
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
                  backgroundColor: selectedQuestions.length === 0 || isSavingPdf ? '#c9c9c9' : '#10a37f',
                  color: '#fff',
                  border: selectedQuestions.length === 0 || isSavingPdf ? '1px solid #c9c9c9' : '1px solid #10a37f',
                  padding: '6px 12px',
                  borderRadius: '4px',
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
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 10,
                  marginTop: '4px',
                  minWidth: '160px',
                  display: 'none',
                  border: '1px solid #e5e5e5'
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
                      color: '#111',
                      backgroundColor: 'transparent',
                      transition: 'all 0.2s',
                      borderBottom: mode === 'interleaved' ? 'none' : '1px solid #f5f5f5',
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
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          border: '1px dashed #e5e5e5',
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
                    border: '1px solid #e8e8e8',
                    backgroundColor: '#fafafa'
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
            <p style={{ margin: 0, fontSize: '13px', color: '#8c8c8c' }}>
              Once you select questions for the worksheet they'll appear here
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
