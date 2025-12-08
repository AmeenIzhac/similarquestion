import { useState } from 'react';
import { AnnotationTools } from './AnnotationTools';
import { WorksheetPanel } from './WorksheetPanel';
import { FeedbackForm } from './FeedbackForm';
import type { AnnotationMode } from '../types/index';

interface SidebarProps {
  isMobile: boolean;
  annotationMode: AnnotationMode;
  setAnnotationMode: (mode: AnnotationMode) => void;
  clearAnnotations: () => void;
  undoLastAnnotation: () => void;
  selectedQuestions: string[];
  removeSelectedQuestion: (labelId: string) => void;
  onOpenFilters: () => void;
}

export function Sidebar({
  isMobile,
  annotationMode,
  setAnnotationMode,
  clearAnnotations,
  undoLastAnnotation,
  selectedQuestions,
  removeSelectedQuestion,
  onOpenFilters
}: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const openSidebarWidth = isMobile ? 220 : 300;

  return (
    <div style={{
      width: sidebarOpen ? `${openSidebarWidth}px` : '50px',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'relative'
    }}>
      {/* Header with Title and Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 15px',
        borderBottom: 'none'
      }}>
        {sidebarOpen && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <span style={{ fontWeight: 700, color: '#666', fontSize: '20px' }}>SQ</span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'transparent',
            color: '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            marginLeft: sidebarOpen ? '10px' : '0'
          }}
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.327V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7074 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.38859L15.3779 4.28606C15.1308 4.16014 14.8164 4.08006 14.3018 4.03802C13.7794 3.99533 13.1112 3.99503 12.167 3.99503H8.16504L8.16406 15.995Z" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      {sidebarOpen && (
        <div style={{ padding: '15px', overflowY: 'auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={onOpenFilters}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#10a37f',
                color: '#fff',
                border: '1px solid #10a37f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '15px'
              }}
            >
              Filters
            </button>

            <AnnotationTools
              annotationMode={annotationMode}
              setAnnotationMode={setAnnotationMode}
              clearAnnotations={clearAnnotations}
              undoLastAnnotation={undoLastAnnotation}
            />

            <button
              onClick={() => setShowWorksheet(!showWorksheet)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#10a37f',
                color: '#fff',
                border: '1px solid #10a37f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '15px'
              }}
            >
              {showWorksheet ? 'Hide Worksheet' : 'Make Worksheet'}
            </button>

            <button
              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: showFeedbackForm ? '#0e8d6d' : '#10a37f',
                color: '#fff',
                border: '1px solid #10a37f',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '12px'
              }}
            >
              {showFeedbackForm ? 'Hide Feedback' : 'Request Features'}
            </button>

            {showFeedbackForm && <FeedbackForm />}

            {showWorksheet && (
              <WorksheetPanel
                selectedQuestions={selectedQuestions}
                removeSelectedQuestion={removeSelectedQuestion}
                onHide={() => setShowWorksheet(false)}
              />
            )}

            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                border: '1px solid #e5e5e5',
                borderRadius: '6px',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <h4 style={{ margin: 0, fontSize: '13px', color: '#333', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Recent Updates
              </h4>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px', color: '#4b5563', fontSize: '12px', listStyleType: 'disc' }}>
                <li>Added spacing at the bottom of a question or markscheme answer when scrolling to the bottom</li>
                <li>Annotations</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
