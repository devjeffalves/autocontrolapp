'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Navigation, Fuel, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Pencil, Trash2, X, Save, Sparkles, Send, Bot, MessageSquare, Mic, MicOff, Volume2, Square, Clock } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [period, setPeriod] = useState('Semana');
  const [rides, setRides] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // AI Assistant States
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiListening, setIsAiListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);

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
      // Enviar automaticamente após um pequeno delay para o usuário ver o texto
      setTimeout(() => {
        handleSendMessageDirect(transcript);
      }, 500);
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
    if (!('speechSynthesis' in window)) {
      alert('Seu navegador não suporta leitura de texto.');
      return;
    }

    if (isSpeaking === msgId) {
      window.speechSynthesis.cancel();
      setIsSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '') // Emojis
      .replace(/\*\*|\*/g, '') // Markdown
      .replace(/[#/_\\-]/g, ' ') // Caracteres especiais por espaço
      .replace(/\s+/g, ' ') // Espaços duplos
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.lang.includes('pt') && 
      (v.name.toLowerCase().includes('maria') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('female'))
    );
    
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.pitch = 1.15;
    utterance.rate = 1.25; // Velocidade mais natural e amigável

    utterance.onstart = () => setIsSpeaking(msgId);
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ridesRes, vehicleRes] = await Promise.all([
          fetch('/api/rides'),
          fetch('/api/vehicle')
        ]);
        
        const ridesData = ridesRes.headers.get('content-type')?.includes('application/json') 
          ? await ridesRes.json() 
          : { success: false, error: 'Resposta não é JSON' };
          
        const vehicleData = vehicleRes.headers.get('content-type')?.includes('application/json') 
          ? await vehicleRes.json() 
          : { success: false, error: 'Resposta não é JSON' };

        if (ridesData.success) setRides(ridesData.data);
        if (vehicleData.success) setVehicle(vehicleData.data);
        
        if (!ridesData.success || !vehicleData.success) {
          console.warn('Alguns dados não foram carregados corretamente:', { ridesData, vehicleData });
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCancelSession = async (id: string) => {
    if (!confirm('Deseja realmente cancelar esta sessão? Todos os dados não salvos serão perdidos.')) return;
    
    try {
      const res = await fetch(`/api/rides/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRides(rides.filter(item => item._id !== id));
      } else {
        alert('Erro ao cancelar: ' + data.error);
      }
    } catch (error) {
      alert('Erro na requisição');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/rides/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRides(rides.filter(item => item._id !== id));
      } else {
        alert('Erro ao excluir: ' + data.error);
      }
    } catch (error) {
      alert('Erro na requisição de exclusão');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/rides/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });
      const data = await res.json();
      if (data.success) {
        setRides(rides.map(item => item._id === editingItem._id ? data.data : item));
        setEditingItem(null);
      } else {
        alert('Erro ao atualizar: ' + data.error);
      }
    } catch (error) {
      alert('Erro na requisição de atualização');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleSendMessageDirect(aiMessage);
  };

  // Filtragem por período (apenas sessões fechadas para as estatísticas principais)
  const closedRides = rides.filter(r => r.status === 'closed');
  const activeSession = rides.find(r => r.status === 'open');

  const filteredRides = closedRides.filter(ride => {
    const rideDate = new Date(ride.date);
    const now = new Date();
    if (period === 'Dia') {
      return rideDate.toDateString() === now.toDateString();
    } else if (period === 'Semana') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return rideDate >= weekAgo;
    } else if (period === 'Mês') {
      return rideDate.getMonth() === now.getMonth() && rideDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Cálculos baseados nos dados filtrados
  const totalEarnings = filteredRides.reduce((acc, curr) => acc + (curr.earnings || 0), 0);
  const totalKm = filteredRides.reduce((acc, curr) => acc + (curr.kmTotal || 0), 0);
  
  // Cálculo de custo de combustível no período filtrado (para exibir como gasto real, se necessário)
  const totalFuelCost = filteredRides.reduce((acc, curr) => {
    const rideCost = curr.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.cost || 0), 0) || 0;
    return acc + rideCost;
  }, 0);

  // Calcula o preço médio do combustível baseado em todo o histórico
  let totalFuelCostForAvg = 0;
  let totalLitresForAvg = 0;
  rides.forEach(r => {
    r.fuelings?.forEach((f: any) => {
      totalFuelCostForAvg += (f.cost || 0);
      totalLitresForAvg += (f.litres || 0);
    });
  });
  const avgFuelPrice = totalLitresForAvg > 0 ? (totalFuelCostForAvg / totalLitresForAvg) : 5.50;

  // Cálculo de rendimento real (km/L) - soma todos os abastecimentos
  const totalLitres = filteredRides.reduce((acc, curr) => {
    const rideLitres = curr.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.litres || 0), 0) || 0;
    return acc + rideLitres;
  }, 0);

  // Consumo acumulado real do período: KM total do período / Litros totais abastecidos
  const calculatedAvgConsumption = totalLitres > 0 ? (totalKm / totalLitres) : 0;
  
  // Consumo é consistente se estiver em uma faixa física realista (ex: entre 6 e 22 km/L)
  const isConsumptionInconsistent = totalLitres > 0 && (calculatedAvgConsumption < 6 || calculatedAvgConsumption > 22);
  
  // Para cálculos financeiros, se estiver inconsistente, usamos fallback da média cadastrada do veículo
  const realAvgConsumptionNum = (totalLitres > 0 && !isConsumptionInconsistent)
    ? calculatedAvgConsumption
    : (vehicle?.avgConsumption || 14.5);
    
  // Exibimos a média calculada para que o usuário veja a discrepância se houver litros, 
  // ou a média do veículo se não houver registros de litros.
  const displayAvgConsumptionNum = totalLitres > 0 ? calculatedAvgConsumption : (vehicle?.avgConsumption || 14.5);
  const realAvgConsumption = displayAvgConsumptionNum.toFixed(1);

  // Custo estimado de combustível para a distância percorrida no período
  const estimatedFuelCost = totalKm > 0 ? (totalKm / realAvgConsumptionNum) * avgFuelPrice : 0;
  
  // Cálculo de carga horária acumulada no período filtrado
  const totalMinutes = filteredRides.reduce((acc, curr) => {
    if (curr.startTime && curr.endTime) {
      const diffMs = new Date(curr.endTime).getTime() - new Date(curr.startTime).getTime();
      const diffMin = Math.round(diffMs / 60000);
      return acc + (diffMin > 0 ? diffMin : 0);
    }
    return acc;
  }, 0);

  const formatDuration = (totalMin: number) => {
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatForDateTimeInput = (dateVal: any) => {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };
  
  const netProfit = totalEarnings - estimatedFuelCost;
  const profitPerKm = totalKm > 0 ? netProfit / totalKm : 0;

  // Lógica de Projeção do Próximo Abastecimento
  let lastFueling: any = null;
  const allRides = rides;
  for (const ride of allRides) {
    if (ride.fuelings && ride.fuelings.length > 0) {
      const sortedFuelings = [...ride.fuelings].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const found = sortedFuelings.find((f: any) => f.km && f.km > 0 && f.litres > 0);
      if (found) {
        lastFueling = found;
        break;
      }
    }
  }

  let projection: { nextFuelingKm: number; kmRemaining: number; status: 'ok' | 'warning' | 'urgent' } | null = null;
  if (lastFueling && vehicle) {
    const nextFuelingKm = lastFueling.km + (lastFueling.litres * realAvgConsumptionNum);
    const kmRemaining = nextFuelingKm - vehicle.currentKm;
    
    let status: 'ok' | 'warning' | 'urgent' = 'ok';
    if (kmRemaining <= 0) {
      status = 'urgent';
    } else if (kmRemaining < 50) {
      status = 'warning';
    }
    
    projection = {
      nextFuelingKm: Math.round(nextFuelingKm),
      kmRemaining: Math.round(kmRemaining),
      status
    };
  }
  
  const stats = [
    { 
      label: 'Lucro Real', 
      value: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: TrendingUp, 
      trend: `${totalEarnings > 0 ? ((netProfit / totalEarnings) * 100).toFixed(0) : 0}% margem`, 
      trendUp: netProfit > 0,
      color: 'var(--success)'
    },
    { 
      label: 'Ganhos', 
      value: `R$ ${totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: Wallet, 
      trend: `R$ ${estimatedFuelCost.toFixed(2)} custo estimado`, 
      trendUp: false,
      color: 'var(--primary)'
    },
    { 
      label: 'Km Rodados', 
      value: `${totalKm.toFixed(1)} km`, 
      icon: Navigation, 
      trend: `R$ ${profitPerKm.toFixed(2)}/km`, 
      trendUp: true,
      color: 'var(--warning)'
    },
    { 
      label: 'Tempo Rodado', 
      value: formatDuration(totalMinutes), 
      icon: Clock, 
      trend: `${period}: ${(totalMinutes / 60).toFixed(1)}h`, 
      trendUp: true,
      color: '#ec4899'
    },
    { 
      label: 'Consumo Real', 
      value: `${realAvgConsumption} km/L`, 
      icon: Fuel, 
      trend: isConsumptionInconsistent ? 'Dados incompletos' : period, 
      trendUp: !isConsumptionInconsistent,
      color: isConsumptionInconsistent ? 'var(--warning)' : '#8b5cf6'
    },
  ];

  return (
    <div className="dashboard">
      <header className="header">
        <div>
          <p className="greeting">Olá, {vehicle?.model || 'Motorista'}</p>
          <h1 className="title">Seu Resumo</h1>
        </div>
        <div className="period-selector glass">
          {['Dia', 'Semana', 'Mês'].map((p) => (
            <button 
              key={p} 
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </header>

      {activeSession && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="active-alert card"
        >
          <div className="alert-content">
            <div className="pulse-icon" />
            <div>
              <h3 className="alert-title">Turno em andamento</h3>
              <p className="alert-desc">Iniciado às {new Date(activeSession.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {activeSession.kmStart} KM</p>
            </div>
          </div>
          <div className="alert-actions">
            <button onClick={() => handleCancelSession(activeSession._id)} className="btn-cancel">Cancelar</button>
            <Link href="/novo" className="btn-alert">Continuar</Link>
          </div>
        </motion.div>
      )}

      {isConsumptionInconsistent && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="active-alert card warning"
          style={{ 
            borderColor: 'var(--warning)', 
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 0.7) 100%)',
            marginBottom: '10px'
          }}
        >
          <div className="alert-content">
            <div className="pulse-icon" style={{ backgroundColor: 'var(--warning)' }} />
            <div>
              <h3 className="alert-title" style={{ color: '#d97706' }}>Inconsistência nos abastecimentos</h3>
              <p className="alert-desc" style={{ color: 'var(--text-muted)' }}>
                A média calculada de {realAvgConsumption} km/L está fora do padrão para o seu veículo. 
                Certifique-se de registrar todos os abastecimentos no período para obter estatísticas precisas de custos.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <section className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div 
            key={stat.label}
            className="stat-card card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="stat-header">
              <div className="stat-icon" style={{ backgroundColor: stat.color + '20', color: stat.color }}>
                <stat.icon size={20} />
              </div>
              <div className={`stat-trend ${stat.trendUp ? 'up' : 'down'}`}>
                {stat.trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.trend}
              </div>
            </div>
            <div className="stat-body">
              <p className="stat-label">{stat.label}</p>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
          </motion.div>
        ))}
      </section>

      <section className="chart-section card">
        <div className="section-header">
          <h3 className="section-title">Desempenho Semanal</h3>
          <TrendingUp size={18} className="text-muted" />
        </div>
        <div className="chart-placeholder">
          <div className="bars-container">
            {[40, 70, 45, 90, 65, 80, 55].map((height, i) => (
              <motion.div 
                key={i} 
                className="bar" 
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.5 + (i * 0.05), duration: 0.8 }}
              />
            ))}
          </div>
          <div className="chart-labels">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => <span key={`${day}-${i}`}>{day}</span>)}
          </div>
        </div>
      </section>

      {projection && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`dashboard-projection glass ${projection.status}`}
        >
          <div className="proj-header">
            <div>
              <h4 className="proj-title">Projeção de Próximo Abastecimento</h4>
              <p className="proj-value">Projetado para {projection.nextFuelingKm.toLocaleString('pt-BR')} KM</p>
            </div>
            <div>
              {projection.kmRemaining > 0 ? (
                <p className="proj-remaining">
                  Faltam aprox. <strong>{projection.kmRemaining} km</strong>
                </p>
              ) : (
                <p className="proj-remaining danger">
                  Abasteça! Passou <strong>{Math.abs(projection.kmRemaining)} km</strong>
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <section className="recent-activity">
        <div className="section-header">
          <h3 className="section-title">Atividades Recentes</h3>
          <Link href="/historico" className="view-all">Ver tudo</Link>
        </div>
        <div className="activity-list">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="loading-state">
                <Loader2 className="animate-spin" />
                <p>Carregando atividades...</p>
              </div>
            ) : filteredRides.length === 0 ? (
              <p className="empty-state">Nenhuma atividade registrada no período.</p>
            ) : (
              filteredRides.slice(0, 5).map((item, i) => {
                const itemKm = item.kmTotal || 0;
                let rideFuelPrice = avgFuelPrice;
                const rideFuelCost = item.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.cost || 0), 0) || 0;
                const rideFuelLitres = item.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.litres || 0), 0) || 0;
                if (rideFuelLitres > 0) {
                  rideFuelPrice = rideFuelCost / rideFuelLitres;
                }
                const fuelCostConsumed = (itemKm / realAvgConsumptionNum) * rideFuelPrice;
                const lucroReal = (item.earnings || 0) - fuelCostConsumed;

                return (
                  <motion.div 
                    key={item._id || i} 
                    className={`activity-item glass ${isDeleting === item._id ? 'deleting' : ''}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className={`platform-badge ${item.platform?.toLowerCase() === 'passeio' ? 'passeio' : 'aplicativos'}`}>
                      {item.platform}
                    </div>
                    <div className="activity-info">
                      <p className="activity-value">
                        {item.platform === 'Passeio' 
                          ? 'Lazer / Passeio' 
                          : `R$ ${item.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        }
                        {item.platform !== 'Passeio' && (
                          <span className={`lucro-badge ${lucroReal >= 0 ? 'positive' : 'negative'}`}>
                            Lucro: R$ {lucroReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </p>
                      <p className="activity-meta">
                        {itemKm.toFixed(1)}km • {new Date(item.date).toLocaleDateString('pt-BR')}
                        {item.fuelings?.length > 0 && ` • ${item.fuelings.length} Abast. (R$ ${rideFuelCost.toFixed(2)})`}
                        {item.platform !== 'Passeio' && ` • Consumo: ${(itemKm / realAvgConsumptionNum).toFixed(1)}L`}
                      </p>
                    </div>
                    <div className="activity-actions">
                      <button className="action-btn edit" onClick={() => setEditingItem(item)}>
                        <Pencil size={14} />
                      </button>
                      <button className="action-btn delete" onClick={() => handleDelete(item._id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
    

        </div>
      </section>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingItem && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="modal-content card"
            >
              <div className="modal-header">
                <h3 className="modal-title">Editar Registro</h3>
                <button className="close-btn" onClick={() => setEditingItem(null)}>
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleUpdate} className="edit-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Ganhos (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={editingItem.earnings} 
                      onChange={e => setEditingItem({...editingItem, earnings: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Corridas</label>
                    <input 
                      type="number" 
                      value={editingItem.rides} 
                      onChange={e => setEditingItem({...editingItem, rides: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>KM Inicial</label>
                    <input 
                      type="number" 
                      value={editingItem.kmStart} 
                      onChange={e => setEditingItem({...editingItem, kmStart: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>KM Final</label>
                    <input 
                      type="number" 
                      value={editingItem.kmEnd || ''} 
                      onChange={e => setEditingItem({...editingItem, kmEnd: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Início do Turno</label>
                    <input 
                      type="datetime-local" 
                      value={formatForDateTimeInput(editingItem.startTime)} 
                      onChange={e => setEditingItem({...editingItem, startTime: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fim do Turno</label>
                    <input 
                      type="datetime-local" 
                      value={formatForDateTimeInput(editingItem.endTime)} 
                      onChange={e => setEditingItem({...editingItem, endTime: e.target.value})}
                    />
                  </div>
                  <div className="form-group full">
                    <label>Tipo / Plataforma</label>
                    <select 
                      value={editingItem.platform} 
                      onChange={e => setEditingItem({...editingItem, platform: e.target.value})}
                    >
                      <option value="Aplicativos">Aplicativos</option>
                      <option value="Passeio">Passeio</option>
                    </select>
                  </div>
                </div>

                {/* Seção de Abastecimentos no Modal */}
                <div className="modal-fuelings-section">
                  <h4 className="fuelings-title">Abastecimentos do Turno</h4>
                  
                  <div className="modal-fuelings-list">
                    {!editingItem.fuelings || editingItem.fuelings.length === 0 ? (
                      <p className="no-fuelings">Nenhum abastecimento associado.</p>
                    ) : (
                      editingItem.fuelings.map((f: any, fIdx: number) => (
                        <div key={fIdx} className="modal-fueling-item">
                          <span>R$ {f.cost.toFixed(2)} • {f.litres}L {f.km ? `• ${f.km} KM` : ''}</span>
                          <button 
                            type="button" 
                            className="remove-fueling-btn"
                            onClick={() => {
                              const updatedFuelings = [...editingItem.fuelings];
                              updatedFuelings.splice(fIdx, 1);
                              setEditingItem({ ...editingItem, fuelings: updatedFuelings });
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="add-fueling-quick">
                    <h5>Adicionar Abastecimento</h5>
                    <div className="quick-inputs">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="R$ 0,00"
                        id="quick-cost-dash"
                      />
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00 L"
                        id="quick-litres-dash"
                      />
                      <input 
                        type="number" 
                        placeholder="KM no posto"
                        id="quick-km-dash"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const costEl = document.getElementById('quick-cost-dash') as HTMLInputElement;
                          const litresEl = document.getElementById('quick-litres-dash') as HTMLInputElement;
                          const kmEl = document.getElementById('quick-km-dash') as HTMLInputElement;
                          
                          if (costEl && litresEl) {
                            const cost = parseFloat(costEl.value);
                            const litres = parseFloat(litresEl.value);
                            const km = kmEl.value ? parseInt(kmEl.value) : undefined;
                            
                            if (cost > 0 && litres > 0) {
                              const newF = {
                                cost,
                                litres,
                                km,
                                date: new Date()
                              };
                              const updatedFuelings = [...(editingItem.fuelings || []), newF];
                              setEditingItem({ ...editingItem, fuelings: updatedFuelings });
                              
                              costEl.value = '';
                              litresEl.value = '';
                              kmEl.value = '';
                            } else {
                              alert('Preencha Valor e Litros.');
                            }
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="save-btn" style={{ marginTop: '10px' }}>
                  <Save size={18} />
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
 


 

 



      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px;
          color: var(--text-muted);
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-muted);
          font-style: italic;
        }
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 10px;
        }

        .greeting {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 4px;
        }

        .title {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .period-selector {
          display: flex;
          padding: 4px;
          border-radius: 12px;
        }

        .period-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .period-btn.active {
          background: var(--primary);
          color: white;
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .stat-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .stat-trend.up { color: var(--success); }
        .stat-trend.down { color: var(--warning); }

        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 2px;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
        }

        .chart-placeholder {
          height: 120px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          gap: 12px;
        }

        .bars-container {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          height: 80px;
          padding: 0 10px;
        }

        .bar {
          width: 12%;
          background: linear-gradient(to top, var(--primary), var(--primary-glow));
          border-radius: 4px 4px 0 0;
        }

        .chart-labels {
          display: flex;
          justify-content: space-between;
          padding: 0 10px;
          font-size: 0.625rem;
          color: var(--text-muted);
        }

        .view-all {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .activity-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          gap: 16px;
        }

        .platform-badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.625rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .platform-badge.aplicativos {
          background: #000;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }


        .platform-badge.passeio {
          background: var(--success);
          color: white;
        }

        .activity-info {
          flex: 1;
        }

        .activity-value {
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .activity-meta {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .text-muted {
          color: var(--text-muted);
        }

        /* Active Alert Styles */
        .active-alert {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(135deg, #eff6ff 0%, #ffffff 100%);
          border: 1px solid #bfdbfe;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.1);
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .pulse-icon {
          width: 12px;
          height: 12px;
          background: var(--success);
          border-radius: 50%;
          position: relative;
        }

        .pulse-icon::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          background: var(--success);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          70% { transform: scale(2.5); opacity: 0; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .alert-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #1e40af;
          margin-bottom: 2px;
        }

        .alert-desc {
          font-size: 0.8125rem;
          color: #60a5fa;
          font-weight: 600;
        }

        .btn-alert {
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-alert:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }

        .alert-actions {
          display: flex;
          gap: 10px;
        }

        .btn-cancel {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cancel:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fecaca;
        }

        .activity-item.deleting {
          opacity: 0.5;
          transform: scale(0.98);
        }

        .activity-actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.2s;
          color: var(--text-muted);
        }

        .action-btn.edit:hover {
          background: #dcfce7;
          color: #166534;
          border-color: #bbf7d0;
        }

        .action-btn.delete:hover {
          background: #fee2e2;
          color: #991b1b;
          border-color: #fecaca;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 450px;
          padding: 24px;
          background: white;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 700;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group.full {
          grid-column: span 2;
        }

        .form-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .form-group input, .form-group select {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          background: #f8fafc;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .save-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .save-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        /* Responsividade Adicional */
        /* AI Assistant Styles */
        .ai-fab {
          position: fixed;
          bottom: 100px;
          right: 20px;
          width: 56px;
          height: 56px;
          border-radius: 50% !important;
          background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
          cursor: pointer;
          z-index: 900;
        }

        .ai-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(8px);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
        }

        .ai-chat-drawer {
          width: 100%;
          max-width: 400px;
          height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        }

        .ai-chat-header {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }

        .ai-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ai-title h3 {
          font-size: 1rem;
          font-weight: 700;
          margin: 0;
        }

        .online-status {
          font-size: 0.7rem;
          color: var(--success);
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .online-status::before {
          content: '';
          width: 6px;
          height: 6px;
          background: var(--success);
          border-radius: 50%;
        }

        .ai-icon-pulse {
          width: 40px;
          height: 40px;
          background: var(--primary-glow);
          color: var(--primary);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-ai {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #f8fafc;
          padding-bottom: 30px;
        }

        .chat-bubble-container {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          max-width: 90%;
        }

        .chat-bubble-container.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-bubble-container.assistant {
          align-self: flex-start;
        }

        .speak-btn {
          margin-top: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          color: var(--primary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .speak-btn:hover {
          background: var(--primary-glow);
          transform: scale(1.1);
        }

        .speak-btn.speaking {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fecaca;
        }

        .ai-welcome {
          text-align: center;
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .ai-suggestions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
          margin-top: 20px;
        }

        .ai-suggestions button {
          padding: 12px;
          background: white;
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-suggestions button:hover {
          background: var(--primary-glow);
          border-color: var(--primary);
        }

        .chat-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .chat-bubble.user {
          align-self: flex-end;
          background: var(--primary);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .chat-bubble.assistant {
          align-self: flex-start;
          background: white;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
        }

        .chat-bubble.loading {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
        }

          .header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .period-selector {
            width: 100%;
            justify-content: space-between;
          }
          .period-btn {
            flex: 1;
            text-align: center;
          }
          .stats-grid {
            grid-template-columns: 1fr;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full {
            grid-column: span 1;
          }
        }

        /* Projeção no Dashboard */
        .dashboard-projection {
          margin-bottom: 24px;
          padding: 16px 20px;
          border-radius: 16px;
          border-left: 4px solid var(--primary);
        }
        .dashboard-projection.warning {
          border-left-color: var(--warning);
        }
        .dashboard-projection.urgent {
          border-left-color: var(--danger);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.5) 100%);
        }
        .proj-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .proj-title {
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .proj-value {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
        }
        .proj-remaining {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .proj-remaining strong {
          color: var(--primary);
          font-size: 0.95rem;
        }
        .proj-remaining.danger {
          color: #ef4444;
          font-weight: 700;
        }
        .proj-remaining.danger strong {
          color: #ef4444;
        }

        /* Lucro Badge */
        .lucro-badge {
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 800;
          margin-left: 10px;
        }
        .lucro-badge.positive {
          background: #dcfce7;
          color: #166534;
        }
        .lucro-badge.negative {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Modal Abastecimentos */
        .modal-fuelings-section {
          border-top: 1px solid var(--glass-border);
          padding-top: 16px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fuelings-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .modal-fuelings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 120px;
          overflow-y: auto;
        }
        .no-fuelings {
          font-size: 0.8rem;
          color: var(--text-muted);
          font-style: italic;
        }
        .modal-fueling-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid #f1f5f9;
        }
        .remove-fueling-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }
        .remove-fueling-btn:hover {
          color: #991b1b;
        }
        .add-fueling-quick {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          border: 1px dashed var(--glass-border);
        }
        .add-fueling-quick h5 {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .quick-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .quick-inputs input {
          padding: 6px 8px !important;
          font-size: 0.75rem !important;
          font-weight: 600;
          border-radius: 6px !important;
        }
        .quick-inputs button {
          background: var(--primary);
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .quick-inputs button:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
