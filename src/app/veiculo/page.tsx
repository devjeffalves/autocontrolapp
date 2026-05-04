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
          fetch('/api/rides?status=closed')
        ]);
        const vData = await vRes.json();
        const rData = await rRes.json();

        if (vData.data) setVehicle(vData.data);
        
        if (rData.success) {
          const closedRides = rData.data;
          
          let totalLitres = 0;
          let totalKm = 0;
          
          closedRides.forEach((r: any) => {
            const rideLitres = r.fuelings?.reduce((acc: number, curr: any) => acc + (curr.litres || 0), 0) || 0;
            if (rideLitres > 0) {
              totalLitres += rideLitres;
              totalKm += (r.kmTotal || 0);
            }
          });
          
          if (totalLitres > 0) {
            setRealAvg((totalKm / totalLitres));
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
          <h3 className="section-title">Eficiência Real</h3>
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
          gap: 20px;
        }

        .input-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .input-group select {
          background: #f1f5f9;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          padding: 14px 16px;
          color: var(--foreground);
          font-size: 1rem;
          transition: all 0.2s;
          width: 100%;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 10px;
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
          color: var(--foreground);
        }

        .vehicle-card {
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%);
          border-color: var(--card-border);
        }

        .vehicle-visual {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .car-icon-bg {
          width: 80px;
          height: 80px;
          background: #eff6ff;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
        }

        .vehicle-header-info h2 {
          font-size: 1.25rem;
          margin-bottom: 6px;
          color: #0f172a;
        }

        .plate-badge {
          background: #ffffff;
          color: #000;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 700;
          font-size: 0.875rem;
          border: 2px solid #000;
          display: inline-block;
        }

        .vehicle-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          border-top: 1px solid var(--card-border);
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
          font-weight: 700;
          color: #1e293b;
        }

        .consumption-display {
          text-align: center;
          padding: 10px 0;
        }

        .consumption-number {
          font-size: 3.5rem;
          font-weight: 800;
          color: #0f172a;
        }

        .consumption-unit {
          font-size: 1rem;
          font-weight: 700;
          color: var(--primary);
          margin-left: 6px;
        }

        .consumption-subtext {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: -4px;
        }

        .consumption-progress {
          margin-top: 20px;
        }

        .progress-bar {
          height: 10px;
          background: #f1f5f9;
          border-radius: 5px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(to right, var(--danger), var(--warning), var(--success));
          border-radius: 5px;
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 700;
          text-transform: uppercase;
        }

        .maintenance-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .maintenance-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
        }

        .maintenance-name {
          font-weight: 700;
          color: #1e293b;
        }

        .maintenance-due {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .maintenance-status {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--success);
          padding: 4px 10px;
          background: #d1fae5;
          border-radius: 20px;
          text-transform: uppercase;
        }

        .maintenance-status.urgent {
          color: #b45309;
          background: #fef3c7;
        }

        .text-muted {
          color: var(--text-muted);
        }

        @media (max-width: 480px) {
          .vehicle-visual {
            flex-direction: column;
            text-align: center;
          }
          .vehicle-details {
            grid-template-columns: 1fr;
          }
          .input-row {
            grid-template-columns: 1fr;
          }
          .consumption-number {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}

