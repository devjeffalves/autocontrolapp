'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, Filter, Loader2, Pencil, Trash2, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Historico() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rides');
      const data = await res.json();
      if (data.success) setHistory(data.data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/rides/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setHistory(history.filter(item => item._id !== id));
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
        setHistory(history.map(item => item._id === editingItem._id ? data.data : item));
        setEditingItem(null);
      } else {
        alert('Erro ao atualizar: ' + data.error);
      }
    } catch (error) {
      alert('Erro na requisição de atualização');
    }
  };

  const totalEarnings = history.reduce((acc, curr) => acc + (curr.earnings || 0), 0);
  const totalKm = history.reduce((acc, curr) => acc + ((curr.kmEnd || 0) - curr.kmStart), 0);

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
        <AnimatePresence mode="popLayout">
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
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={`history-item glass ${isDeleting === item._id ? 'deleting' : ''}`}
              >
                <div className="history-date">
                  <div className="date-group">
                    <Calendar size={14} className="text-muted" />
                    <span>{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="actions">
                    <button className="action-btn edit" onClick={() => setEditingItem(item)}>
                      <Pencil size={14} />
                    </button>
                    <button className="action-btn delete" onClick={() => handleDelete(item._id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="history-main">
                  <div className="history-info">
                    <div className={`platform-tag ${item.platform?.toLowerCase() || 'uber'}`}>
                      {item.platform === 'Both' ? 'Ambas' : item.platform}
                    </div>
                    <p className="history-meta">
                      {item.platform === 'Passeio' 
                        ? `${((item.kmEnd || 0) - item.kmStart).toFixed(1)}km percorridos`
                        : `${item.rides} corridas • ${((item.kmEnd || 0) - item.kmStart).toFixed(1)}km`
                      }
                      {item.fuelings?.length > 0 && ` • ${item.fuelings.length} Abast.`}
                    </p>
                  </div>
                  <div className="history-earnings">
                    <p className="earning-value">
                      {item.platform === 'Passeio' ? 'Lazer' : `R$ ${item.earnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    </p>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

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
          padding-bottom: 40px;
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
          transition: all 0.3s ease;
        }

        .history-item.deleting {
          opacity: 0.5;
          transform: scale(0.98);
        }

        .history-date {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
          padding-bottom: 8px;
        }

        .date-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .actions {
          display: flex;
          gap: 8px;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
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

        .platform-tag.passeio {
          background: var(--success);
          color: white;
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

        @media (max-width: 480px) {
          .header {
            margin-bottom: 10px;
          }
          .title {
            font-size: 1.25rem;
          }
          .summary-banner {
            padding: 16px;
            gap: 12px;
          }
          .banner-value {
            font-size: 1.1rem;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full {
            grid-column: span 1;
          }
          .modal-content {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
