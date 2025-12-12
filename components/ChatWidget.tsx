
import React, { useState, useRef, useEffect } from 'react';
import { Chat, GenerateContentResponse } from "@google/genai";
import { CryptoData, AnalysisResult, CandleData, AIConfig, ChatMessage, NewsItem } from '../types';
import { createChatSession, buildContextMessage, sendChatRequest } from '../services/geminiService';
import { InfoPopup } from './InfoPopup';

interface ChatWidgetProps {
  selectedCoin: CryptoData | null;
  analysis: AnalysisResult | null;
  candles: CandleData[];
  aiConfig: AIConfig;
  news: NewsItem[];
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ selectedCoin, analysis, candles, aiConfig, news }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat Session Reference (Gemini Only)
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Initialize Gemini Session if selected
  useEffect(() => {
    if (aiConfig.provider === 'gemini' && !chatSessionRef.current) {
        const key = aiConfig.apiKeys.gemini || process.env.API_KEY || "";
        if (key) {
            try {
                chatSessionRef.current = createChatSession(key, aiConfig.models.gemini);
                setMessages([{
                    id: 'init',
                    role: 'model',
                    text: "Hi! I'm OpenCrypto. I can see the market data you're looking at. Ask me anything about the current trend.",
                    timestamp: Date.now()
                }]);
            } catch (e) {
                console.error("Failed to init chat", e);
            }
        }
    }
    // For other providers, we just reset the history slightly or keep it
    if (aiConfig.provider !== 'gemini' && messages.length === 0) {
        setMessages([{
            id: 'init',
            role: 'model',
            text: `Ready to chat using ${aiConfig.provider}. Ask me about the market!`,
            timestamp: Date.now()
        }]);
    }
  }, [aiConfig]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue("");
    
    // Add user message immediately
    const userMsgId = Date.now().toString();
    const newUserMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        text: userText,
        timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
        // Construct prompt with context
        const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
        const prompt = buildContextMessage(userText, selectedCoin, analysis, latestCandle);

        // --- GEMINI STREAMING PATH ---
        if (aiConfig.provider === 'gemini') {
            if (!chatSessionRef.current) {
                const key = aiConfig.apiKeys.gemini || process.env.API_KEY || "";
                if(key) chatSessionRef.current = createChatSession(key, aiConfig.models.gemini);
            }

            if (chatSessionRef.current) {
                 const result = await chatSessionRef.current.sendMessageStream({ message: prompt });
                 
                 const botMsgId = (Date.now() + 1).toString();
                 let fullText = "";
                 
                 setMessages(prev => [...prev, {
                     id: botMsgId,
                     role: 'model',
                     text: "",
                     timestamp: Date.now(),
                     isStreaming: true
                 }]);
         
                 for await (const chunk of result) {
                     const c = chunk as GenerateContentResponse;
                     const text = c.text;
                     if (text) {
                         fullText += text;
                         setMessages(prev => prev.map(m => 
                             m.id === botMsgId ? { ...m, text: fullText } : m
                         ));
                     }
                 }
                 setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
            }
        } 
        // --- OTHER PROVIDERS (Standard Request) ---
        else {
             // We send the history + new prompt
             const responseText = await sendChatRequest(aiConfig, [...messages, newUserMsg], prompt);
             
             setMessages(prev => [...prev, {
                 id: (Date.now() + 1).toString(),
                 role: 'model',
                 text: responseText,
                 timestamp: Date.now()
             }]);
        }

    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            text: `Error (${aiConfig.provider}): ${(e as Error).message || 'Connection failed'}`,
            timestamp: Date.now()
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-crypto-accent hover:bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-900/40 transition-all transform hover:scale-110 animate-fade-in-up"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-[380px] h-[500px] flex flex-col bg-crypto-card border border-gray-700 rounded-2xl shadow-2xl animate-fade-in-up overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 border-b border-gray-700 backdrop-blur">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h3 className="font-bold text-white">
                    Oracle Chat ({aiConfig.provider})
                    <InfoPopup data={{
                        title: "AI Assistant",
                        content: `Chatting with ${aiConfig.provider}. The AI sees the same coin, price, and chart analysis you see on screen.`
                    }} />
                </h3>
            </div>
            <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-crypto-dark/50 scrollbar-thin scrollbar-thumb-gray-700">
             {messages.map((msg) => (
                 <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`
                        max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                        ${msg.role === 'user' 
                          ? 'bg-crypto-accent text-white rounded-tr-none' 
                          : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'}
                     `}>
                        {msg.text}
                        {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-crypto-accent animate-pulse"></span>}
                     </div>
                 </div>
             ))}
             {messages.length === 0 && (
                 <div className="text-center text-gray-500 text-sm mt-10">
                     <p>Connected to {aiConfig.provider}.</p>
                     <p className="mt-2 text-xs">Ask about {selectedCoin ? selectedCoin.name : 'the market'}...</p>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-crypto-card border-t border-gray-700">
             <div className="relative">
                 <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Oracle..."
                    disabled={isLoading}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:border-crypto-accent outline-none transition-colors"
                 />
                 <button
                    onClick={handleSend}
                    disabled={isLoading || !inputValue.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-crypto-accent rounded-lg text-white disabled:opacity-50 disabled:bg-gray-700 transition-all hover:bg-blue-600"
                 >
                    {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    )}
                 </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};
