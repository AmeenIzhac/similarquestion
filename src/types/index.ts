export interface Match {
  labelId: string;
  text: string;
  similarity: number;
  board?: ExamBoard;
}

export interface DrawingData {
  paths: Array<{ points: Array<{ x: number; y: number }>; color: string }>;
  texts: Array<{ x: number; y: number; text: string; color: string }>;
}

export interface TextInputPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  target: 'question' | 'markscheme';
}

export interface FormStatus {
  isSubmitting: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

export type Qualification = 'gcse' | 'alevel';
export type ExamBoard = 'aqa' | 'edexcel' | 'ocr';
export type Board = 'all' | ExamBoard;
export type LevelFilter = 'all' | 'h' | 'f' | 'a' | 'as';
export type CalculatorFilter = 'all' | 'calculator' | 'non-calculator';

export type ViewMode = 'question' | 'paper' | 'markscheme';
export type AnnotationMode = 'none' | 'pen' | 'text' | 'eraser';
export type PdfMode = 'questions' | 'answers' | 'interleaved';
