import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatBotProps {
    questionId: string;
    questionText?: string;
    questionImageUrl: string;
    markschemeImageUrl?: string;
    isOpen: boolean;
    onClose: () => void;
    isInline?: boolean;
}

export function ChatBot({ questionId, questionImageUrl, markschemeImageUrl, isOpen, onClose, isInline = false }: ChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isInStepMode, setIsInStepMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [markschemeBase64, setMarkschemeBase64] = useState<string | null>(null);
    const [isSolutionComplete, setIsSolutionComplete] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (questionImageUrl) {
            fetchImageAsBase64(questionImageUrl, setImageBase64);
        }
    }, [questionImageUrl]);

    useEffect(() => {
        if (markschemeImageUrl) {
            fetchImageAsBase64(markschemeImageUrl, setMarkschemeBase64);
        }
    }, [markschemeImageUrl]);

    const fetchImageAsBase64 = async (url: string, setter: (base64: string | null) => void) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setter(base64);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error fetching image:', error);
            setter(null);
        }
    };

    useEffect(() => {
        setMessages([]);
        setStreamingContent('');
        setIsInStepMode(false);
        setCurrentStep(0);
        setIsSolutionComplete(false);
    }, [questionId]);

    const sendMessage = async (userMessage: string, isStepRequest: boolean = false) => {
        if (!userMessage.trim() || isLoading) return;

        const newUserMessage: Message = { role: 'user', content: userMessage };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);
        setStreamingContent('');

        if (userMessage.toLowerCase().includes('step by step') || userMessage.toLowerCase().includes('explain how')) {
            setIsInStepMode(true);
            setCurrentStep(1);
        } else if (isStepRequest) {
            setCurrentStep(prev => prev + 1);
        }

        try {
            let systemPrompt: string;

            if (isInStepMode || userMessage.toLowerCase().includes('step by step') || userMessage.toLowerCase().includes('explain how')) {
                const stepNum = isStepRequest ? currentStep + 1 : 1;
                systemPrompt = `You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

IMPORTANT: The student has asked for step-by-step help. You are currently on STEP ${stepNum}.

YOUR RULES:
1. Give ONLY ONE STEP at a time - this is critical!
2. Keep your response SHORT (2-4 sentences maximum)
3. End your response by asking if they're ready for the next step
4. Do NOT reveal future steps or the final answer until it's time
5. Be encouraging and supportive
6. Look at the question image carefully and provide specific guidance for THIS question
7. Use the markscheme to guide the student towards the correct answer shown, but NEVER tell them the direct answer or show them the markscheme directly.
8. When you reach the FINAL step where you give the complete answer/solution, you MUST end your message with exactly: [SOLUTION COMPLETE]
9. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
10. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format your response clearly.`;
            } else {
                systemPrompt = `You are a helpful GCSE Maths tutor. You can SEE the question image and the markscheme (answer key) image that have been provided.

Your role is to:
1. Look at the question image and understand what it's asking
2. Use the markscheme to guide them towards the correct answer, but NEVER give them the exact direct answer or reveal what the markscheme says.
3. Give hints rather than full solutions
4. Explain mathematical concepts clearly and simply
5. Use encouraging language
6. Keep responses SHORT and concise (3-5 sentences max)
7. If they want step-by-step help, tell them to click the "Step by step" button
8. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.
9. Use UK-style mathematics notation. Specifically, do NOT use the dot for multiplication (use $\\times$ or juxtaposition where appropriate).

Format your response clearly.`;
            }

            const apiMessages = [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content }))
            ];

            let userContent: any[] = [];

            if (imageBase64) {
                userContent.push({ type: 'text', text: 'Target Question Image:' });
                userContent.push({ type: 'image_url', image_url: { url: imageBase64 } });
            }
            if (markschemeBase64) {
                userContent.push({ type: 'text', text: 'Markscheme/Answer Key Image for reference (DO NOT GIVE THE DIRECT ANSWER AWAY):' });
                userContent.push({ type: 'image_url', image_url: { url: markschemeBase64 } });
            }

            userContent.push({ type: 'text', text: userMessage });

            if (userContent.length > 1) {
                apiMessages.push({
                    role: 'user',
                    content: userContent
                } as any);
            } else {
                apiMessages.push({ role: 'user', content: userMessage } as any);
            }

            const response = await fetch('https://streamintuitive-yoiv4yepya-uc.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    model: 'gpt-4o-mini',
                    max_tokens: 400
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Function Error:', response.status, errorText);
                throw new Error(`Function error: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.content || '';
                                fullContent += content;
                                setStreamingContent(fullContent);
                            } catch {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            }

            if (fullContent.includes('[SOLUTION COMPLETE]')) {
                setIsSolutionComplete(true);
                fullContent = fullContent.replace('[SOLUTION COMPLETE]', '').trim();
            }

            setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
            setStreamingContent('');
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please check your OpenAI API key and try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleQuickAction = (action: string) => {
        let message = '';
        switch (action) {
            case 'explain':
                message = 'Please explain how to solve this question step by step, one step at a time.';
                break;
            case 'hint':
                message = 'Can you give me a hint to get started on this question?';
                break;
            case 'concept':
                message = 'What mathematical concepts do I need to know for this question?';
                break;
            case 'next':
                message = "I understand, let's move to the next step.";
                sendMessage(message, true);
                return;
        }
        sendMessage(message);
    };

    const handleNextStep = () => {
        sendMessage("I understand, what's the next step?", true);
    };

    if (!isOpen) return null;

    const markdownComponents = {
        p: ({ children }: { children?: React.ReactNode }) => (
            <p style={{ margin: '0 0 8px 0', lineHeight: 1.6 }}>{children}</p>
        ),
        strong: ({ children }: { children?: React.ReactNode }) => (
            <strong style={{ fontWeight: 600 }}>{children}</strong>
        ),
        ul: ({ children }: { children?: React.ReactNode }) => (
            <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
        ),
        ol: ({ children }: { children?: React.ReactNode }) => (
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>
        ),
        li: ({ children }: { children?: React.ReactNode }) => (
            <li style={{ marginBottom: '4px' }}>{children}</li>
        ),
        code: ({ children }: { children?: React.ReactNode }) => (
            <code style={{
                backgroundColor: 'var(--color-bg)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '0.9em',
            }}>{children}</code>
        ),
    };

    const quickActionBtn: React.CSSProperties = {
        padding: '12px 16px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: '13px',
        color: 'var(--color-text)',
        textAlign: 'left',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'var(--font-body)',
    };

    return (
        <div data-testid="chatbot-panel" style={isInline ? {
            flex: 1,
            backgroundColor: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10,
            minHeight: '0',
            overflow: 'hidden',
        } : {
            position: 'fixed',
            right: '8px',
            top: '8px',
            bottom: '8px',
            width: '380px',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--color-primary)',
                borderRadius: isInline ? '0' : 'var(--radius-lg) var(--radius-lg) 0 0',
            }}>
                <div>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '15px', fontFamily: 'var(--font-heading)' }}>
                        Maths Tutor
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
                        {isInStepMode ? `Step ${currentStep}` : 'Ready to help'}
                    </div>
                </div>
                <button
                    data-testid="chatbot-close-btn"
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '16px',
                        transition: 'background 0.15s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                >
                    x
                </button>
            </div>

            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                backgroundColor: 'var(--color-bg)',
            }}>
                {messages.length === 0 && !streamingContent && (
                    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-heading)' }}>
                            Need help?
                        </h3>
                        <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            I can see the question and help you solve it step by step.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                data-testid="chatbot-quick-explain"
                                onClick={() => handleQuickAction('explain')}
                                style={quickActionBtn}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                Step by step
                            </button>
                            <button
                                data-testid="chatbot-quick-hint"
                                onClick={() => handleQuickAction('hint')}
                                style={quickActionBtn}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                Give me a hint
                            </button>
                            <button
                                data-testid="chatbot-quick-concept"
                                onClick={() => handleQuickAction('concept')}
                                style={quickActionBtn}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                What concepts do I need?
                            </button>
                        </div>
                    </div>
                )}

                {messages.map((message, index) => (
                    <div
                        key={index}
                        data-testid={`chat-message-${index}`}
                        style={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            backgroundColor: message.role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: message.role === 'user' ? '#fff' : 'var(--color-text)',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}>
                            {message.role === 'assistant' ? (
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                    components={markdownComponents}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            ) : (
                                message.content
                            )}
                        </div>
                    </div>
                ))}

                {streamingContent && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: '18px 18px 18px 4px',
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                        }}>
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={markdownComponents}
                            >
                                {streamingContent}
                            </ReactMarkdown>
                            <span style={{
                                display: 'inline-block',
                                width: '7px',
                                height: '15px',
                                backgroundColor: 'var(--color-primary)',
                                marginLeft: '2px',
                                borderRadius: '2px',
                                animation: 'blink 1s infinite',
                            }} />
                        </div>
                    </div>
                )}

                {isLoading && !streamingContent && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '14px 20px',
                            borderRadius: '18px 18px 18px 4px',
                            backgroundColor: 'var(--color-surface)',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                            display: 'flex',
                            gap: '5px',
                        }}>
                            <span style={{ width: '7px', height: '7px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0s' }} />
                            <span style={{ width: '7px', height: '7px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.2s' }} />
                            <span style={{ width: '7px', height: '7px', backgroundColor: 'var(--color-primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out', animationDelay: '0.4s' }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Step mode action buttons */}
            {isInStepMode && messages.length > 0 && !isLoading && (
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-primary-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                }}>
                    {isSolutionComplete ? (
                        <p data-testid="chatbot-solution-complete" style={{
                            margin: 0,
                            textAlign: 'center',
                            color: 'var(--color-primary)',
                            fontSize: '14px',
                            fontWeight: 600,
                        }}>
                            Solution Complete
                        </p>
                    ) : (
                        <>
                            <button
                                data-testid="chatbot-next-step-btn"
                                onClick={handleNextStep}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 'var(--radius-full)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'opacity 0.15s',
                                    fontFamily: 'var(--font-body)',
                                }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                Next Step
                            </button>
                            <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: 'var(--color-text-secondary)',
                                textAlign: 'center',
                            }}>
                                Don't understand? Type your question below instead
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Input area */}
            <form
                onSubmit={handleSubmit}
                data-testid="chatbot-input-form"
                style={{
                    padding: '14px 18px',
                    borderTop: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    display: 'flex',
                    gap: '10px',
                    borderRadius: isInline ? '0' : '0 0 var(--radius-lg) var(--radius-lg)',
                }}
            >
                <input
                    ref={inputRef}
                    data-testid="chatbot-input"
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isInStepMode ? "Ask about this step..." : "Ask a question..."}
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '11px 16px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: 'var(--color-bg)',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-body)',
                        color: 'var(--color-text)',
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-primary)';
                        e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <button
                    data-testid="chatbot-send-btn"
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                        padding: '11px 18px',
                        backgroundColor: isLoading || !inputValue.trim() ? 'var(--color-bg)' : 'var(--color-primary)',
                        color: isLoading || !inputValue.trim() ? 'var(--color-text-muted)' : '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-full)',
                        cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'all 0.15s',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    Send
                </button>
            </form>

            <style>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.6); }
                    40% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
