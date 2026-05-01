'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Settings, Fuel, Activity, PenLine, Save, X } from 'lucide-react';

export default function Veiculo() {
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState({
    model: 'Carregando...',
    plate: '---',
    fuelType: '---',
    avgConsumption: 0,
    currentKm: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, rRes] = await Promise.all([
          fetch('/api/vehicle'),
          fetch('/api/rides')
        ]);
        const vData = await vRes.json();
        const rData = await rRes.json();

        if (vData.data) setVehicle(vData.data);
        
        if (rData.success) {
          const ridesWithFuel = rData.data.filter((r: any) => r.fuelLitres > 0);
          const totalKmWithFuel = ridesWithFuel.reduce((acc: number, curr: any) => acc + (curr.kmEnd - curr.kmStart), 0);
          const totalLitres = ridesWithFuel.reduce((acc: number, curr: any) => acc + curr.fuelLitres, 0);
          
          if (totalLitres > 0) {
            setRealAvg((totalKmWithFuel / totalLitres));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };
    fetchData();
  }, []);

  const [realAvg, setRealAvg] = useState<number | null>(null);
  const displayAvg = realAvg || vehicle.avgConsumption;

  // Auto-save logic
  useEffect(() => {
    if (!isEditing) return;

    const timer = setTimeout(() => {
      saveToDb();
    }, 1500);

    return () => clearTimeout(timer);
  }, [vehicle]);

  const saveToDb = async () => {
    try {
      await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle),
      });
      console.log('Veículo salvo automaticamente');
    } catch (error) {
      console.error('Erro no auto-save:', error);
    }
  };

  const handleSave = async () => {
    await saveToDb();
    setIsEditing(false);
  };

  return (
    <div className="veiculo-page">
      <header className="header">
        <h1 className="title">Meu Veículo</h1>
        <button 
          className={`settings-btn glass ${isEditing ? 'active' : ''}`}
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          {isEditing ? <Save size={20} /> : <Settings size={20} />}
        </button>
      </header>
      <section className="vehicle-card card">
        {isEditing ? (
          <div className="edit-form">
            <div className="input-group">
              <label>Modelo</label>
              <input 
                value={vehicle.model} 
                onChange={e => setVehicle({...vehicle, model: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label>Placa</label>
              <input 
                value={vehicle.plate} 
                onChange={e => setVehicle({...vehicle, plate: e.target.value})}
              />
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Combustível</label>
                <select 
                  value={vehicle.fuelType}
                  onChange={e => setVehicle({...vehicle, fuelType: e.target.value})}
                >
                  <option value="Flex">Flex</option>
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Elétrico">Elétrico</option>
                </select>
              </div>
              <div className="input-group">
                <label>Consumo (km/L)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={vehicle.avgConsumption} 
                  onChange={e => setVehicle({...vehicle, avgConsumption: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="input-group">
              <label>KM Atual</label>
              <input 
                type="number"
                value={vehicle.currentKm} 
                onChange={e => setVehicle({...vehicle, currentKm: Number(e.target.value)})}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="vehicle-visual">
              <div className="car-icon-bg">
                <Car size={48} className="car-icon" />
              </div>
              <div className="vehicle-header-info">
                <h2>{vehicle.model}</h2>
                <span className="plate-badge">{vehicle.plate}</span>
              </div>
            </div>
            
            <div className="vehicle-details">
              <div className="detail-item">
                <Fuel size={18} className="text-muted" />
                <div className="detail-text">
                  <p className="detail-label">Combustível</p>
                  <p className="detail-value">{vehicle.fuelType}</p>
                </div>
              </div>
              <div className="detail-item">
                <Activity size={18} className="text-muted" />
                <div className="detail-text">
                  <p className="detail-label">KM Total</p>
                  <p className="detail-value">{vehicle.currentKm.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="consumption-section card glass">
        <div className="section-header">
          <h3 className="section-title">Eficiência</h3>
          <PenLine size={16} className="text-muted" />
        </div>
        <div className="consumption-display">
          <div className="consumption-main">
            <span className="consumption-number">{displayAvg.toFixed(1)}</span>
            <span className="consumption-unit">km/L</span>
          </div>
          <p className="consumption-subtext">Média baseada nos seus abastecimentos</p>
        </div>
        <div className="consumption-progress">
          <div className="progress-bar">
            <motion.div 
              className="progress-fill" 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((displayAvg / 15) * 100, 100)}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="progress-labels">
            <span>Baixo</span>
            <span>Ideal</span>
            <span>Excelente</span>
          </div>
        </div>
      </section>

      <section className="maintenance-list">
        <h3 className="section-title">Lembretes</h3>
        <div className="maintenance-item card">
          <div className="maintenance-info">
            <p className="maintenance-name">Troca de Óleo</p>
            <p className="maintenance-due">Em 2.500 km</p>
          </div>
          <div className="maintenance-status urgent">Atenção</div>
        </div>
        <div className="maintenance-item card">
          <div className="maintenance-info">
            <p className="maintenance-name">Calibragem Pneus</p>
            <p className="maintenance-due">Toda segunda-feira</p>
          </div>
          <div className="maintenance-status">Ok</div>
        </div>
      </section>

      <style jsx>{`
        .veiculo-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .input-group select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          color: white;
          font-size: 1rem;
          transition: all 0.2s;
          width: 100%;
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

        .settings-btn {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }

        .vehicle-card {
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: linear-gradient(135deg, var(--card-bg), rgba(59, 130, 246, 0.1));
        }

        .vehicle-visual {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .car-icon-bg {
          width: 80px;
          height: 80px;
          background: var(--glass);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .vehicle-header-info h2 {
          font-size: 1.25rem;
          margin-bottom: 6px;
        }

        .plate-badge {
          background: #fff;
          color: #000;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          font-size: 0.875rem;
          border: 2px solid #000;
        }

        .vehicle-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          border-top: 1px solid var(--glass-border);
          padding-top: 20px;
        }

        .detail-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .detail-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .detail-value {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .consumption-display {
          text-align: center;
          padding: 10px 0;
        }

        .consumption-number {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(to bottom, #fff, var(--text-muted));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .consumption-unit {
          font-size: 1rem;
          font-weight: 600;
          color: var(--primary);
          margin-left: 8px;
        }

        .consumption-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .consumption-progress {
          margin-top: 20px;
        }

        .progress-bar {
          height: 8px;
          background: var(--glass);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, var(--warning), var(--success));
          border-radius: 4px;
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.625rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .maintenance-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .maintenance-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
        }

        .maintenance-name {
          font-weight: 600;
        }

        .maintenance-due {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .maintenance-status {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--success);
          padding: 4px 8px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 6px;
        }

        .maintenance-status.urgent {
          color: var(--warning);
          background: rgba(245, 158, 11, 0.1);
        }

        .text-muted {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
