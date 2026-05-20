import { useState, useEffect, useCallback, useRef } from 'react';

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PregeneratedData {
  hint: string;
  concept: string;
  steps: string[];
}

type PregeneratedResponses = Record<string, PregeneratedData>;

let pregeneratedCache: PregeneratedResponses | null = null;

async function loadPregeneratedResponses(): Promise<PregeneratedResponses> {
  if (pregeneratedCache) return pregeneratedCache;
  try {
    const res = await fetch('/pregenerated-responses.json');
    if (!res.ok) return {};
    pregeneratedCache = await res.json();
    return pregeneratedCache!;
  } catch {
    return {};
  }
}

async function fetchAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('image fetch:', e);
    return null;
  }
}

const SYSTEM_PROMPT = `You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

Your role is to:
1. Look at the question image and understand what it's asking
2. Use the markscheme to guide them towards the correct answer, but NEVER give them the exact direct answer or reveal what the markscheme says.
3. Give hints rather than full solutions
4. Explain mathematical concepts clearly and simply
5. Use encouraging language
6. Keep responses SHORT and concise (3-5 sentences max)
7. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
8. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format your response clearly.`;

export function useTutorChat(
  questionId: string,
  questionImageUrl: string | undefined,
  markschemeImageUrl: string | undefined,
) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pregeneratedSteps, setPregeneratedSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [markschemeBase64, setMarkschemeBase64] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetTutor = useCallback(() => {
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setMessages([]);
    setIsLoading(false);
    setStreamingContent('');
    setPregeneratedSteps([]);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    resetTutor();
  }, [questionId, resetTutor]);

  useEffect(() => {
    if (!questionImageUrl) { setImageBase64(null); return; }
    let alive = true;
    fetchAsBase64(questionImageUrl).then((b) => { if (alive) setImageBase64(b); });
    return () => { alive = false; };
  }, [questionImageUrl]);

  useEffect(() => {
    if (!markschemeImageUrl) { setMarkschemeBase64(null); return; }
    let alive = true;
    fetchAsBase64(markschemeImageUrl).then((b) => { if (alive) setMarkschemeBase64(b); });
    return () => { alive = false; };
  }, [markschemeImageUrl]);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStreamingContent('');
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const apiMessages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const userContent: any[] = [];
      if (imageBase64) {
        userContent.push({ type: 'text', text: 'Target Question Image:' });
        userContent.push({ type: 'image_url', image_url: { url: imageBase64 } });
      }
      if (markschemeBase64) {
        userContent.push({ type: 'text', text: 'Markscheme/Answer Key Image for reference (DO NOT GIVE THE DIRECT ANSWER AWAY):' });
        userContent.push({ type: 'image_url', image_url: { url: markschemeBase64 } });
      }
      userContent.push({ type: 'text', text: userMessage });
      apiMessages.push({ role: 'user', content: userContent.length > 1 ? userContent : userMessage });

      const response = await fetch('https://streamintuitive-yoiv4yepya-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model: 'gpt-4o-mini', max_tokens: 400 }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((l) => l.trim());
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                fullContent += parsed.content || '';
                if (requestIdRef.current === requestId) {
                  setStreamingContent(fullContent);
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      if (requestIdRef.current !== requestId) return;

      if (fullContent.includes('[SOLUTION COMPLETE]')) {
        fullContent = fullContent.replace('[SOLUTION COMPLETE]', '').trim();
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
      setStreamingContent('');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Tutor error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [isLoading, messages, imageBase64, markschemeBase64]);

  const handleQuickAction = useCallback(async (action: 'hint' | 'walk' | 'solution') => {
    const pre = await loadPregeneratedResponses();
    const data = pre[questionId];

    if (action === 'hint') {
      const userMessage = 'Can you give me a hint to get started?';
      if (data?.hint) {
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: data.hint }]);
      } else {
        sendMessage(userMessage);
      }
      return;
    }
    if (action === 'walk') {
      const userMessage = 'Walk me through this question step by step.';
      if (data?.steps?.length) {
        setPregeneratedSteps(data.steps);
        setCurrentStep(1);
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: data.steps[0] }]);
      } else {
        sendMessage(userMessage);
      }
      return;
    }
    // action === 'solution'
    const userMessage = 'Show me the full worked solution.';
    if (data?.steps?.length) {
      setMessages((prev) => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: data.steps.join('\n\n') }]);
    } else {
      sendMessage(userMessage);
    }
  }, [questionId, sendMessage]);

  const handleNextStep = useCallback(() => {
    if (pregeneratedSteps.length === 0) return;
    const nextIdx = currentStep;
    if (nextIdx >= pregeneratedSteps.length) return;
    setCurrentStep((prev) => prev + 1);
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: "What's the next step?" },
      { role: 'assistant', content: pregeneratedSteps[nextIdx] },
    ]);
  }, [pregeneratedSteps, currentStep]);

  const hasMoreSteps = pregeneratedSteps.length > 0 && currentStep < pregeneratedSteps.length;

  return {
    messages,
    isLoading,
    streamingContent,
    hasMoreSteps,
    sendMessage,
    handleQuickAction,
    handleNextStep,
    resetTutor,
  };
}
