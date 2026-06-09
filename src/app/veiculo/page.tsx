'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Settings, Fuel, Activity, PenLine, Save, X, Plus, Trash2, Camera, Calendar, ChevronRight } from 'lucide-react';

export default function Veiculo() {
  const [isEditing, setIsEditing] = useState(false);
  const [vehicle, setVehicle] = useState<any>({
    model: 'Carregando...',
    plate: '---',
    fuelType: '---',
    avgConsumption: 0,
    currentKm: 0,
    reminders: [],
    oilChecks: [],
  });

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', dueInfo: '', status: 'ok' });
  const [isUploading, setIsUploading] = useState(false);
  const [realAvg, setRealAvg] = useState<number | null>(null);
  const [projection, setProjection] = useState<{ nextFuelingKm: number; kmRemaining: number; status: 'ok' | 'warning' | 'urgent' } | null>(null);

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
          const allRides = rData.data;
          
          let totalLitres = 0;
          let totalKm = 0;
          
          const closedRides = allRides.filter((r: any) => r.status === 'closed');
          closedRides.forEach((r: any) => {
            const rideLitres = r.fuelings?.reduce((acc: number, curr: any) => acc + (curr.litres || 0), 0) || 0;
            if (rideLitres > 0) {
              totalLitres += rideLitres;
              totalKm += (r.kmTotal || 0);
            }
          });
          
          let computedAvg = vData.data?.avgConsumption || 10;
          if (totalLitres > 0) {
            const calculatedAvg = totalKm / totalLitres;
            setRealAvg(calculatedAvg);
            computedAvg = calculatedAvg;
          }

          // Achar o abastecimento mais recente com km gravado
          let lastFueling: any = null;
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

          if (lastFueling && vData.data) {
            const nextFuelingKm = lastFueling.km + (lastFueling.litres * computedAvg);
            const kmRemaining = nextFuelingKm - vData.data.currentKm;
            
            let status: 'ok' | 'warning' | 'urgent' = 'ok';
            if (kmRemaining <= 0) {
              status = 'urgent';
            } else if (kmRemaining < 50) {
              status = 'warning';
            }
            
            setProjection({
              nextFuelingKm: Math.round(nextFuelingKm),
              kmRemaining: Math.round(kmRemaining),
              status
            });
          } else {
            setProjection(null);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
      }
    };
    fetchData();
  }, []);

  const displayAvg = realAvg || vehicle.avgConsumption;

  // Auto-save logic
  useEffect(() => {
    if (!isEditing) return;

    const timer = setTimeout(() => {
      handleSave(vehicle, false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [vehicle]);

  const handleSave = async (updatedVehicle = vehicle, shouldClose = true) => {
    try {
      const res = await fetch('/api/vehicle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVehicle),
      });
      const data = await res.json();
      if (data.success) {
        setVehicle(data.data);
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
    if (shouldClose) setIsEditing(false);
  };

  const addReminder = () => {
    const updated = {
      ...vehicle,
      reminders: [...(vehicle.reminders || []), newReminder]
    };
    handleSave(updated);
    setShowReminderModal(false);
    setNewReminder({ title: '', dueInfo: '', status: 'ok' });
  };

  const deleteReminder = (index: number) => {
    const updatedReminders = [...vehicle.reminders];
    updatedReminders.splice(index, 1);
    const updated = { ...vehicle, reminders: updatedReminders };
    handleSave(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Simulação de upload transformando em Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const newCheck = {
        date: new Date(),
        km: vehicle.currentKm,
        imageUrl: reader.result as string
      };
      const updated = {
        ...vehicle,
        oilChecks: [newCheck, ...(vehicle.oilChecks || [])].slice(0, 5) // Mantém os últimos 5
      };
      handleSave(updated);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
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

      {projection && (
        <section className={`projection-section card glass ${projection.status}`}>
          <div className="section-header">
            <h3 className="section-title">Projeção de Abastecimento</h3>
            <Fuel size={16} className="text-muted" />
          </div>
          <div className="projection-body">
            <div className="projection-main">
              <p className="projection-label">Próximo abastecimento projetado em</p>
              <h2 className="projection-km">{projection.nextFuelingKm.toLocaleString('pt-BR')} KM</h2>
            </div>
            
            <div className="projection-status-container">
              {projection.kmRemaining > 0 ? (
                <p className="remaining-km">
                  Faltam aproximadamente <strong>{projection.kmRemaining} km</strong>
                </p>
              ) : (
                <p className="remaining-km danger">
                  <strong>Atenção:</strong> Abastecimento necessário! Passou do projetado em <strong>{Math.abs(projection.kmRemaining)} km</strong>
                </p>
              )}
              <div className={`status-pill ${projection.status}`}>
                {projection.status === 'ok' && 'Autonomia Segura'}
                {projection.status === 'warning' && 'Combustível na Reserva'}
                {projection.status === 'urgent' && 'Reabastecer Imediatamente'}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="maintenance-list">
        <div className="section-header">
          <h3 className="section-title">Lembretes de Manutenção</h3>
          <button className="add-btn" onClick={() => setShowReminderModal(true)}>
            <Plus size={16} />
          </button>
        </div>
        
        {vehicle.reminders?.length === 0 ? (
          <p className="empty-text">Nenhum lembrete cadastrado.</p>
        ) : (
          vehicle.reminders?.map((rem: any, i: number) => (
            <div key={i} className="maintenance-item card">
              <div className="maintenance-info">
                <p className="maintenance-name">{rem.title}</p>
                <p className="maintenance-due">{rem.dueInfo}</p>
              </div>
              <div className="maintenance-actions">
                <div className={`maintenance-status ${rem.status}`}>{rem.status === 'ok' ? 'Em dia' : 'Atenção'}</div>
                <button className="delete-mini" onClick={() => deleteReminder(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="oil-tracker card glass">
        <div className="section-header">
          <h3 className="section-title">Nível de Óleo</h3>
          <label className="upload-label">
            <Camera size={18} />
            <input type="file" accept="image/*" onChange={handleImageUpload} hidden disabled={isUploading} />
          </label>
        </div>
        
        <div className="oil-history">
          {isUploading && <div className="uploading-state"><Activity className="animate-pulse" /> Enviando...</div>}
          
          {vehicle.oilChecks?.length === 0 ? (
            <p className="empty-text" style={{ textAlign: 'center', padding: '10px' }}>Nenhuma foto registrada.</p>
          ) : (
            <div className="oil-grid">
              {vehicle.oilChecks?.map((check: any, i: number) => (
                <div key={i} className="oil-check-card">
                  <div className="oil-img-container">
                    <img src={check.imageUrl} alt="Nível de óleo" />
                  </div>
                  <div className="oil-meta">
                    <span className="oil-date">{new Date(check.date).toLocaleDateString('pt-BR')}</span>
                    <span className="oil-km">{check.km} km</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal de Lembrete */}
      <AnimatePresence>
        {showReminderModal && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content card"
            >
              <div className="modal-header">
                <h3>Novo Lembrete</h3>
                <button onClick={() => setShowReminderModal(false)}><X size={20} /></button>
              </div>
              <div className="edit-form">
                <div className="input-group">
                  <label>O que lembrar?</label>
                  <input 
                    placeholder="Ex: Troca de Óleo" 
                    value={newReminder.title}
                    onChange={e => setNewReminder({...newReminder, title: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label>Quando?</label>
                  <input 
                    placeholder="Ex: Em 5000km ou Todo mês" 
                    value={newReminder.dueInfo}
                    onChange={e => setNewReminder({...newReminder, dueInfo: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label>Status</label>
                  <select 
                    value={newReminder.status}
                    onChange={e => setNewReminder({...newReminder, status: e.target.value as any})}
                  >
                    <option value="ok">Normal</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <button className="btn-primary" onClick={addReminder}>Adicionar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

        .maintenance-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .add-btn {
          background: var(--primary-glow);
          color: var(--primary);
          border: 1px solid var(--primary);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .empty-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 10px 0;
        }

        .maintenance-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .delete-mini {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 4px;
        }

        .oil-tracker {
          padding: 16px;
        }

        .upload-label {
          width: 40px;
          height: 40px;
          background: var(--primary);
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .uploading-state {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--primary);
          justify-content: center;
          padding: 10px;
        }

        .oil-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }

        .oil-check-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--glass-border);
        }

        .oil-img-container {
          aspect-ratio: 1;
          width: 100%;
          overflow: hidden;
        }

        .oil-img-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .oil-meta {
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.65rem;
          font-weight: 700;
        }

        .oil-date { color: var(--text-muted); }
        .oil-km { color: var(--primary); }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 400px;
          padding: 20px;
          background: white;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          font-size: 1rem;
          font-weight: 700;
        }

        .modal-header button {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 10px;
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

        .projection-section {
          padding: 20px;
          border-left: 4px solid var(--primary);
        }
        .projection-section.warning {
          border-left-color: var(--warning);
        }
        .projection-section.urgent {
          border-left-color: var(--danger);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.5) 100%);
        }
        .projection-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 10px;
        }
        .projection-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 700;
        }
        .projection-km {
          font-size: 1.75rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 4px;
        }
        .projection-status-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--glass-border);
          padding-top: 12px;
        }
        .remaining-km {
          font-size: 0.85rem;
          color: #1e293b;
        }
        .remaining-km.danger {
          color: #ef4444;
        }
        .status-pill {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .status-pill.ok {
          background: #dcfce7;
          color: #166534;
        }
        .status-pill.warning {
          background: #fef9c3;
          color: #854d0e;
        }
        .status-pill.urgent {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
}

