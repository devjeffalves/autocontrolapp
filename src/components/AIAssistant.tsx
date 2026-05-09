'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles, Send, Mic, Trash2, Loader2, Volume2, Square } from 'lucide-react';

export default function AIAssistant() {
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

  // Escutar evento global para abrir o chat e travar scroll
  useEffect(() => {
    const handleOpenAI = () => {
      setShowAIChat(true);
      document.body.style.overflow = 'hidden';
    };
    const handleCloseAI = () => {
      setShowAIChat(false);
      document.body.style.overflow = 'auto';
    };
    window.addEventListener('open-ai-assistant', handleOpenAI);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenAI);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const startAiListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não suportado.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.onstart = () => setIsAiListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setAiMessage(transcript);
      setTimeout(() => handleSendMessageDirect(transcript), 500);
    };
    recognition.onerror = () => setIsAiListening(false);
    recognition.onend = () => setIsAiListening(false);
    recognition.start();
  };

  const handleSendMessageDirect = async (messageText: string) => {
    if (!messageText.trim() || aiLoading) return;

    const userMsg = { role: 'user', content: messageText };
    setChatHistory(prev => [...prev, userMsg]);
    setAiMessage('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, history: chatHistory }),
      });
      const data = await res.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', content: 'Ops: ' + data.error }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Erro de conexão.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  const speakMessage = (text: string, msgId: string) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}]/gu, '').replace(/\*\*|\*/g, '').replace(/[#/_\\-]/g, ' ').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.lang.includes('pt') && (v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('female')));
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.15;
    utterance.rate = 1.25;
    utterance.onstart = () => setIsSpeaking(msgId);
    utterance.onend = () => setIsSpeaking(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <AnimatePresence>
        {showAIChat && (
          <div className="ai-modal-overlay">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="ai-chat-drawer"
            >
              <div className="ai-chat-header">
                <div className="ai-title">
                  <div className="ai-icon-pulse"><Bot size={20} /></div>
                  <div>
                    <h3>Assistente de Bordo</h3>
                    <span className="online-status">Ativa agora</span>
                  </div>
                </div>
                <button onClick={() => {
                  setShowAIChat(false);
                  document.body.style.overflow = 'auto';
                }} className="close-ai"><X size={20} /></button>
              </div>

              <div className="ai-chat-messages">
                {chatHistory.length === 0 && (
                  <div className="ai-welcome">
                    <Sparkles size={40} style={{ color: 'var(--primary)' }} />
                    <h4>Como posso ajudar hoje?</h4>
                    <p>Fale comigo sobre sua rentabilidade ou custos.</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`chat-bubble-container ${msg.role}`}>
                    <div className={`chat-bubble ${msg.role}`}>{msg.content}</div>
                    {msg.role === 'assistant' && (
                      <button className={`speak-btn ${isSpeaking === `msg-${i}` ? 'speaking' : ''}`} onClick={() => speakMessage(msg.content, `msg-${i}`)}>
                        {isSpeaking === `msg-${i}` ? <Square size={14} fill="currentColor" /> : <Volume2 size={14} />}
                      </button>
                    )}
                  </div>
                ))}
                {aiLoading && <div className="chat-bubble assistant loading"><Loader2 className="animate-spin" size={14} /> Analisando...</div>}
              </div>

              <form className="ai-chat-input" onSubmit={(e) => { e.preventDefault(); handleSendMessageDirect(aiMessage); }}>
                {isAiListening && (
                  <button type="button" className="delete-voice-btn" onClick={() => { setIsAiListening(false); setAiMessage(''); }}>
                    <Trash2 size={20} />
                  </button>
                )}

                <div className="input-wrapper">
                  <input 
                    placeholder={isAiListening ? "Ouvindo..." : "Escreva ou fale..."} 
                    value={aiMessage}
                    onChange={e => setAiMessage(e.target.value)}
                    disabled={aiLoading}
                  />
                </div>

                <div className="chat-actions-right">
                  {!aiMessage.trim() && !aiLoading && (
                    <motion.button 
                      type="button" 
                      className={`mic-btn-ai ${isAiListening ? 'listening' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startAiListening();
                      }}
                      whileTap={{ scale: 0.9 }} // Apenas escala, sem mover Y
                    >
                      <Mic size={20} />
                    </motion.button>
                  )}
                  {(aiMessage.trim() || aiLoading) && (
                    <button type="submit" disabled={aiLoading || !aiMessage.trim()} className="send-btn-ai">
                      {aiLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={20} />}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .ai-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: flex-end;
        }

        .ai-chat-drawer {
          width: 100%;
          max-width: 500px;
          height: 90vh;
          background: #fff;
          border-radius: 24px 24px 0 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.2);
        }

        .ai-chat-header {
          padding: 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ai-title { display: flex; align-items: center; gap: 12px; }
        .ai-title h3 { font-size: 1rem; font-weight: 700; margin: 0; color: #1e293b; }
        .online-status { font-size: 0.7rem; color: #10b981; font-weight: 600; }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #f1f5f9;
        }

        .chat-bubble-container { display: flex; gap: 8px; max-width: 85%; }
        .chat-bubble-container.user { align-self: flex-end; flex-direction: row-reverse; }
        .chat-bubble { padding: 12px 16px; border-radius: 18px; font-size: 0.9rem; line-height: 1.5; }
        .chat-bubble.user { background: #3b82f6; color: white; border-bottom-right-radius: 4px; }
        .chat-bubble.assistant { background: white; color: #1e293b; border-bottom-left-radius: 4px; border: 1px solid #e2e8f0; }

        .ai-chat-input {
          padding: 16px 20px 32px 20px;
          background: white;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 10001;
        }

        .input-wrapper { flex: 1; }
        .input-wrapper input {
          width: 100%;
          padding: 12px 16px;
          background: #f1f5f9;
          border: 1px solid transparent;
          border-radius: 20px;
          font-size: 1rem;
          color: #1e293b;
        }

        .mic-btn-ai, .send-btn-ai, .delete-voice-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          touch-action: manipulation;
          z-index: 10002;
        }

        .mic-btn-ai { background: #f1f5f9; color: #3b82f6; }
        .mic-btn-ai.listening { background: #ef4444; color: white; }
        .send-btn-ai { background: #3b82f6; color: white; }
        .delete-voice-btn { background: #fee2e2; color: #ef4444; }

        .speak-btn {
          margin-top: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
        }

        @media (max-width: 480px) {
          .ai-chat-drawer { height: 100vh; border-radius: 0; }
          .ai-chat-input { padding-bottom: 40px; }
        }
      `}</style>
    </>
  );
}
