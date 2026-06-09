'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ChevronLeft, DollarSign, Navigation, Droplets, Hash, AlertCircle, CheckCircle, Loader2, Play, Check, Plus, Mic, MicOff } from 'lucide-react';
import Link from 'next/link';

export default function NovoRegistro() {
  const [activeSession, setActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form states for different actions
  const [startData, setStartData] = useState({ kmStart: '', platform: 'Aplicativos' });
  const [fuelData, setFuelData] = useState({ fuelCost: '', fuelLitres: '', fuelKm: '' });
  const [finishData, setFinishData] = useState({ kmEnd: '', rides: '', earnings: '', platform: 'Aplicativos' });

  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotification({ type: 'error', message: 'Reconhecimento de voz não suportado neste navegador.' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Ouvindo...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setVoiceFeedback(transcript);
      processVoiceCommand(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Erro no reconhecimento:', event.error);
      setIsListening(false);
      setVoiceFeedback('Erro ao ouvir.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const processVoiceCommand = (text: string) => {
    let understood = false;
    let msg: string[] = [];
    const normalized = text.toLowerCase();
    
    // Separa tokens para buscar números próximos a palavras-chave
    const tokens = normalized.split(/\s+/);
    
    const findNumberNear = (keywords: string[]) => {
      for (const kw of keywords) {
        const index = tokens.findIndex(t => t.includes(kw));
        if (index !== -1) {
          // Procura um número num raio de 2 palavras
          for (let i = Math.max(0, index - 2); i <= Math.min(tokens.length - 1, index + 2); i++) {
            const match = tokens[i].match(/\d+(?:[.,]\d+)?/);
            if (match) {
              const val = match[0].replace(',', '.');
              // Marca como usado para não ser pego por outra regra
              tokens[i] = tokens[i].replace(/\d+(?:[.,]\d+)?/, 'USED');
              return val;
            }
          }
        }
      }
      return null;
    };

    // 1. Abastecimento (Processado primeiro para não roubar os 'reais' dos ganhos)
    if (normalized.includes('abastec') || normalized.includes('gasolina') || normalized.includes('etanol') || normalized.includes('posto')) {
       const litrosVal = findNumberNear(['litro', 'l']);
       const valorVal = findNumberNear(['real', 'reais', 'r$', 'abastec', 'coloquei', 'botei']);
       const kmVal = findNumberNear(['km', 'quilometragem', 'rodado']);
       
       if (valorVal && litrosVal) {
         setFuelData({ fuelCost: valorVal, fuelLitres: litrosVal, fuelKm: kmVal || '' });
         msg.push(`Abast: R$${valorVal} / ${litrosVal}L${kmVal ? ` no KM ${kmVal}` : ''}`);
         understood = true;
       } else if (valorVal) {
         setFuelData(prev => ({ ...prev, fuelCost: valorVal, fuelKm: kmVal || '' }));
         msg.push(`Abast: R$${valorVal}${kmVal ? ` no KM ${kmVal}` : ''}`);
         understood = true;
       } else {
         // Fallback se falou os números soltos
         const remMatches = tokens.join(' ').match(/\d+(?:[.,]\d+)?/g);
         if (remMatches && remMatches.length >= 2) {
           setFuelData({ fuelCost: remMatches[0].replace(',', '.'), fuelLitres: remMatches[1].replace(',', '.'), fuelKm: kmVal || '' });
           msg.push(`Abast: R$${remMatches[0]} / ${remMatches[1]}L${kmVal ? ` no KM ${kmVal}` : ''}`);
           understood = true;
         } else if (remMatches && remMatches.length === 1) {
           setFuelData(prev => ({ ...prev, fuelCost: remMatches[0].replace(',', '.'), fuelKm: kmVal || '' }));
           msg.push(`Abast: R$${remMatches[0]}${kmVal ? ` no KM ${kmVal}` : ''}`);
           understood = true;
         }
       }
    }

    // 2. Corridas
    const ridesVal = findNumberNear(['corrida', 'viage']);
    if (ridesVal) {
      setFinishData(prev => ({ ...prev, rides: ridesVal }));
      msg.push(`${ridesVal} corridas`);
      understood = true;
    }

    // 3. Ganhos
    const earningsVal = findNumberNear(['real', 'reais', 'r$', 'ganho', 'faturei', 'rendeu', 'fiz', 'total']);
    if (earningsVal) {
      setFinishData(prev => ({ ...prev, earnings: earningsVal }));
      msg.push(`Ganhos: R$${earningsVal}`);
      understood = true;
    }

    // 4. KM Inicial
    const kmStartVal = findNumberNear(['inicial', 'começ', 'inici']);
    if (kmStartVal) {
      setStartData(prev => ({ ...prev, kmStart: kmStartVal }));
      msg.push(`KM Inic: ${kmStartVal}`);
      understood = true;
    }

    // 5. KM Final
    const kmEndVal = findNumberNear(['final', 'termin', 'parar', 'parei', 'fechar', 'fechei']);
    if (kmEndVal) {
      setFinishData(prev => ({ ...prev, kmEnd: kmEndVal }));
      msg.push(`KM Fin: ${kmEndVal}`);
      understood = true;
    }

    // 6. Plataforma
    if (normalized.includes('passeio') || normalized.includes('lazer')) {
      setStartData(prev => ({...prev, platform: 'Passeio'}));
      msg.push('Plat: Passeio');
      understood = true;
    } else if (normalized.includes('aplicativo') || normalized.includes('app') || normalized.includes('uber') || normalized.includes('99')) {
      setStartData(prev => ({...prev, platform: 'Aplicativos'}));
      msg.push('Plat: Aplicativos');
      understood = true;
    }

    // 7. Fallback KM genérico
    if (!understood && normalized.includes('km')) {
       const kmVal = findNumberNear(['km', 'quilometragem']);
       if (kmVal) {
         if (!activeSession) {
           setStartData(prev => ({ ...prev, kmStart: kmVal }));
           msg.push(`KM Inic: ${kmVal}`);
         } else {
           setFinishData(prev => ({ ...prev, kmEnd: kmVal }));
           msg.push(`KM Fin: ${kmVal}`);
         }
         understood = true;
       }
    }

    if (understood) {
      setNotification({ type: 'success', message: `✅ ${msg.join(' | ')}` });
    } else {
      setNotification({ type: 'error', message: 'Não entendi os valores. Fale algo como "Fiz 150 reais e 20 corridas"' });
    }
  };

  useEffect(() => {
    fetchActiveSession();
  }, []);

  const fetchActiveSession = async () => {
    try {
      const res = await fetch('/api/rides?status=open');
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setActiveSession(json.data[0]);
        setFinishData(prev => ({ ...prev, platform: json.data[0].platform }));
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Erro ao buscar sessão ativa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...startData, action: 'start' }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: 'Dia iniciado com sucesso!' });
        fetchActiveSession();
      } else {
        setNotification({ type: 'error', message: json.error });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro na conexão.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFueling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuelData, action: 'add_fueling' }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: 'Abastecimento registrado!' });
        setFuelData({ fuelCost: '', fuelLitres: '', fuelKm: '' });
        fetchActiveSession();
      } else {
        setNotification({ type: 'error', message: json.error });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro na conexão.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(finishData.kmEnd) <= activeSession.kmStart) {
      setNotification({ type: 'error', message: 'KM Final deve ser maior que KM Inicial' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...finishData, action: 'finish' }),
      });
      const json = await res.json();
      if (json.success) {
        setNotification({ type: 'success', message: 'Dia finalizado e salvo com sucesso!' });
        setActiveSession(null);
        fetchActiveSession();
      } else {
        setNotification({ type: 'error', message: json.error });
      }
    } catch (err) {
      setNotification({ type: 'error', message: 'Erro na conexão.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="novo-registro">
      <header className="header">
        <Link href="/" className="back-btn glass">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="title">Registro Diário</h1>
        <button 
          className={`voice-btn glass ${isListening ? 'listening' : ''}`}
          onClick={startListening}
          title="Comando de Voz"
        >
          {isListening ? <Mic className="animate-pulse" /> : <Mic size={20} />}
        </button>
      </header>

      {voiceFeedback && (
        <div className="voice-feedback">
          <p>Você disse: "<span>{voiceFeedback}</span>"</p>
        </div>
      )}

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`notification ${notification.type}`}
          >
            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="form-container">
        {!activeSession ? (
          <motion.form 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleStartShift} 
            className="card animate-in"
          >
            <div className="status-badge start">Início do Dia</div>
            <p className="description">Registre o KM inicial para começar a registrar sua atividade de hoje.</p>
            
            <div className="input-group">
              <label><Navigation size={14} /> KM Inicial</label>
              <input 
                type="number" 
                placeholder="Ex: 45000"
                value={startData.kmStart}
                onChange={e => setStartData({...startData, kmStart: e.target.value})}
                required
                disabled={submitting}
              />
            </div>

            <div className="input-group">
              <label>Tipo de Atividade</label>
              <div className="platform-toggle">
                <button 
                  type="button" 
                  className={`toggle-btn ${startData.platform !== 'Passeio' ? 'active aplicativos' : ''}`}
                  onClick={() => setStartData({...startData, platform: 'Aplicativos'})}
                >Trabalho</button>
                <button 
                  type="button" 
                  className={`toggle-btn ${startData.platform === 'Passeio' ? 'active tour' : ''}`}
                  onClick={() => setStartData({...startData, platform: 'Passeio'})}
                >Passeio</button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Play size={18} />}
              Iniciar Turno
            </button>
          </motion.form>
        ) : (
          <div className="active-session-flow">
            {/* Status do Turno */}
            <div className="card status-summary">
              <div className="status-header">
                <div className="status-badge open">Turno em Aberto</div>
                <span className="date">{new Date(activeSession.date).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="mini-stats">
                <div className="mini-stat">
                  <span className="label">KM Inicial</span>
                  <span className="value">{activeSession.kmStart}</span>
                </div>
                <div className="mini-stat">
                  <span className="label">Abastecimentos</span>
                  <span className="value">{activeSession.fuelings.length}</span>
                </div>
              </div>
            </div>

            {/* Adicionar Abastecimento */}
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddFueling} 
              className="card glass"
            >
              <h2 className="section-title"><Droplets size={18} /> Registrar Abastecimento</h2>
              <div className="input-row">
                <div className="input-group">
                  <label>Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0,00"
                    value={fuelData.fuelCost}
                    onChange={e => setFuelData({...fuelData, fuelCost: e.target.value})}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="input-group">
                  <label>Litros</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    value={fuelData.fuelLitres}
                    onChange={e => setFuelData({...fuelData, fuelLitres: e.target.value})}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="input-group">
                  <label>KM Atual</label>
                  <input 
                    type="number" 
                    placeholder="KM no posto"
                    value={fuelData.fuelKm}
                    onChange={e => setFuelData({...fuelData, fuelKm: e.target.value})}
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <button type="submit" className="btn-secondary" disabled={submitting}>
                <Plus size={18} /> Adicionar Abastecimento
              </button>
            </motion.form>

            {/* Finalizar Dia */}
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleFinishShift} 
              className="card"
            >
              <h2 className="section-title"><Check size={18} /> Finalizar Dia</h2>
              


              <div className="input-row">
                <div className="input-group">
                  <label><Navigation size={14} /> KM Final</label>
                  <input 
                    type="number" 
                    placeholder="KM Final"
                    value={finishData.kmEnd}
                    onChange={e => setFinishData({...finishData, kmEnd: e.target.value})}
                    required
                    disabled={submitting}
                  />
                </div>
                {activeSession.platform !== 'Passeio' && (
                  <div className="input-group">
                    <label><Hash size={14} /> Corridas</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={finishData.rides}
                      onChange={e => setFinishData({...finishData, rides: e.target.value})}
                      required
                      disabled={submitting}
                    />
                  </div>
                )}
              </div>

              {activeSession.platform !== 'Passeio' && (
                <div className="input-group">
                  <label><DollarSign size={14} /> Total de Ganhos (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00"
                    value={finishData.earnings}
                    onChange={e => setFinishData({...finishData, earnings: e.target.value})}
                    required
                    disabled={submitting}
                  />
                </div>
              )}

              {finishData.kmEnd && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="shift-preview glass"
                >
                  <div className="preview-item">
                    <span>KM Total:</span>
                    <strong>{Number(finishData.kmEnd) - activeSession.kmStart} km</strong>
                  </div>

                </motion.div>
              )}

              <button type="submit" className="btn-primary" style={{ marginTop: '10px' }} disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                Encerrar Atividade
              </button>
            </motion.form>
          </div>
        )}
      </div>

      <style jsx>{`
        .novo-registro {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
        }
        .back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: var(--foreground);
          text-decoration: none;
        }
        .title {
          font-size: 1.25rem;
          margin: 0;
        }
        .description {
          margin-bottom: 20px;
          font-size: 0.9rem;
        }
        .section-title {
          font-size: 1rem;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .input-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        .notification {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .notification.success { background: var(--success); }
        .notification.error { background: var(--danger); }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .status-badge.start { background: #dbeafe; color: #1e40af; }
        .status-badge.open { background: #dcfce7; color: #166534; }
        
        .active-session-flow {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .status-summary {
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
          border-color: #bfdbfe;
        }
        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .date { font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .mini-stats { display: flex; gap: 24px; }
        .mini-stat { display: flex; flex-direction: column; }
        .mini-stat .label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; }
        .mini-stat .value { font-size: 1.1rem; font-weight: 800; color: var(--primary); }

        .platform-toggle {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          gap: 4px;
        }
        .toggle-btn {
          flex: 1;
          border: none;
          padding: 10px;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          font-weight: 700;
          cursor: pointer;
        }
        .toggle-btn.active.aplicativos { background: black; color: white; }
        .toggle-btn.active.tour { background: var(--success); color: white; }

        .btn-secondary {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px dashed var(--primary);
          background: var(--primary-glow);
          color: var(--primary);
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .shift-preview {
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(255, 255, 255, 0.5);
        }
        .preview-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.85rem;
        }
        .preview-item strong {
          font-size: 1rem;
        }

        @media (max-width: 480px) {
          .input-row {
            grid-template-columns: 1fr;
          }
          .mini-stats {
            gap: 16px;
          }
          .mini-stat .value {
            font-size: 1rem;
          }
          .card {
            padding: 16px;
          }
        }
        .btn-secondary:hover { background: #dbeafe; }

        .voice-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: var(--primary);
          transition: all 0.3s;
        }
        .voice-btn.listening {
          background: #ef4444;
          color: white;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.4);
        }
        .voice-feedback {
          background: rgba(255, 255, 255, 0.8);
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.8rem;
          text-align: center;
          border: 1px dashed var(--primary);
          margin-bottom: 10px;
        }
        .voice-feedback span {
          font-weight: 700;
          color: var(--primary);
        }
        .animate-pulse {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

