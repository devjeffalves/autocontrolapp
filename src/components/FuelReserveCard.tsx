'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fuel, AlertTriangle, CheckCircle2, RotateCcw, Edit2, Zap, Droplets, Navigation, Radio, Plus } from 'lucide-react';

interface FuelReserveCardProps {
  vehicle: any;
  onUpdateVehicle?: () => void;
}

// Função utilitária Haversine para calcular a distância em KM entre 2 coordenadas GPS
function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function FuelReserveCard({ vehicle, onUpdateVehicle }: FuelReserveCardProps) {
  const [isEditingKm, setIsEditingKm] = useState(false);
  const [customKm, setCustomKm] = useState('');
  const [isEditingLitres, setIsEditingLitres] = useState(false);
  const [customLitres, setCustomLitres] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados de Rastreamento GPS
  const [isGpsActive, setIsGpsActive] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<'off' | 'connecting' | 'active' | 'error'>('off');
  const [gpsMessage, setGpsMessage] = useState('');
  const [sessionGpsKm, setSessionGpsKm] = useState(0);

  // Refs para chamadas assíncronas e evitar problemas com closures no watchPosition
  const watchIdRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const sessionKmRef = useRef<number>(0);
  const currentVehicleKmRef = useRef<number>(vehicle?.currentKm || 0);

  useEffect(() => {
    currentVehicleKmRef.current = vehicle?.currentKm || 0;
  }, [vehicle?.currentKm]);

  const reserveLitres = vehicle?.reserveLitres || 5; // Padrão Renault Kwid 2019: 5.0 L
  const avgConsumption = vehicle?.avgConsumption || 14.5;
  const currentKm = vehicle?.currentKm || 0;
  const reserveStartKm = vehicle?.reserveStartKm || 0;
  const reserveActive = !!vehicle?.reserveActive && reserveStartKm > 0;

  // Cálculos de Autonomia da Reserva
  const reserveAutonomyKm = reserveLitres * avgConsumption;
  const maxFuelingKm = reserveStartKm > 0 ? (reserveStartKm + reserveAutonomyKm) : 0;
  const drivenInReserve = reserveActive ? Math.max(0, currentKm - reserveStartKm) : 0;
  const kmRemainingInReserve = reserveActive ? (maxFuelingKm - currentKm) : reserveAutonomyKm;
  
  // Porcentagem de combustível na reserva (100% no início da reserva, caindo até 0%)
  const fillPercentage = reserveActive 
    ? Math.max(0, Math.min(100, (kmRemainingInReserve / reserveAutonomyKm) * 100))
    : 100;

  // Cor dinâmica conforme nível da reserva
  let liquidColor = 'linear-gradient(180deg, #10b981 0%, #059669 100%)'; // Verde (>50%)
  let statusText = 'Reserva Intacta / Tanque Seguro';
  let statusBadge = 'ok';

  if (reserveActive) {
    if (fillPercentage <= 20) {
      liquidColor = 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'; // Vermelho Crítico
      statusText = 'RESERVA CRÍTICA! ABASTEÇA JÁ';
      statusBadge = 'urgent';
    } else if (fillPercentage <= 50) {
      liquidColor = 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'; // Amarelo Atenção
      statusText = 'Atenção: Metade da Reserva Consumida';
      statusBadge = 'warning';
    } else {
      liquidColor = 'linear-gradient(180deg, #10b981 0%, #059669 100%)'; // Verde Seguro
      statusText = 'Reserva Ativa - Autonomia Normal';
      statusBadge = 'ok';
    }
  }

  // --- Efeito para Rastreamento GPS Nativo ---
  useEffect(() => {
    // Se o veículo não estiver carregado, a reserva não estiver ativa ou o GPS estiver desligado, interrompe o rastreamento
    if (!vehicle || !reserveActive || !isGpsActive) {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('off');
      setGpsMessage(reserveActive ? 'GPS Pausado' : 'Reserva inativa');
      return;
    }

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('Geolocalização não suportada neste dispositivo');
      return;
    }

    setGpsStatus('connecting');
    setGpsMessage('Conectando ao GPS do dispositivo...');

    const handlePositionSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Filtro de ruído: ignorar leituras com precisão ruim (> 50 metros)
      if (accuracy > 50) {
        setGpsStatus('connecting');
        setGpsMessage(`Sinal de GPS fraco (precisão: ~${Math.round(accuracy)}m)`);
        return;
      }

      setGpsStatus('active');
      setGpsMessage(`GPS Rastreando (${Math.round(accuracy)}m prec.)`);

      if (lastCoordsRef.current) {
        const deltaKm = calculateHaversineKm(
          lastCoordsRef.current.lat,
          lastCoordsRef.current.lng,
          latitude,
          longitude
        );

        // Filtro de movimento:
        // 1. Ignorar deslocamentos menores que 10 metros (0.01 km) para conter ruído com carro parado
        // 2. Ignorar desvios irreais superiores a 5 km por leitura instantânea
        if (deltaKm >= 0.01 && deltaKm < 5.0) {
          sessionKmRef.current += deltaKm;
          setSessionGpsKm(sessionKmRef.current);

          const newKm = Math.round((currentVehicleKmRef.current + sessionKmRef.current) * 10) / 10;
          
          // Enviar atualização ao backend a cada ~0.1 KM acumulado
          if (sessionKmRef.current >= 0.1) {
            sessionKmRef.current = 0;
            setSessionGpsKm(0);
            handleUpdateReserveSilent({ currentKm: newKm });
          }
        }
      }

      lastCoordsRef.current = { lat: latitude, lng: longitude };
    };

    const handlePositionError = (err: GeolocationPositionError) => {
      setGpsStatus('error');
      if (err.code === err.PERMISSION_DENIED) {
        setGpsMessage('Permissão de GPS negada no navegador');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGpsMessage('Sinal de GPS indisponível no local');
      } else {
        setGpsMessage('Erro ao obter posição GPS');
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionSuccess,
      handlePositionError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
      }
    );

    return () => {
      if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [reserveActive, isGpsActive]);

  const handleUpdateReserveSilent = async (updateData: any) => {
    try {
      const res = await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const json = await res.json();
      if (json.success && onUpdateVehicle) {
        onUpdateVehicle();
      }
    } catch (err) {
      console.error('Erro silencioso ao atualizar reserva:', err);
    }
  };

  const handleUpdateReserve = async (updateData: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const json = await res.json();
      if (json.success && onUpdateVehicle) {
        onUpdateVehicle();
      }
    } catch (err) {
      console.error('Erro ao atualizar reserva:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateReserveNow = () => {
    lastCoordsRef.current = null;
    sessionKmRef.current = 0;
    setSessionGpsKm(0);
    setIsGpsActive(true);
    handleUpdateReserve({
      reserveActive: true,
      reserveStartKm: currentKm,
      reserveLitres
    });
  };

  const handleCustomKmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const kmNum = parseFloat(customKm);
    if (!isNaN(kmNum) && kmNum > 0) {
      handleUpdateReserve({
        reserveActive: true,
        reserveStartKm: kmNum,
        reserveLitres
      });
      setIsEditingKm(false);
      setCustomKm('');
    }
  };

  const handleQuickAddKm = (deltaKm: number) => {
    const newKm = Math.round((currentKm + deltaKm) * 10) / 10;
    handleUpdateReserve({
      currentKm: newKm
    });
  };

  const handleCustomLitresSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const litresNum = parseFloat(customLitres);
    if (!isNaN(litresNum) && litresNum > 0) {
      handleUpdateReserve({
        reserveLitres: litresNum
      });
      setIsEditingLitres(false);
      setCustomLitres('');
    }
  };

  const handleDeactivateReserve = () => {
    if (watchIdRef.current !== null && typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    lastCoordsRef.current = null;
    sessionKmRef.current = 0;
    setSessionGpsKm(0);
    handleUpdateReserve({
      reserveActive: false,
      reserveStartKm: 0
    });
  };

  if (!vehicle) return null;

  return (
    <div className="reserve-card card glass">
      <div className="reserve-card-header">
        <div className="title-group">
          <div className={`reserve-icon-wrapper ${statusBadge}`}>
            <Fuel size={20} />
          </div>
          <div>
            <h3 className="reserve-title">Controle da Reserva do Tanque</h3>
            <p className="reserve-subtitle">
              Capacidade da Reserva: <strong>{reserveLitres.toFixed(1)} L</strong> ({avgConsumption.toFixed(1)} km/L)
              <button 
                className="edit-litres-btn" 
                onClick={() => setIsEditingLitres(!isEditingLitres)}
                title="Editar litros da reserva"
              >
                <Edit2 size={12} />
              </button>
            </p>
          </div>
        </div>

        {reserveActive && (
          <span className={`reserve-status-badge ${statusBadge}`}>
            {fillPercentage.toFixed(0)}% Restante
          </span>
        )}
      </div>

      {/* Bar de Status do GPS e Controle quando a reserva está ativa */}
      {reserveActive && (
        <div className="gps-tracker-bar">
          <div className="gps-info">
            <div className={`gps-indicator-dot ${gpsStatus}`} />
            <Navigation size={14} className={gpsStatus === 'active' ? 'text-emerald-500 animate-spin-slow' : 'text-slate-400'} />
            <span className="gps-msg">{gpsMessage}</span>
            {sessionGpsKm > 0 && (
              <span className="session-km-badge">+{sessionGpsKm.toFixed(1)} km rec.</span>
            )}
          </div>
          <button 
            className={`gps-toggle-btn ${isGpsActive ? 'active' : ''}`}
            onClick={() => setIsGpsActive(!isGpsActive)}
            title={isGpsActive ? 'Desativar Rastreamento GPS' : 'Ativar Rastreamento GPS'}
          >
            <Radio size={12} />
            {isGpsActive ? 'GPS On' : 'GPS Off'}
          </button>
        </div>
      )}

      {isEditingLitres && (
        <form onSubmit={handleCustomLitresSubmit} className="inline-edit-form">
          <label>Volume da Reserva (Litros):</label>
          <div className="input-with-button">
            <input 
              type="number" 
              step="0.1" 
              placeholder="Ex: 5.0"
              value={customLitres} 
              onChange={e => setCustomLitres(e.target.value)}
              required
            />
            <button type="submit" className="save-mini-btn">Salvar</button>
          </div>
        </form>
      )}

      {/* Recipiente / Galão de Combustível Animado */}
      <div className="canister-section">
        <div className="canister-container">
          <div className="canister-top-cap" />
          <div className="canister-handle" />
          
          <div className="canister-body">
            {/* Medidores Laterais (Full, 1/2, Res, Emp) */}
            <div className="canister-gauge-marks">
              <span>Full</span>
              <span>1/2</span>
              <span>Res</span>
              <span>Emp</span>
            </div>

            {/* Nível do Líquido Animado */}
            <motion.div 
              className="canister-liquid"
              initial={false}
              animate={{ 
                height: `${fillPercentage}%`,
                background: liquidColor
              }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              {/* Efeito de onda na superfície do líquido */}
              <div className="liquid-wave" />
            </motion.div>

            {/* Texto de Porcentagem Sobreposto no Centro do Recipiente */}
            <div className="canister-overlay-text">
              <span className="fill-percent-number">{fillPercentage.toFixed(0)}%</span>
              <span className="fill-percent-label">{reserveActive ? `${Math.max(0, Math.round(kmRemainingInReserve))} KM` : 'Tanque Ok'}</span>
            </div>
          </div>
        </div>

        {/* Métricas e Detalhes ao Lado do Recipiente */}
        <div className="canister-details">
          {reserveActive ? (
            <>
              <div className="detail-item">
                <span className="detail-label">KM Entrada Reserva</span>
                <span className="detail-val">{reserveStartKm.toLocaleString('pt-BR')} KM</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">KM Atual Veículo</span>
                <span className="detail-val highlight">{currentKm.toLocaleString('pt-BR')} KM</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Limite para Abastecer</span>
                <span className="detail-val">{Math.round(maxFuelingKm).toLocaleString('pt-BR')} KM</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Rodado na Reserva</span>
                <span className="detail-val">{Math.round(drivenInReserve)} KM</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Restante na Reserva</span>
                <span className={`detail-val ${kmRemainingInReserve <= 15 ? 'urgent-text' : 'positive-text'}`}>
                  {kmRemainingInReserve > 0 ? `${Math.round(kmRemainingInReserve)} KM` : `Passou ${Math.abs(Math.round(kmRemainingInReserve))} KM!`}
                </span>
              </div>
            </>
          ) : (
            <div className="inactive-reserve-info">
              <CheckCircle2 size={32} className="text-success" />
              <h4>Reserva Inativa</h4>
              <p>Acione o botão abaixo assim que a luz da reserva acender no painel do veículo.</p>
              <div className="autonomy-estimate">
                <span>Autonomia máxima da reserva ({reserveLitres}L):</span>
                <strong>~{Math.round(reserveAutonomyKm)} KM</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contador Manual Rápido (Quick Increment) quando Reserva está Ativa */}
      {reserveActive && (
        <div className="quick-km-bar">
          <span className="quick-km-label">Incrementar KM Manual:</span>
          <div className="quick-km-buttons">
            <button 
              className="quick-km-btn" 
              onClick={() => handleQuickAddKm(1)}
              disabled={loading}
              title="Adicionar +1 KM ao odômetro"
            >
              <Plus size={12} /> 1 KM
            </button>
            <button 
              className="quick-km-btn" 
              onClick={() => handleQuickAddKm(5)}
              disabled={loading}
              title="Adicionar +5 KM ao odômetro"
            >
              <Plus size={12} /> 5 KM
            </button>
            <button 
              className="quick-km-btn" 
              onClick={() => handleQuickAddKm(10)}
              disabled={loading}
              title="Adicionar +10 KM ao odômetro"
            >
              <Plus size={12} /> 10 KM
            </button>
          </div>
        </div>
      )}

      {/* Formulário para Digitar KM da Reserva */}
      <AnimatePresence>
        {isEditingKm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCustomKmSubmit} 
            className="inline-edit-form"
          >
            <label>Informe o KM exato em que acendeu a reserva:</label>
            <div className="input-with-button">
              <input 
                type="number" 
                placeholder={`KM Atual: ${currentKm}`}
                value={customKm} 
                onChange={e => setCustomKm(e.target.value)}
                required
              />
              <button type="submit" className="save-mini-btn">Confirmar</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Ações Rápidas de Reserva */}
      <div className="reserve-actions">
        {!reserveActive ? (
          <>
            <button 
              className="btn-reserve-trigger primary"
              onClick={handleActivateReserveNow}
              disabled={loading}
            >
              <Zap size={16} /> Entrou na Reserva Agora ({currentKm} KM)
            </button>
            <button 
              className="btn-reserve-trigger secondary"
              onClick={() => setIsEditingKm(!isEditingKm)}
            >
              <Edit2 size={14} /> Informar Outro KM
            </button>
          </>
        ) : (
          <>
            <button 
              className="btn-reserve-trigger secondary"
              onClick={() => setIsEditingKm(!isEditingKm)}
            >
              <Edit2 size={14} /> Ajustar KM Inicial ({reserveStartKm})
            </button>
            <button 
              className="btn-reserve-trigger danger"
              onClick={handleDeactivateReserve}
              disabled={loading}
            >
              <RotateCcw size={14} /> Desativar Reserva / Abasteci
            </button>
          </>
        )}
      </div>

      <style jsx>{`
        .reserve-card {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px;
          border-radius: 20px;
          background: #ffffff;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          position: relative;
        }

        .reserve-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .reserve-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          color: var(--primary);
        }

        .reserve-icon-wrapper.warning {
          background: #fef3c7;
          color: #d97706;
        }

        .reserve-icon-wrapper.urgent {
          background: #fee2e2;
          color: #ef4444;
          animation: pulse 1.5s infinite;
        }

        .reserve-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .reserve-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 2px 0 0 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .edit-litres-btn {
          background: none;
          border: none;
          color: var(--primary);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
        }

        .reserve-status-badge {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .reserve-status-badge.ok {
          background: #d1fae5;
          color: #047857;
        }

        .reserve-status-badge.warning {
          background: #fef3c7;
          color: #b45309;
        }

        .reserve-status-badge.urgent {
          background: #fee2e2;
          color: #b91c1c;
          animation: pulse 1.5s infinite;
        }

        /* GPS Tracker Bar */
        .gps-tracker-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
        }

        .gps-info {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          font-weight: 600;
        }

        .gps-indicator-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94a3b8;
        }

        .gps-indicator-dot.active {
          background: #10b981;
          box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
          animation: pulse 1.5s infinite;
        }

        .gps-indicator-dot.connecting {
          background: #f59e0b;
          animation: pulse 1s infinite;
        }

        .gps-indicator-dot.error {
          background: #ef4444;
        }

        .gps-msg {
          font-weight: 600;
          color: #475569;
        }

        .session-km-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 6px;
        }

        .gps-toggle-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #64748b;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .gps-toggle-btn.active {
          background: #10b981;
          color: white;
          border-color: #059669;
        }

        /* Animação do Recipiente / Galão de Combustível */
        .canister-section {
          display: flex;
          align-items: center;
          gap: 20px;
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--glass-border);
        }

        .canister-container {
          width: 90px;
          height: 140px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .canister-top-cap {
          width: 24px;
          height: 8px;
          background: #334155;
          border-radius: 4px 4px 0 0;
          margin-bottom: 2px;
        }

        .canister-handle {
          width: 50px;
          height: 10px;
          border: 3px solid #475569;
          border-bottom: none;
          border-radius: 8px 8px 0 0;
        }

        .canister-body {
          width: 80px;
          height: 120px;
          background: #e2e8f0;
          border: 3px solid #334155;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .canister-gauge-marks {
          position: absolute;
          left: 4px;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 6px 0;
          z-index: 5;
          font-size: 0.5rem;
          font-weight: 800;
          color: rgba(15, 23, 42, 0.6);
          pointer-events: none;
        }

        .canister-liquid {
          width: 100%;
          position: relative;
          border-radius: 0 0 8px 8px;
          transition: background 0.5s ease;
        }

        .liquid-wave {
          position: absolute;
          top: -4px;
          left: 0;
          right: 0;
          height: 8px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          animation: waveMove 2s infinite ease-in-out alternate;
        }

        @keyframes waveMove {
          0% { transform: translateY(0) scaleY(1); }
          100% { transform: translateY(-2px) scaleY(1.2); }
        }

        .canister-overlay-text {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 6;
          pointer-events: none;
          text-shadow: 0 1px 3px rgba(255, 255, 255, 0.8);
        }

        .fill-percent-number {
          font-size: 1.2rem;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }

        .fill-percent-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: #1e293b;
          margin-top: 2px;
        }

        .canister-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.8rem;
          padding-bottom: 4px;
          border-bottom: 1px dashed #e2e8f0;
        }

        .detail-label {
          color: var(--text-muted);
          font-weight: 600;
        }

        .detail-val {
          font-weight: 700;
          color: #0f172a;
        }

        .detail-val.highlight {
          color: var(--primary);
        }

        .detail-val.urgent-text {
          color: #ef4444;
          font-weight: 800;
        }

        .detail-val.positive-text {
          color: #10b981;
          font-weight: 800;
        }

        .inactive-reserve-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .inactive-reserve-info h4 {
          font-size: 0.95rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .inactive-reserve-info p {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.3;
        }

        .autonomy-estimate {
          font-size: 0.75rem;
          color: #0f172a;
          margin-top: 4px;
          background: #e2e8f0;
          padding: 4px 8px;
          border-radius: 6px;
        }

        /* Quick KM Increment Bar */
        .quick-km-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
          padding: 8px 12px;
          border-radius: 12px;
          gap: 8px;
        }

        .quick-km-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #475569;
        }

        .quick-km-buttons {
          display: flex;
          gap: 6px;
        }

        .quick-km-btn {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px 10px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-km-btn:hover {
          background: #e2e8f0;
          border-color: #94a3b8;
        }

        .inline-edit-form {
          background: #f1f5f9;
          padding: 10px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .inline-edit-form label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .input-with-button {
          display: flex;
          gap: 8px;
        }

        .input-with-button input {
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--glass-border);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .save-mini-btn {
          padding: 8px 14px;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
        }

        .reserve-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .btn-reserve-trigger {
          flex: 1;
          min-width: 140px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          transition: all 0.2s;
        }

        .btn-reserve-trigger.primary {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        .btn-reserve-trigger.secondary {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .btn-reserve-trigger.danger {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }

        @media (max-width: 480px) {
          .canister-section {
            flex-direction: column;
            align-items: center;
          }
          .canister-details {
            width: 100%;
          }
          .quick-km-bar {
            flex-direction: column;
            align-items: stretch;
          }
          .quick-km-buttons {
            justify-content: space-between;
          }
          .quick-km-btn {
            flex: 1;
            justify-content: center;
          }
          .reserve-actions {
            flex-direction: column;
          }
          .btn-reserve-trigger {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
