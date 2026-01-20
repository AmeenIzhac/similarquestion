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
    isOpen: boolean;
    onClose: () => void;
}

export function ChatBot({ questionId, questionImageUrl, isOpen, onClose }: ChatBotProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const [isInStepMode, setIsInStepMode] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
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

    // Fetch and encode the question image when it changes
    useEffect(() => {
        if (questionImageUrl) {
            fetchImageAsBase64(questionImageUrl);
        }
    }, [questionImageUrl]);

    const fetchImageAsBase64 = async (url: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setImageBase64(base64);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Error fetching image:', error);
            setImageBase64(null);
        }
    };

    // Reset chat when question changes
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

        // Track if this is starting step mode or continuing it
        if (userMessage.toLowerCase().includes('step by step') || userMessage.toLowerCase().includes('explain how')) {
            setIsInStepMode(true);
            setCurrentStep(1);
        } else if (isStepRequest) {
            setCurrentStep(prev => prev + 1);
        }

        try {
            const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

            if (!apiKey) {
                throw new Error('OpenAI API key not configured');
            }

            // Different prompts for step-by-step mode vs regular help
            let systemPrompt: string;

            if (isInStepMode || userMessage.toLowerCase().includes('step by step') || userMessage.toLowerCase().includes('explain how')) {
                const stepNum = isStepRequest ? currentStep + 1 : 1;
                systemPrompt = `You are a helpful GCSE Maths tutor. You can SEE the question image that has been provided.

IMPORTANT: The student has asked for step-by-step help. You are currently on STEP ${stepNum}.

YOUR RULES:
1. Give ONLY ONE STEP at a time - this is critical!
2. Keep your response SHORT (2-4 sentences maximum)
3. End your response by asking if they're ready for the next step
4. Do NOT reveal future steps or the final answer until it's time
5. Be encouraging and supportive
6. Look at the question image carefully and provide specific guidance for THIS question
7. When you reach the FINAL step where you give the complete answer/solution, you MUST end your message with exactly: [SOLUTION COMPLETE]
8. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.

Format your response clearly.`;
            } else {
                systemPrompt = `You are a helpful GCSE Maths tutor. You can SEE the question image that has been provided.

Your role is to:
1. Look at the question image and understand what it's asking
2. Give hints rather than full solutions
3. Explain mathematical concepts clearly and simply
4. Use encouraging language
5. Keep responses SHORT and concise (3-5 sentences max)
6. If they want step-by-step help, tell them to click the "Step by step" button
7. Use LaTeX notation for all mathematical expressions. Use $...$ for inline math and $$...$$ for display math.

Format your response clearly.`;
            }

            // Build the messages array with image for the first message
            const apiMessages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
                { role: 'system', content: systemPrompt }
            ];

            // Add conversation history
            for (const m of messages) {
                apiMessages.push({ role: m.role, content: m.content });
            }

            // Always include the question image with the current user message
            // so the model has visual context of the question being worked on
            if (imageBase64) {
                apiMessages.push({
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageBase64
                            }
                        },
                        {
                            type: 'text',
                            text: userMessage
                        }
                    ]
                });
            } else {
                apiMessages.push({ role: 'user', content: userMessage });
            }

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: apiMessages,
                    stream: true,
                    max_tokens: 400
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', response.status, errorText);
                throw new Error(`API error: ${response.status}`);
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
                                const content = parsed.choices?.[0]?.delta?.content || '';
                                fullContent += content;
                                setStreamingContent(fullContent);
                            } catch {
                                // Skip invalid JSON
                            }
                        }
                    }
                }
            }

            // Check if the solution is complete
            if (fullContent.includes('[SOLUTION COMPLETE]')) {
                setIsSolutionComplete(true);
                // Remove the marker from the displayed content
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

    // Custom markdown styles
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
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontFamily: 'monospace'
            }}>{children}</code>
        ),
    };

    return (
        <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '380px',
            backgroundColor: '#ffffff',
            borderLeft: '1px solid #e5e5e5',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100,
            boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.08)'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#10a37f'
            }}>
                <div>
                    <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '15px' }}>
                        Maths Tutor
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.85)' }}>
                        {isInStepMode ? `Step ${currentStep}` : 'Ready to help'}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        border: 'none',
                        borderRadius: '6px',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '18px',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                >
                    ×
                </button>
            </div>

            {/* Messages area */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                backgroundColor: '#f9fafb'
            }}>
                {messages.length === 0 && !streamingContent && (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: '#333' }}>
                            Need help with this question?
                        </h3>
                        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#666', lineHeight: 1.5 }}>
                            I can see the question image and help you solve it step by step.
                        </p>

                        {/* Quick action buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => handleQuickAction('explain')}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#333',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.borderColor = '#10a37f';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e5e5e5';
                                }}
                            >
                                Step by step
                            </button>
                            <button
                                onClick={() => handleQuickAction('hint')}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#333',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.borderColor = '#10a37f';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e5e5e5';
                                }}
                            >
                                Give me a hint
                            </button>
                            <button
                                onClick={() => handleQuickAction('concept')}
                                style={{
                                    padding: '12px 16px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #e5e5e5',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#333',
                                    textAlign: 'left',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                    e.currentTarget.style.borderColor = '#10a37f';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.borderColor = '#e5e5e5';
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
                        style={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div style={{
                            maxWidth: '85%',
                            padding: '12px 16px',
                            borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            backgroundColor: message.role === 'user' ? '#10a37f' : '#ffffff',
                            color: message.role === 'user' ? '#ffffff' : '#333',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            boxShadow: message.role === 'assistant' ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none'
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
                            borderRadius: '16px 16px 16px 4px',
                            backgroundColor: '#ffffff',
                            color: '#333',
                            fontSize: '14px',
                            lineHeight: 1.7,
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
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
                                width: '8px',
                                height: '16px',
                                backgroundColor: '#10a37f',
                                marginLeft: '2px',
                                animation: 'blink 1s infinite'
                            }} />
                        </div>
                    </div>
                )}

                {isLoading && !streamingContent && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{
                            padding: '12px 20px',
                            borderRadius: '16px 16px 16px 4px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                            display: 'flex',
                            gap: '6px'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#10a37f',
                                borderRadius: '50%',
                                animation: 'bounce 1.4s infinite ease-in-out',
                                animationDelay: '0s'
                            }} />
                            <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#10a37f',
                                borderRadius: '50%',
                                animation: 'bounce 1.4s infinite ease-in-out',
                                animationDelay: '0.2s'
                            }} />
                            <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#10a37f',
                                borderRadius: '50%',
                                animation: 'bounce 1.4s infinite ease-in-out',
                                animationDelay: '0.4s'
                            }} />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Step mode action buttons */}
            {isInStepMode && messages.length > 0 && !isLoading && (
                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e5e5e5',
                    backgroundColor: isSolutionComplete ? '#e8f5e9' : '#f0fdf4',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {isSolutionComplete ? (
                        // Solution complete message - plain text on light green background
                        <p style={{
                            margin: 0,
                            textAlign: 'center',
                            color: '#10a37f',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>
                            Solution Complete
                        </p>
                    ) : (
                        // Next step button and helper text
                        <>
                            <button
                                onClick={handleNextStep}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#10a37f',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                Next Step
                            </button>
                            <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#666',
                                textAlign: 'center'
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
                style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #e5e5e5',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    gap: '10px'
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isInStepMode ? "Ask a question about this step..." : "Ask a question..."}
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '24px',
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: '#f9fafb',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#10a37f';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 163, 127, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#e5e5e5';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !inputValue.trim()}
                    style={{
                        padding: '12px 20px',
                        backgroundColor: isLoading || !inputValue.trim() ? '#e5e5e5' : '#10a37f',
                        color: isLoading || !inputValue.trim() ? '#999' : '#ffffff',
                        border: 'none',
                        borderRadius: '24px',
                        cursor: isLoading || !inputValue.trim() ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
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
