'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, ChevronLeft, DollarSign, Navigation, Droplets, Hash, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NovoRegistro() {
  const [formData, setFormData] = useState({
    platform: 'Uber',
    rides: '',
    kmStart: '',
    kmEnd: '',
    fuelCost: '',
    fuelLitres: '',
    earnings: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    const kmStartNum = Number(formData.kmStart);
    const kmEndNum = Number(formData.kmEnd);
    const earningsNum = Number(formData.earnings);

    if (kmEndNum <= kmStartNum) {
      setNotification({ type: 'error', message: 'KM Final deve ser maior que KM Inicial' });
      return;
    }

    if (earningsNum <= 0) {
      setNotification({ type: 'error', message: 'Os ganhos devem ser maiores que zero' });
      return;
    }

    setSubmitting(true);
    setNotification(null);
    
    try {
      const response = await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rides: Number(formData.rides),
          kmStart: kmStartNum,
          kmEnd: kmEndNum,
          earnings: earningsNum,
          fuelCost: formData.fuelCost ? Number(formData.fuelCost) : 0,
          fuelLitres: formData.fuelLitres ? Number(formData.fuelLitres) : 0,
        }),
      });

      if (response.ok) {
        setNotification({ type: 'success', message: 'Registro salvo com sucesso!' });
        setFormData({
          platform: 'Uber',
          rides: '',
          kmStart: formData.kmEnd, // Preencher com o último KM
          kmEnd: '',
          fuelCost: '',
          fuelLitres: '',
          earnings: '',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Limpar notificação após 3 segundos
        setTimeout(() => setNotification(null), 3000);
      } else {
        const error = await response.json();
        setNotification({ type: 'error', message: 'Erro ao salvar: ' + error.error });
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro na conexão com o servidor.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="novo-registro">
      <header className="header">
        <Link href="/" className="back-btn glass">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="title">Novo Registro</h1>
        <div style={{ width: 40 }} /> {/* Spacer */}
      </header>

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

      <form onSubmit={handleSubmit} className="form-container">
        <div className="card glass-form">
          <div className="input-group">
            <label>Plataforma</label>
            <div className="platform-toggle">
              <button 
                type="button" 
                className={`toggle-btn uber ${formData.platform === 'Uber' ? 'active' : ''}`}
                onClick={() => setFormData(p => ({ ...p, platform: 'Uber' }))}
                disabled={submitting}
              >
                Uber
              </button>
              <button 
                type="button" 
                className={`toggle-btn ninety-nine ${formData.platform === '99' ? 'active' : ''}`}
                onClick={() => setFormData(p => ({ ...p, platform: '99' }))}
                disabled={submitting}
              >
                99
              </button>
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label><Hash size={14} /> Corridas</label>
              <input 
                type="number" 
                name="rides" 
                placeholder="0" 
                value={formData.rides}
                onChange={handleChange}
                required
                disabled={submitting}
              />
            </div>
            <div className="input-group">
              <label><DollarSign size={14} /> Ganhos</label>
              <input 
                type="number" 
                step="0.01" 
                name="earnings" 
                placeholder="0,00"
                value={formData.earnings}
                onChange={handleChange}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label><Navigation size={14} /> KM Inicial</label>
              <input 
                type="number" 
                name="kmStart" 
                placeholder="0"
                value={formData.kmStart}
                onChange={handleChange}
                required
                disabled={submitting}
              />
            </div>
            <div className="input-group">
              <label><Navigation size={14} /> KM Final</label>
              <input 
                type="number" 
                name="kmEnd" 
                placeholder="0"
                value={formData.kmEnd}
                onChange={handleChange}
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label><Droplets size={14} /> Custo Combustível</label>
              <input 
                type="number" 
                step="0.01" 
                name="fuelCost" 
                placeholder="R$ 0,00"
                value={formData.fuelCost}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
            <div className="input-group">
              <label><Droplets size={14} /> Litros Abastecidos</label>
              <input 
                type="number" 
                step="0.01" 
                name="fuelLitres" 
                placeholder="0.00 L"
                value={formData.fuelLitres}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="input-group">
            <label>Data</label>
            <input 
              type="date" 
              name="date" 
              value={formData.date}
              onChange={handleChange}
              required
              disabled={submitting}
            />
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            type="submit" 
            className="btn-primary submit-btn"
            disabled={submitting}
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {submitting ? 'Salvando...' : 'Salvar Atividade'}
          </motion.button>
        </div>
      </form>

      <style jsx>{`
        .novo-registro {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
        }

        .notification {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
          margin-top: -12px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }

        .notification.success {
          background: var(--success);
          color: white;
        }

        .notification.error {
          background: var(--danger);
          color: white;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .back-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .glass-form {
          border: 1px solid var(--glass-border);
          padding: clamp(16px, 5vw, 28px);
          background: linear-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .platform-toggle {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          padding: 6px;
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
        }

        .toggle-btn {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-weight: 800;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toggle-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-btn.active.uber {
          background: white;
          color: black;
          box-shadow: 0 4px 12px rgba(255,255,255,0.2);
        }

        .toggle-btn.active.ninety-nine {
          background: var(--99-color);
          color: var(--99-text);
          box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 400px) {
          .input-row {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        .input-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          font-size: 0.75rem;
        }

        .submit-btn {
          width: 100%;
          margin-top: 12px;
          padding: 16px;
          font-size: 1rem;
          box-shadow: 0 10px 20px -5px var(--primary-glow);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
