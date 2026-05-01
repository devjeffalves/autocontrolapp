'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, Filter, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Historico() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rides')
      .then(res => res.json())
      .then(data => {
        if (data.success) setHistory(data.data);
        setLoading(false);
      });
  }, []);

  const totalEarnings = history.reduce((acc, curr) => acc + curr.earnings, 0);
  const totalKm = history.reduce((acc, curr) => acc + (curr.kmEnd - curr.kmStart), 0);

  return (
    <div className="historico-page">
      <header className="header">
        <h1 className="title">Histórico</h1>
        <button className="filter-btn glass">
          <Filter size={20} />
        </button>
      </header>

      <section className="summary-banner card">
        <div className="banner-item">
          <p className="banner-label">Ganhos Acumulados</p>
          <p className="banner-value">R$ {totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="banner-divider" />
        <div className="banner-item">
          <p className="banner-label">KM Rodado</p>
          <p className="banner-value">{totalKm.toLocaleString('pt-BR')} km</p>
        </div>
      </section>

      <div className="history-list">
        <AnimatePresence>
          {loading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <p>Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <p className="empty-state">Nenhum registro encontrado.</p>
          ) : (
            history.map((item, index) => (
              <motion.div 
                key={item._id || index} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="history-item glass"
              >
                <div className="history-date">
                  <Calendar size={16} className="text-muted" />
                  <span>{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="history-main">
                  <div className="history-info">
                    <div className={`platform-tag ${item.platform.toLowerCase()}`}>
                      {item.platform}
                    </div>
                    <p className="history-meta">
                    {item.rides} corridas • {(item.kmEnd - item.kmStart).toFixed(1)}km
                    {item.fuelLitres > 0 && ` • ${item.fuelLitres}L`}
                  </p>
                  </div>
                  <div className="history-earnings">
                    <p className="earning-value">R$ {item.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 60px 0;
          color: var(--text-muted);
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        .empty-state { text-align: center; padding: 60px 0; color: var(--text-muted); }
        .historico-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .title {
          font-size: 1.5rem;
          font-weight: 700;
        }

        .filter-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .summary-banner {
          display: flex;
          justify-content: space-around;
          align-items: center;
          background: linear-gradient(135deg, var(--primary), #2563eb);
          padding: 24px;
          border: none;
          box-shadow: 0 10px 25px -5px var(--primary-glow);
        }

        .banner-item {
          text-align: center;
        }

        .banner-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 4px;
        }

        .banner-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .banner-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-date {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 8px;
        }

        .history-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .platform-tag {
          display: inline-block;
          font-size: 0.625rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .platform-tag.uber {
          background: #000;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .platform-tag.99 {
          background: var(--99-color);
          color: var(--99-text);
        }

        .history-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .earning-value {
          font-weight: 700;
          font-size: 1rem;
        }

        .history-earnings {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .text-muted {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
