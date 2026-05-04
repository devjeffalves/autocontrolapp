'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Navigation, Fuel, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2, Pencil, Trash2, X, Save } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const [period, setPeriod] = useState('Semana');
  const [rides, setRides] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

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
  
  // Cálculo de rendimento real (km/L) - soma todos os abastecimentos de todas as corridas
  const totalLitres = closedRides.reduce((acc, curr) => {
    const rideLitres = curr.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.litres || 0), 0) || 0;
    return acc + rideLitres;
  }, 0);

  const totalKmForFuel = closedRides.reduce((acc, curr) => {
    // Só conta KM de corridas que tiveram abastecimento ou que queremos considerar no cálculo
    const hasFuel = curr.fuelings && curr.fuelings.length > 0;
    return hasFuel ? acc + (curr.kmTotal || 0) : acc;
  }, 0);
  
  const realAvgConsumption = totalLitres > 0 
    ? (totalKmForFuel / totalLitres).toFixed(2) 
    : (vehicle?.avgConsumption || 0).toFixed(1);
  
  const stats = [
    { 
      label: 'Ganhos Totais', 
      value: `R$ ${totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      icon: Wallet, 
      trend: '+12%', 
      trendUp: true,
      color: 'var(--success)'
    },
    { 
      label: 'Quilometragem', 
      value: `${totalKm.toFixed(1)} km`, 
      icon: Navigation, 
      trend: '+5%', 
      trendUp: true,
      color: 'var(--primary)'
    },
    { 
      label: 'Consumo Médio', 
      value: `${realAvgConsumption} km/L`, 
      icon: Fuel, 
      trend: '-2%', 
      trendUp: false,
      color: 'var(--warning)'
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
              <p className="alert-desc">Iniciado às {new Date(activeSession.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <Link href="/novo" className="btn-alert">Continuar</Link>
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
              filteredRides.slice(0, 5).map((item, i) => (
                <motion.div 
                  key={item._id || i} 
                  className={`activity-item glass ${isDeleting === item._id ? 'deleting' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={`platform-badge ${item.platform?.toLowerCase() || 'uber'}`}>
                    {item.platform}
                  </div>
                  <div className="activity-info">
                    <p className="activity-value">
                      {item.platform === 'Passeio' 
                        ? 'Lazer / Passeio' 
                        : `R$ ${item.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </p>
                    <p className="activity-meta">
                      {item.kmTotal?.toFixed(1) || 0}km • {new Date(item.date).toLocaleDateString('pt-BR')}
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
              ))
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
                  <div className="form-group full">
                    <label>Tipo / Plataforma</label>
                    <select 
                      value={editingItem.platform} 
                      onChange={e => setEditingItem({...editingItem, platform: e.target.value})}
                    >
                      <option value="Uber">Uber</option>
                      <option value="99">99</option>
                      <option value="Both">Ambas</option>
                      <option value="Passeio">Passeio</option>
                    </select>
                  </div>
                </div>
                
                {editingItem.platform !== 'Passeio' && (
                  <div className="form-grid" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
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
                  </div>
                )}
                
                <button type="submit" className="save-btn">
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

        .platform-badge.uber {
          background: var(--uber-color);
          color: var(--uber-text);
          border: 1px solid rgba(255,255,255,0.2);
        }

        .platform-badge.99 {
          background: var(--99-color);
          color: var(--99-text);
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
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          transition: all 0.2s;
        }

        .btn-alert:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
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
        @media (max-width: 480px) {
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
      `}</style>
    </div>
  );
}
