'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  X, 
  Calculator, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  HelpCircle,
  RefreshCw,
  Gauge,
  TrendingUp,
  Clock,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { RideEvaluationResult } from '@/lib/rideEvaluator';

interface RideEvaluatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function RideEvaluatorCard({ isOpen = true, onClose, isEmbedded = false }: RideEvaluatorProps) {
  const [price, setPrice] = useState<string>('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [timeMinutes, setTimeMinutes] = useState<string>('');
  const [freeText, setFreeText] = useState<string>('');
  const [inputMode, setInputMode] = useState<'fields' | 'text'>('fields');

  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<RideEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEvaluate = async (overrideText?: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let bodyData: any = {};
      if (inputMode === 'text' || overrideText) {
        bodyData = { text: overrideText || freeText };
      } else {
        bodyData = {
          price: parseFloat(price.replace(',', '.')) || 0,
          distanceKm: parseFloat(distanceKm.replace(',', '.')) || 0,
          timeMinutes: parseInt(timeMinutes, 10) || 0,
        };
      }

      const res = await fetch('/api/evaluate-ride', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setEvaluation(data.data);
        // Atualizar campos caso tenha sido parsed via texto livre
        if (inputMode === 'text' || overrideText) {
          if (data.data.price) setPrice(data.data.price.toString());
          if (data.data.distanceKm) setDistanceKm(data.data.distanceKm.toString());
          if (data.data.timeMinutes) setTimeMinutes(data.data.timeMinutes.toString());
        }
      } else {
        setErrorMsg(data.error || 'Não foi possível avaliar esta corrida.');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao avaliar corrida.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPrice('');
    setDistanceKm('');
    setTimeMinutes('');
    setFreeText('');
    setEvaluation(null);
    setErrorMsg(null);
  };

  const content = (
    <div className={`ride-evaluator-box ${isEmbedded ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="eval-header">
        <div className="eval-title-group">
          <div className="eval-icon-pulse">
            <Zap size={20} />
          </div>
          <div>
            <h3>Semáforo de Ofertas</h3>
            <p>Avalie se uma corrida vale a pena em segundos</p>
          </div>
        </div>

        {onClose && !isEmbedded && (
          <button onClick={onClose} className="close-eval-btn" title="Fechar">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="eval-mode-switcher">
        <button
          onClick={() => setInputMode('fields')}
          className={`mode-btn ${inputMode === 'fields' ? 'active' : ''}`}
        >
          Campos Rápidos
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
        >
          Colar Texto
        </button>
      </div>

      {/* Input Section */}
      {inputMode === 'fields' ? (
        <div className="eval-fields-grid">
          <div className="input-field">
            <label>Valor R$</label>
            <div className="input-with-prefix">
              <span>R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="25.50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="input-field">
            <label>Distância KM</label>
            <div className="input-with-prefix">
              <input
                type="number"
                step="0.1"
                placeholder="8.5"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
              <span className="suffix">km</span>
            </div>
          </div>

          <div className="input-field">
            <label>Tempo Estimado</label>
            <div className="input-with-prefix">
              <input
                type="number"
                placeholder="15"
                value={timeMinutes}
                onChange={(e) => setTimeMinutes(e.target.value)}
              />
              <span className="suffix">min</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="eval-text-input">
          <textarea
            placeholder="Ex: R$ 25.50 por 8.5km em 15 min"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            rows={2}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="eval-actions">
        <button
          onClick={() => handleEvaluate()}
          disabled={loading || (inputMode === 'fields' ? (!price || !distanceKm) : !freeText)}
          className="eval-submit-btn"
        >
          {loading ? (
            <Sparkles size={18} className="animate-spin" />
          ) : (
            <>
              <Zap size={18} /> Avaliar Oferta
            </>
          )}
        </button>

        {(evaluation || price || distanceKm || freeText) && (
          <button onClick={handleClear} className="eval-clear-btn" title="Limpar">
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {errorMsg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eval-error-msg">
          <XCircle size={16} /> {errorMsg}
        </motion.div>
      )}

      {/* Results Display */}
      {evaluation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="eval-results-card"
          style={{ borderColor: evaluation.color }}
        >
          <div className="badge-row">
            <div
              className="eval-badge"
              style={{
                backgroundColor: evaluation.color,
                color: '#ffffff',
                boxShadow: `0 0 16px ${evaluation.color}66`
              }}
            >
              {evaluation.badge}
            </div>

            <div className="profit-tag">
              Lucro: <strong>R$ {evaluation.netProfit.toFixed(2).replace('.', ',')}</strong> ({evaluation.profitMarginPercent}%)
            </div>
          </div>

          <p className="eval-summary">{evaluation.summary}</p>

          <div className="metrics-row">
            <div className="metric-box">
              <span className="metric-title">Ganho / KM</span>
              <span className="metric-val">R$ {evaluation.ratePerKm.toFixed(2).replace('.', ',')}</span>
              <span className="metric-sub">Meta: R$ {evaluation.targetRatePerKm.toFixed(2)}</span>
            </div>

            <div className="metric-box">
              <span className="metric-title">Ganho / Hora</span>
              <span className="metric-val">R$ {evaluation.ratePerHour.toFixed(0)}/h</span>
              <span className="metric-sub">Meta: R$ {evaluation.targetRatePerHour.toFixed(0)}/h</span>
            </div>

            <div className="metric-box">
              <span className="metric-title">Custo Estimado</span>
              <span className="metric-val">R$ {evaluation.totalCost.toFixed(2).replace('.', ',')}</span>
              <span className="metric-sub">Combustível: R$ {evaluation.fuelCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="reasons-list">
            {evaluation.reasons.map((r, i) => (
              <div key={i} className="reason-item">
                <CheckCircle2 size={14} style={{ color: evaluation.color }} />
                <span>{r}</span>
              </div>
            ))}
          </div>

          <div className="eval-footer-link">
            <Link href="/calculadora" className="calc-link">
              <Calculator size={14} /> Ajustar Metas e Custos <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      )}

      <style jsx>{`
        .ride-evaluator-box {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ride-evaluator-box.embedded {
          box-shadow: none;
          border: 1px solid #e2e8f0;
        }

        .eval-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .eval-title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .eval-icon-pulse {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ea580c 0%, #f97316 100%);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);
        }

        .eval-title-group h3 {
          font-size: 1rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .eval-title-group p {
          font-size: 0.76rem;
          color: #64748b;
          margin: 0;
        }

        .close-eval-btn {
          background: #f1f5f9;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          cursor: pointer;
        }

        .eval-mode-switcher {
          display: flex;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 12px;
          gap: 4px;
        }

        .mode-btn {
          flex: 1;
          padding: 6px 12px;
          border: none;
          background: none;
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748b;
          border-radius: 9px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: #ffffff;
          color: #ea580c;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .eval-fields-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        @media (max-width: 520px) {
          .eval-fields-grid {
            grid-template-columns: 1fr;
          }
        }

        .input-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .input-field label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #475569;
          text-transform: uppercase;
        }

        .input-with-prefix {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0 10px;
          height: 42px;
          transition: all 0.2s;
        }

        .input-with-prefix:focus-within {
          border-color: #ea580c;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.12);
        }

        .input-with-prefix span {
          font-size: 0.82rem;
          font-weight: 700;
          color: #64748b;
        }

        .input-with-prefix input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 0.95rem;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          padding: 0 6px;
        }

        .eval-text-input textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          font-size: 0.88rem;
          color: #0f172a;
          outline: none;
          resize: none;
          box-sizing: border-box;
        }

        .eval-text-input textarea:focus {
          border-color: #ea580c;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.12);
        }

        .eval-actions {
          display: flex;
          gap: 8px;
        }

        .eval-submit-btn {
          flex: 1;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(234, 88, 12, 0.3);
          transition: all 0.2s;
        }

        .eval-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(234, 88, 12, 0.4);
        }

        .eval-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .eval-clear-btn {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .eval-error-msg {
          font-size: 0.8rem;
          color: #ef4444;
          background: #fef2f2;
          padding: 8px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .eval-results-card {
          border-radius: 16px;
          border: 2px solid;
          background: #f8fafc;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .badge-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .eval-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .profit-tag {
          font-size: 0.82rem;
          color: #334155;
        }

        .profit-tag strong {
          color: #059669;
        }

        .eval-summary {
          font-size: 0.86rem;
          color: #1e293b;
          margin: 0;
          line-height: 1.4;
          font-weight: 600;
        }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 4px;
        }

        .metric-box {
          background: #ffffff;
          padding: 10px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .metric-title {
          font-size: 0.68rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
        }

        .metric-val {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0f172a;
          margin: 2px 0;
        }

        .metric-sub {
          font-size: 0.65rem;
          color: #94a3b8;
        }

        .reasons-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .reason-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
          color: #475569;
          font-weight: 600;
        }

        .eval-footer-link {
          margin-top: 4px;
          padding-top: 8px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: flex-end;
        }

        .calc-link {
          font-size: 0.78rem;
          font-weight: 700;
          color: #ea580c;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .calc-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );

  if (isEmbedded) return content;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="eval-modal-overlay" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="eval-modal-wrapper"
        >
          {content}
        </motion.div>
      </div>

      <style jsx>{`
        .eval-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .eval-modal-wrapper {
          width: 100%;
          max-width: 500px;
        }
      `}</style>
    </AnimatePresence>
  );
}
