'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles, Send, Mic, Trash2, Loader2, Volume2, Square, History, Plus, MessageSquare } from 'lucide-react';

export default function AIAssistant() {
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Arquivar sessão atual no histórico
  const archiveCurrentSession = (messagesToArchive: any[]) => {
    if (!messagesToArchive || messagesToArchive.length === 0) return;
    const firstUserMsg = messagesToArchive.find(m => m.role === 'user')?.content || 'Conversa';
    const title = firstUserMsg.length > 30 ? firstUserMsg.slice(0, 30) + '...' : firstUserMsg;
    const newSession = {
      id: Date.now().toString(),
      title,
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      messages: messagesToArchive
    };
    
    setSavedSessions(prev => {
      if (prev.some(s => s.id === newSession.id)) return prev;
      const updated = [newSession, ...prev];
      localStorage.setItem('autocontrol_ai_chat_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  // Carregar histórico do localStorage
  useEffect(() => {
    try {
      const storedSessions = localStorage.getItem('autocontrol_ai_chat_sessions');
      if (storedSessions) {
        setSavedSessions(JSON.parse(storedSessions));
      }
    } catch (e) {
      console.error('Erro ao carregar histórico do chat:', e);
    }
  }, []);

  // Escutar evento global para abrir o chat sempre com UMA CONVERSA NOVA/LIMPA
  useEffect(() => {
    const handleOpenAI = () => {
      setShowAIChat(true);
      setShowHistoryPanel(false);
      setChatHistory(prev => {
        if (prev.length > 0) {
          archiveCurrentSession(prev);
        }
        return [];
      });
      localStorage.removeItem('autocontrol_ai_current_chat');
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

  // Rolar para o fim quando houver nova mensagem
  useEffect(() => {
    if (chatHistory.length > 0) {
      scrollToBottom();
    }
  }, [chatHistory, aiLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startAiListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não suportado neste navegador.');
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

  const handleNewChat = () => {
    if (chatHistory.length > 0) {
      archiveCurrentSession(chatHistory);
    }
    setChatHistory([]);
    localStorage.removeItem('autocontrol_ai_current_chat');
    setShowHistoryPanel(false);
  };

  const handleLoadSession = (session: any) => {
    if (chatHistory.length > 0) {
      archiveCurrentSession(chatHistory);
    }
    setChatHistory(session.messages);
    setShowHistoryPanel(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedSessions.filter(s => s.id !== sessionId);
    setSavedSessions(updated);
    localStorage.setItem('autocontrol_ai_chat_sessions', JSON.stringify(updated));
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

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      let isBullet = false;
      
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        trimmed = trimmed.slice(2);
        isBullet = true;
      }

      const parts = trimmed.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      return (
        <React.Fragment key={idx}>
          {isBullet ? (
            <div style={{ display: 'flex', gap: '8px', marginLeft: '2px', margin: '3px 0', alignItems: 'flex-start' }}>
              <span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '0.9rem', lineHeight: '1.4' }}>•</span>
              <div style={{ flex: 1 }}>{formattedLine}</div>
            </div>
          ) : (
            <div>{formattedLine}</div>
          )}
          {idx < lines.length - 1 && !isBullet && <div style={{ height: '4px' }} />}
        </React.Fragment>
      );
    });
  };

  return (
    <>
      <AnimatePresence>
        {showAIChat && (
          <div 
            className="ai-modal-overlay"
            onClick={() => {
              setShowAIChat(false);
              document.body.style.overflow = 'auto';
            }}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="ai-chat-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Puxador Visual Mobile */}
              <div className="mobile-drag-indicator" />

              {/* Cabeçalho Premium Dark Theme */}
              <div className="ai-chat-header">
                <div className="ai-title">
                  <div className="ai-icon-pulse"><Bot size={18} /></div>
                  <div>
                    <h3>Assistente de Bordo</h3>
                    <span className="online-status">
                      <span className="status-dot" /> Ativa agora
                    </span>
                  </div>
                </div>
                
                <div className="header-actions">
                  <button 
                    className="header-action-btn"
                    onClick={() => setShowHistoryPanel(!showHistoryPanel)}
                    title="Histórico de Conversas"
                  >
                    <History size={16} />
                  </button>
                  
                  <button 
                    className="header-action-btn"
                    onClick={handleNewChat}
                    title="Nova Conversa"
                  >
                    <Plus size={16} />
                  </button>

                  <button 
                    onClick={() => {
                      setShowAIChat(false);
                      document.body.style.overflow = 'auto';
                    }} 
                    className="close-ai"
                    title="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Painel Flutuante de Histórico de Conversas */}
              <AnimatePresence>
                {showHistoryPanel && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="history-panel"
                  >
                    <div className="history-panel-header">
                      <span>Conversas Salvas</span>
                      <button onClick={() => setShowHistoryPanel(false)} className="close-history-btn"><X size={14} /></button>
                    </div>

                    <div className="history-list">
                      <button className="new-session-item" onClick={handleNewChat}>
                        <Plus size={14} /> Nova Conversa
                      </button>

                      {savedSessions.length === 0 ? (
                        <p className="no-history-text">Nenhuma conversa salva no histórico ainda.</p>
                      ) : (
                        savedSessions.map(session => (
                          <div 
                            key={session.id} 
                            className="history-item"
                            onClick={() => handleLoadSession(session)}
                          >
                            <div className="history-item-info">
                              <MessageSquare size={14} className="history-item-icon" />
                              <div>
                                <h5 className="history-item-title">{session.title}</h5>
                                <span className="history-item-date">{session.date} • {session.messages?.length || 0} msgs</span>
                              </div>
                            </div>
                            <button 
                              className="delete-history-btn" 
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              title="Excluir conversa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conteúdo com Rolagem Fluida */}
              <div className="ai-chat-messages">
                {chatHistory.length === 0 && (
                  <div className="ai-welcome">
                    <div className="sparkles-icon-bg">
                      <Sparkles size={28} style={{ color: '#2563eb' }} />
                    </div>
                    <h4>Como posso ajudar hoje?</h4>
                    <p>Pergunte sobre seus dias mais rentáveis, dicas de economia ou aumento de lucro por km!</p>
                    
                    <div className="prompt-suggestions">
                      <button onClick={() => handleSendMessageDirect("Quais são meus dias e horários mais rentáveis?")}>
                        🗓️ Melhores dias para rodar
                      </button>
                      <button onClick={() => handleSendMessageDirect("Como posso economizar combustível com meu veículo?")}>
                        ⛽ Dicas para economizar combustível
                      </button>
                      <button onClick={() => handleSendMessageDirect("Qual é a minha média de lucro por km?")}>
                        📈 Aumentar lucro por KM
                      </button>
                    </div>
                  </div>
                )}
                
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`chat-bubble-container ${msg.role}`}>
                    <div className={`chat-bubble ${msg.role}`}>
                      {msg.role === 'assistant' ? renderFormattedContent(msg.content) : msg.content}
                    </div>
                    {msg.role === 'assistant' && (
                      <button 
                        className={`speak-btn ${isSpeaking === `msg-${i}` ? 'speaking' : ''}`} 
                        onClick={() => speakMessage(msg.content, `msg-${i}`)}
                        title="Ouvir resposta"
                      >
                        {isSpeaking === `msg-${i}` ? <Square size={13} fill="currentColor" /> : <Volume2 size={13} />}
                      </button>
                    )}
                  </div>
                ))}
                
                {aiLoading && (
                  <div className="chat-bubble assistant loading">
                    <Loader2 className="animate-spin" size={14} /> Analisando suas corridas...
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Rodapé e Campo de Digitação Fixo */}
              <form className="ai-chat-input" onSubmit={(e) => { e.preventDefault(); handleSendMessageDirect(aiMessage); }}>
                {isAiListening && (
                  <button type="button" className="delete-voice-btn" onClick={() => { setIsAiListening(false); setAiMessage(''); }}>
                    <Trash2 size={18} />
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
                      whileTap={{ scale: 0.9 }}
                    >
                      <Mic size={18} />
                    </motion.button>
                  )}
                  {(aiMessage.trim() || aiLoading) && (
                    <button type="submit" disabled={aiLoading || !aiMessage.trim()} className="send-btn-ai">
                      {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={18} />}
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100dvh;
          z-index: 99999;
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          padding: 24px;
          box-sizing: border-box;
          pointer-events: none;
        }

        .mobile-drag-indicator {
          display: none;
        }

        .ai-chat-drawer {
          width: 400px;
          max-width: calc(100vw - 48px);
          height: 560px;
          max-height: calc(100dvh - 48px);
          background: #ffffff;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 24px 60px -12px rgba(15, 23, 42, 0.25), 0 0 30px rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(226, 232, 240, 0.9);
          position: relative;
          pointer-events: auto;
        }

        /* Cabeçalho Escuro e Moderno */
        .ai-chat-header {
          padding: 14px 18px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
          z-index: 10;
        }

        .ai-title { display: flex; align-items: center; gap: 12px; }
        
        .ai-icon-pulse {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 14px rgba(37, 99, 235, 0.45);
        }

        .ai-title h3 { font-size: 0.95rem; font-weight: 700; margin: 0; color: #ffffff; letter-spacing: -0.01em; }
        
        .online-status { 
          font-size: 0.68rem; 
          color: #34d399; 
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 1px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #34d399;
          box-shadow: 0 0 8px #34d399;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .header-action-btn, .close-ai {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #cbd5e1;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .header-action-btn:hover, .close-ai:hover {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
          transform: translateY(-1px);
        }

        /* History Panel */
        .history-panel {
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 16px;
          max-height: 220px;
          overflow-y: auto;
          flex-shrink: 0;
          box-shadow: inset 0 -4px 12px rgba(0,0,0,0.02);
        }

        .history-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .close-history-btn {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .new-session-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #2563eb;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
        }

        .new-session-item:hover {
          background: #eff6ff;
          border-color: #2563eb;
        }

        .history-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          cursor: pointer;
          transition: all 0.2s;
        }

        .history-item:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }

        .history-item-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .history-item-icon {
          color: #64748b;
        }

        .history-item-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .history-item-date {
          font-size: 0.65rem;
          color: #94a3b8;
        }

        .delete-history-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .delete-history-btn:hover {
          opacity: 1;
        }

        .no-history-text {
          font-size: 0.75rem;
          color: #94a3b8;
          text-align: center;
          margin: 8px 0;
        }

        /* Messages Container */
        .ai-chat-messages {
          flex: 1 1 0%;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #f8fafc;
          overscroll-behavior: contain;
        }

        .ai-welcome {
          text-align: center;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .sparkles-icon-bg {
          width: 52px;
          height: 52px;
          border-radius: 18px;
          background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
        }

        .ai-welcome h4 {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .ai-welcome p {
          font-size: 0.82rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .prompt-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 10px;
        }

        .prompt-suggestions button {
          padding: 10px 14px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #1e293b;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.03);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .prompt-suggestions button:hover {
          border-color: #2563eb;
          color: #2563eb;
          background: #eff6ff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
        }

        .chat-bubble-container { display: flex; gap: 8px; max-width: 90%; }
        .chat-bubble-container.user { align-self: flex-end; flex-direction: row-reverse; }
        .chat-bubble-container.assistant { align-self: flex-start; }

        .chat-bubble { 
          padding: 12px 16px; 
          border-radius: 18px; 
          font-size: 0.88rem; 
          line-height: 1.5; 
          word-break: break-word;
        }
        
        .chat-bubble.user { 
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
          color: #ffffff; 
          border-bottom-right-radius: 4px; 
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
        }
        
        .chat-bubble.assistant { 
          background: #ffffff; 
          color: #0f172a; 
          border-bottom-left-radius: 4px; 
          border: 1px solid #e2e8f0; 
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }

        .ai-chat-input {
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)) 16px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          z-index: 10;
        }

        .input-wrapper { flex: 1; }
        .input-wrapper input {
          width: 100%;
          padding: 10px 16px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 22px;
          font-size: 0.9rem;
          color: #0f172a;
          outline: none;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }

        .mic-btn-ai, .send-btn-ai, .delete-voice-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          touch-action: manipulation;
          flex-shrink: 0;
        }

        .mic-btn-ai { background: #f1f5f9; color: #2563eb; }
        .mic-btn-ai:hover { background: #e2e8f0; }
        .mic-btn-ai.listening { background: #ef4444; color: white; }
        
        .send-btn-ai { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8); 
          color: white; 
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }
        .send-btn-ai:hover {
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
          transform: translateY(-1px);
        }

        .delete-voice-btn { background: #fee2e2; color: #ef4444; }

        .speak-btn {
          margin-top: 4px;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.2s;
        }

        .speak-btn:hover {
          background: #f1f5f9;
        }

        /* Mobile Version: Gaveta inferior com área segura e proporção responsiva */
        @media (max-width: 640px) {
          .ai-modal-overlay {
            padding: 0;
            align-items: flex-end;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(8px);
            pointer-events: auto;
          }

          .mobile-drag-indicator {
            display: block;
            width: 38px;
            height: 4px;
            border-radius: 2px;
            background: rgba(255, 255, 255, 0.3);
            margin: 8px auto 2px auto;
            flex-shrink: 0;
          }

          .ai-chat-drawer { 
            height: 85dvh; 
            max-height: 85dvh; 
            width: 100vw;
            max-width: 100vw;
            border-radius: 24px 24px 0 0; 
            border: none;
            box-shadow: 0 -10px 40px rgba(15, 23, 42, 0.3);
            background: #0f172a; /* Cor de fundo do cabeçalho para unificar o drag indicator */
          }

          .ai-chat-header {
            padding-top: max(8px, env(safe-area-inset-top, 8px));
            padding-left: 16px;
            padding-right: 16px;
            padding-bottom: 12px;
          }

          .ai-chat-messages {
            padding: 14px 16px;
          }

          .ai-chat-input { 
            padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
            padding-left: 14px;
            padding-right: 14px;
          }

          .chat-bubble-container {
            max-width: 92%;
          }
        }
      `}</style>
    </>
  );
}
