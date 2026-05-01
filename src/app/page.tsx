'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Navigation, Fuel, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [period, setPeriod] = useState('Semana');
  const [rides, setRides] = useState<any[]>([]);
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // Filtragem por período
  const filteredRides = rides.filter(ride => {
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
  const totalEarnings = filteredRides.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalKm = filteredRides.reduce((acc, curr) => acc + (curr.kmEnd - curr.kmStart), 0);
  
  // Cálculo de rendimento real (km/L)
  const ridesWithFuel = rides.filter(r => r.fuelLitres > 0);
  const totalKmWithFuel = ridesWithFuel.reduce((acc, curr) => acc + (curr.kmEnd - curr.kmStart), 0);
  const totalLitres = ridesWithFuel.reduce((acc, curr) => acc + curr.fuelLitres, 0);
  
  const realAvgConsumption = totalLitres > 0 
    ? (totalKmWithFuel / totalLitres).toFixed(2) 
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
          {/* Visual representation of a chart using divs */}
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
          <button className="view-all">Ver tudo</button>
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
                  className="activity-item glass"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className={`platform-badge ${item.platform.toLowerCase()}`}>
                    {item.platform}
                  </div>
                  <div className="activity-info">
                    <p className="activity-value">R$ {item.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="activity-meta">
                      {(item.kmEnd - item.kmStart).toFixed(1)}km • {new Date(item.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <ArrowUpRight size={18} className="text-muted" />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </section>

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
      `}</style>
    </div>
  );
}
