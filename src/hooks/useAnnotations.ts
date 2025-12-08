import { useState, useCallback, useRef, useEffect } from 'react';
import type { DrawingData, TextInputPosition, AnnotationMode } from '../types/index';

interface UseAnnotationsProps {
  currentLabelId: string | undefined;
  viewMode: 'question' | 'paper' | 'markscheme';
  showMarkscheme: boolean;
}

export function useAnnotations({ currentLabelId, viewMode, showMarkscheme }: UseAnnotationsProps) {
  const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('none');
  const [questionDrawings, setQuestionDrawings] = useState<Map<string, DrawingData>>(new Map());
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<Array<{ x: number; y: number }>>([]);
  const [textInputPos, setTextInputPos] = useState<TextInputPosition | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  
  const questionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const markschemeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const questionContainerRef = useRef<HTMLDivElement | null>(null);
  const markschemeContainerRef = useRef<HTMLDivElement | null>(null);

  // Reset annotation mode when match changes
  useEffect(() => {
    setAnnotationMode('none');
    setTextInputPos(null);
  }, [currentLabelId]);

  const redrawCanvas = useCallback((canvas: HTMLCanvasElement | null, labelId: string, target: 'question' | 'markscheme') => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const key = `${labelId}-${target}`;
    const data = questionDrawings.get(key);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (data) {
      // Draw paths
      data.paths.forEach(path => {
        if (path.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = path.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(path.points[0].x, path.points[0].y);
        path.points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
      });
      
      // Draw texts
      data.texts.forEach(t => {
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      });
    }
  }, [questionDrawings]);

  const resizeCanvas = useCallback((canvas: HTMLCanvasElement | null, container: HTMLDivElement | null) => {
    if (!canvas || !container) return;
    
    // Use the full scrollable height of the container (includes image + padding)
    const containerWidth = container.clientWidth;
    const containerScrollHeight = container.scrollHeight;
    
    // Set canvas internal resolution to match container's full scrollable area
    canvas.width = containerWidth;
    canvas.height = containerScrollHeight;
    // Set CSS dimensions to match exactly
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerScrollHeight}px`;
  }, []);

  // Function to resize canvases - call this when images load
  const resizeCanvases = useCallback(() => {
    if (!currentLabelId || viewMode !== 'question') return;
    resizeCanvas(questionCanvasRef.current, questionContainerRef.current);
    redrawCanvas(questionCanvasRef.current, currentLabelId, 'question');
    if (showMarkscheme) {
      resizeCanvas(markschemeCanvasRef.current, markschemeContainerRef.current);
      redrawCanvas(markschemeCanvasRef.current, currentLabelId, 'markscheme');
    }
  }, [currentLabelId, viewMode, showMarkscheme, resizeCanvas, redrawCanvas]);

  useEffect(() => {
    if (currentLabelId && viewMode === 'question') {
      const setupCanvas = () => {
        resizeCanvas(questionCanvasRef.current, questionContainerRef.current);
        redrawCanvas(questionCanvasRef.current, currentLabelId, 'question');
        if (showMarkscheme) {
          resizeCanvas(markschemeCanvasRef.current, markschemeContainerRef.current);
          redrawCanvas(markschemeCanvasRef.current, currentLabelId, 'markscheme');
        }
      };
      setTimeout(setupCanvas, 100);
      window.addEventListener('resize', setupCanvas);
      return () => window.removeEventListener('resize', setupCanvas);
    }
  }, [currentLabelId, viewMode, showMarkscheme, resizeCanvas, redrawCanvas]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => {
    if (!currentLabelId || annotationMode === 'none') return;
    const canvas = target === 'question' ? questionCanvasRef.current : markschemeCanvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoords(e, canvas);
    
    if (annotationMode === 'pen') {
      setIsDrawing(true);
      setCurrentPath([coords]);
    } else if (annotationMode === 'text') {
      const rect = canvas.getBoundingClientRect();
      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;
      setTextInputPos({ x: displayX, y: displayY, canvasX: coords.x, canvasY: coords.y, target });
      setTextInputValue('');
    }
  }, [currentLabelId, annotationMode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => {
    if (!isDrawing || annotationMode !== 'pen' || !currentLabelId) return;
    const canvas = target === 'question' ? questionCanvasRef.current : markschemeCanvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoords(e, canvas);
    setCurrentPath(prev => [...prev, coords]);
    
    const ctx = canvas.getContext('2d');
    if (ctx && currentPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const lastPoint = currentPath[currentPath.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  }, [isDrawing, annotationMode, currentLabelId, currentPath]);

  const handleCanvasMouseUp = useCallback((target: 'question' | 'markscheme') => {
    if (!isDrawing || !currentLabelId || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }
    
    const key = `${currentLabelId}-${target}`;
    setQuestionDrawings(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || { paths: [], texts: [] };
      newMap.set(key, {
        ...existing,
        paths: [...existing.paths, { points: currentPath, color: '#ef4444' }]
      });
      return newMap;
    });
    
    setIsDrawing(false);
    setCurrentPath([]);
  }, [isDrawing, currentLabelId, currentPath]);

  const handleTextSubmit = useCallback(() => {
    if (!textInputPos || !textInputValue.trim() || !currentLabelId) return;
    
    const key = `${currentLabelId}-${textInputPos.target}`;
    setQuestionDrawings(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(key) || { paths: [], texts: [] };
      newMap.set(key, {
        ...existing,
        texts: [...existing.texts, { x: textInputPos.canvasX, y: textInputPos.canvasY, text: textInputValue, color: '#ef4444' }]
      });
      return newMap;
    });
    
    const canvas = textInputPos.target === 'question' ? questionCanvasRef.current : markschemeCanvasRef.current;
    redrawCanvas(canvas, currentLabelId, textInputPos.target);
    
    setTextInputPos(null);
    setTextInputValue('');
  }, [textInputPos, textInputValue, currentLabelId, redrawCanvas]);

  const clearAnnotations = useCallback(() => {
    if (!currentLabelId) return;
    setQuestionDrawings(prev => {
      const newMap = new Map(prev);
      newMap.delete(`${currentLabelId}-question`);
      newMap.delete(`${currentLabelId}-markscheme`);
      return newMap;
    });
    
    [questionCanvasRef, markschemeCanvasRef].forEach(ref => {
      if (ref.current) {
        const ctx = ref.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, ref.current.width, ref.current.height);
      }
    });
  }, [currentLabelId]);

  // Undo last annotation (path or text)
  const undoLastAnnotation = useCallback(() => {
    if (!currentLabelId) return;
    
    // Check both question and markscheme, undo from whichever has the most recent
    const questionKey = `${currentLabelId}-question`;
    const markschemeKey = `${currentLabelId}-markscheme`;
    
    setQuestionDrawings(prev => {
      const newMap = new Map(prev);
      
      // Try question first, then markscheme
      for (const key of [questionKey, markschemeKey]) {
        const data = newMap.get(key);
        if (data) {
          const totalItems = data.paths.length + data.texts.length;
          if (totalItems > 0) {
            // Remove the last added item (texts are added after paths typically)
            if (data.texts.length > 0) {
              newMap.set(key, {
                ...data,
                texts: data.texts.slice(0, -1)
              });
            } else if (data.paths.length > 0) {
              newMap.set(key, {
                ...data,
                paths: data.paths.slice(0, -1)
              });
            }
            return newMap;
          }
        }
      }
      return prev;
    });
    
    // Redraw canvases
    setTimeout(() => {
      redrawCanvas(questionCanvasRef.current, currentLabelId, 'question');
      redrawCanvas(markschemeCanvasRef.current, currentLabelId, 'markscheme');
    }, 0);
  }, [currentLabelId, redrawCanvas]);

  // Eraser - remove annotation at click position
  const handleEraserClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>, target: 'question' | 'markscheme') => {
    if (!currentLabelId || annotationMode !== 'eraser') return;
    const canvas = target === 'question' ? questionCanvasRef.current : markschemeCanvasRef.current;
    if (!canvas) return;
    
    const coords = getCanvasCoords(e, canvas);
    const key = `${currentLabelId}-${target}`;
    const hitRadius = 15; // pixels
    
    setQuestionDrawings(prev => {
      const data = prev.get(key);
      if (!data) return prev;
      
      const newMap = new Map(prev);
      
      // Check texts first
      const textIndex = data.texts.findIndex(t => 
        Math.abs(t.x - coords.x) < 50 && Math.abs(t.y - coords.y) < 20
      );
      if (textIndex !== -1) {
        newMap.set(key, {
          ...data,
          texts: data.texts.filter((_, i) => i !== textIndex)
        });
        return newMap;
      }
      
      // Check paths - find if click is near any path point
      const pathIndex = data.paths.findIndex(path =>
        path.points.some(p => 
          Math.sqrt(Math.pow(p.x - coords.x, 2) + Math.pow(p.y - coords.y, 2)) < hitRadius
        )
      );
      if (pathIndex !== -1) {
        newMap.set(key, {
          ...data,
          paths: data.paths.filter((_, i) => i !== pathIndex)
        });
        return newMap;
      }
      
      return prev;
    });
    
    // Redraw
    setTimeout(() => {
      redrawCanvas(canvas, currentLabelId, target);
    }, 0);
  }, [currentLabelId, annotationMode, redrawCanvas]);

  return {
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
  };
}
