'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Calculator, 
  DollarSign, 
  Fuel, 
  Car, 
  Check, 
  Save, 
  HelpCircle, 
  Sparkles, 
  Sliders,
  PieChart,
  Zap,
  Info
} from 'lucide-react';
import Link from 'next/link';

export default function CalculadoraPage() {
  const [activeTab, setActiveTab] = useState<'details' | 'settings'>('details');
  const [timePeriod, setTimePeriod] = useState<'dia' | 'semana' | 'mes'>('mes');
  const [simulationPercent, setSimulationPercent] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form / Config State
  const [config, setConfig] = useState({
    rentalCompany: 'Kovi',
    rentalCost: 3342.51,
    rentalPeriod: 'Mês' as 'Mês' | 'Semana',
    otherMonthlyCosts: 120.00,
    fuelType: 'Gasolina',
    fuelPrice: 5.89,
    avgConsumption: 12.5,
    workingDaysPerMonth: 24,
    workingHoursPerDay: 10,
    dailyKmTarget: 200,
    targetGrossRevenue: 10833.00,
  });

  const [realAvg, setRealAvg] = useState<number | null>(null);

  // Fetch saved config & vehicle info on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, vRes, rRes] = await Promise.all([
          fetch('/api/cost-config'),
          fetch('/api/vehicle'),
          fetch('/api/rides')
        ]);
        
        const cData = await cRes.json();
        const vData = await vRes.json();
        const rData = await rRes.json();

        if (rData.success && Array.isArray(rData.data)) {
          const closedRides = rData.data.filter((r: any) => r.status === 'closed');
          let totalLitres = 0;
          let totalKm = 0;
          closedRides.forEach((r: any) => {
            const rideLitres = r.fuelings?.reduce((acc: number, curr: any) => acc + (curr.litres || 0), 0) || 0;
            totalLitres += rideLitres;
            totalKm += (r.kmTotal || 0);
          });
          if (totalLitres > 0 && totalKm > 0) {
            const calculatedAvg = totalKm / totalLitres;
            if (calculatedAvg >= 6 && calculatedAvg <= 30) {
              setRealAvg(calculatedAvg);
            }
          }
        }

        if (cData.success && cData.data) {
          setConfig((prev) => ({
            ...prev,
            rentalCompany: cData.data.rentalCompany || prev.rentalCompany,
            rentalCost: cData.data.rentalCost ?? prev.rentalCost,
            rentalPeriod: cData.data.rentalPeriod || prev.rentalPeriod,
            otherMonthlyCosts: cData.data.otherMonthlyCosts ?? prev.otherMonthlyCosts,
            fuelType: cData.data.fuelType || (vData.data?.fuelType || prev.fuelType),
            fuelPrice: cData.data.fuelPrice ?? prev.fuelPrice,
            avgConsumption: cData.data.avgConsumption || (vData.data?.avgConsumption || prev.avgConsumption),
            workingDaysPerMonth: cData.data.workingDaysPerMonth ?? prev.workingDaysPerMonth,
            workingHoursPerDay: cData.data.workingHoursPerDay ?? prev.workingHoursPerDay,
            dailyKmTarget: cData.data.dailyKmTarget ?? prev.dailyKmTarget,
            targetGrossRevenue: cData.data.targetGrossRevenue ?? prev.targetGrossRevenue,
          }));
        } else if (vData.success && vData.data) {
          if (vData.data.fuelType) setConfig(p => ({ ...p, fuelType: vData.data.fuelType }));
          if (vData.data.avgConsumption) setConfig(p => ({ ...p, avgConsumption: vData.data.avgConsumption }));
        }
      } catch (err) {
        console.error('Erro ao carregar configurações da calculadora:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/cost-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert('Erro ao salvar: ' + data.error);
      }
    } catch (e) {
      alert('Erro de conexão ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Computations
  const calculations = useMemo(() => {
    const daysPerMonth = Math.max(1, config.workingDaysPerMonth);
    const hoursPerDay = Math.max(1, config.workingHoursPerDay);
    const dailyKm = Math.max(1, config.dailyKmTarget);

    const totalKmMonth = daysPerMonth * dailyKm;
    const totalHoursMonth = daysPerMonth * hoursPerDay;

    // Rental cost per month
    let monthlyRental = config.rentalCost;
    if (config.rentalPeriod === 'Semana') {
      monthlyRental = config.rentalCost * (daysPerMonth / 6); // approx 4.33 weeks
    }

    // Fuel cost per month
    const litresNeeded = config.avgConsumption > 0 ? totalKmMonth / config.avgConsumption : 0;
    const monthlyFuel = litresNeeded * config.fuelPrice;

    // Total monthly costs
    const monthlyTotalCosts = monthlyRental + monthlyFuel + config.otherMonthlyCosts;

    // Gross revenue (with simulation multiplier)
    const baseGrossMonth = config.targetGrossRevenue;
    const simMultiplier = 1 + (simulationPercent / 100);
    const simulatedGrossMonth = baseGrossMonth * simMultiplier;

    // Net profit per month
    const monthlyNetProfit = simulatedGrossMonth - monthlyTotalCosts;
    const profitMargin = simulatedGrossMonth > 0 ? (monthlyNetProfit / simulatedGrossMonth) * 100 : 0;

    // Period multiplier
    let factor = 1;
    if (timePeriod === 'dia') {
      factor = 1 / daysPerMonth;
    } else if (timePeriod === 'semana') {
      factor = 6 / daysPerMonth; // 1 week of work
    }

    const periodGross = simulatedGrossMonth * factor;
    const periodCosts = monthlyTotalCosts * factor;
    const periodNetProfit = monthlyNetProfit * factor;
    const periodKm = totalKmMonth * factor;
    const periodHours = totalHoursMonth * factor;

    const periodRentalCost = monthlyRental * factor;
    const periodFuelCost = monthlyFuel * factor;
    const periodOtherCost = config.otherMonthlyCosts * factor;

    // Unit Metrics (same for any period since ratio is invariant)
    const revPerKm = periodKm > 0 ? periodGross / periodKm : 0;
    const costPerKm = periodKm > 0 ? periodCosts / periodKm : 0;
    const revPerHour = periodHours > 0 ? periodGross / periodHours : 0;
    const costPerHour = periodHours > 0 ? periodCosts / periodHours : 0;

    return {
      monthlyRental,
      monthlyFuel,
      monthlyTotalCosts,
      periodGross,
      periodCosts,
      periodNetProfit,
      profitMargin,
      periodKm,
      periodHours,
      revPerKm,
      costPerKm,
      revPerHour,
      costPerHour,
      periodRentalCost,
      periodFuelCost,
      periodOtherCost
    };
  }, [config, timePeriod, simulationPercent]);

  const rentalCompanies = ['Kovi', 'Movida', 'Unidas', 'Zencar', 'Outra', 'Próprio'];
  const fuelTypes = ['Gasolina', 'Etanol', 'GNV', 'Diesel', 'Elétrico'];

  return (
    <div className="container calc-page">
      {/* Header Bar */}
      <div className="calc-header">
        <Link href="/" className="calc-icon-btn">
          <ArrowLeft size={20} />
        </Link>
        <div className="calc-title-group">
          <h1>
            <Calculator size={20} style={{ color: '#ea580c' }} />
            Calculadora de Custos
          </h1>
          <p>Gerencie despesas e metas de lucro</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="calc-icon-btn calc-save-btn"
          title="Salvar Configurações"
        >
          {isSaving ? <Sparkles size={18} className="animate-spin" /> : <Save size={18} />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="calc-nav-tabs">
        <button
          onClick={() => setActiveTab('details')}
          className={`calc-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
        >
          <PieChart size={16} />
          Detalhes & Lucro
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`calc-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Sliders size={16} />
          Configurar Custos
        </button>
      </div>

      {savedSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#10b981',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Check size={16} /> Configurações de custos salvas com sucesso!
        </motion.div>
      )}

      {/* TAB 1: DETALHES & LUCRO */}
      {activeTab === 'details' && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Header Period Switcher: DIA | SEMANA | MÊS */}
          <div className="calc-period-bar">
            <span className="calc-period-label">Período:</span>
            <div className="calc-period-selector">
              {(['dia', 'semana', 'mes'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTimePeriod(p)}
                  className={`calc-period-btn ${timePeriod === p ? 'active' : ''}`}
                >
                  {p === 'mes' ? 'Mês' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Main Profit Card (Visual idêntico às imagens de referência) */}
          <div className="calc-profit-card">
            <div className="calc-profit-header">
              <span className="calc-profit-title">
                Lucro {timePeriod === 'mes' ? 'Mensal' : timePeriod === 'semana' ? 'Semanal' : 'Diário'}
              </span>
              <div className="calc-period-selector">
                <span className="calc-period-btn active" style={{ cursor: 'default' }}>
                  {timePeriod.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Formula line: Gross (green) - Costs (red) */}
            <div className="calc-profit-formula">
              <span className="calc-gross-val">
                R$ {calculations.periodGross.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span style={{ color: '#94a3b8' }}>-</span>
              <span className="calc-cost-val">
                R$ {calculations.periodCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span style={{ color: '#94a3b8' }}>=</span>
            </div>

            {/* Net Profit Amount */}
            <div className="calc-profit-amount-row">
              <h2 className="calc-profit-amount">
                R$ {calculations.periodNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
              <span className="calc-margin-badge">
                ({calculations.profitMargin.toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* 4 Performance Metric Cards Grid */}
          <div className="calc-metrics-grid">
            <div className="calc-metric-card">
              <span className="calc-metric-label">Ganho por Km</span>
              <div className="calc-metric-value-row">
                <span className="calc-metric-value">
                  R$ {calculations.revPerKm.toFixed(2).replace('.', ',')}
                </span>
                <span className="calc-metric-unit"> /km</span>
              </div>
            </div>

            <div className="calc-metric-card">
              <span className="calc-metric-label">Custo por Km</span>
              <div className="calc-metric-value-row">
                <span className="calc-metric-value">
                  R$ {calculations.costPerKm.toFixed(2).replace('.', ',')}
                </span>
                <span className="calc-metric-unit"> /km</span>
              </div>
            </div>

            <div className="calc-metric-card">
              <span className="calc-metric-label">Ganho por Hora</span>
              <div className="calc-metric-value-row">
                <span className="calc-metric-value">
                  R$ {calculations.revPerHour.toFixed(2).replace('.', ',')}
                </span>
                <span className="calc-metric-unit"> /hr</span>
              </div>
            </div>

            <div className="calc-metric-card">
              <span className="calc-metric-label">Custo por Hora</span>
              <div className="calc-metric-value-row">
                <span className="calc-metric-value">
                  R$ {calculations.costPerHour.toFixed(2).replace('.', ',')}
                </span>
                <span className="calc-metric-unit"> /hr</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation: "Simule Ganhos Maiores" */}
          <div className="calc-simulation-box">
            <div className="calc-sim-header">
              <span className="calc-sim-title">
                <Zap size={16} style={{ color: '#ea580c', fill: '#ea580c' }} />
                Simule Ganhos Maiores
                <Info size={14} style={{ color: '#94a3b8' }} />
              </span>
              <span className="calc-sim-badge">
                +{simulationPercent}%
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={simulationPercent}
              onChange={(e) => setSimulationPercent(Number(e.target.value))}
              className="calc-slider"
            />
          </div>

          {/* Call to Action Button: "Aplicar $/Km e $/Hr no Semáforo" */}
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="calc-cta-btn"
          >
            {isSaving ? (
              <Sparkles size={20} className="animate-spin" />
            ) : (
              <>
                Aplicar $/Km e $/Hr no Semáforo
              </>
            )}
          </button>

          {/* Breakdown of Costs */}
          <div className="card" style={{ padding: '18px' }}>
            <h3 className="calc-section-title" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              <span>Custos {timePeriod === 'mes' ? 'Mensais' : timePeriod === 'semana' ? 'Semanais' : 'Diários'}</span>
              <span style={{ color: '#dc2626' }}>
                R$ {calculations.periodCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </h3>

            <div className="calc-cost-list" style={{ marginTop: '12px' }}>
              <div className="calc-cost-item">
                <div className="calc-cost-item-left">
                  <Car size={16} style={{ color: '#94a3b8' }} />
                  <span>Aluguel ({config.rentalCompany})</span>
                </div>
                <span className="calc-cost-item-val">
                  R$ {calculations.periodRentalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="calc-cost-item">
                <div className="calc-cost-item-left">
                  <Fuel size={16} style={{ color: '#94a3b8' }} />
                  <span>Combustível ({config.fuelType})</span>
                </div>
                <span className="calc-cost-item-val">
                  R$ {calculations.periodFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="calc-cost-item">
                <div className="calc-cost-item-left">
                  <DollarSign size={16} style={{ color: '#94a3b8' }} />
                  <span>Outros Custos</span>
                </div>
                <span className="calc-cost-item-val">
                  R$ {calculations.periodOtherCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: CONFIGURAR CUSTOS & METAS */}
      {activeTab === 'settings' && (
        <motion.div 
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          {/* Section 1: Empresa de Aluguel */}
          <div className="card" style={{ padding: '18px' }}>
            <label className="calc-section-title" style={{ display: 'block' }}>
              Qual empresa de aluguel você usa?
            </label>
            <div className="calc-pill-grid">
              {rentalCompanies.map((company) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => setConfig(p => ({ ...p, rentalCompany: company }))}
                  className={`calc-pill-btn ${config.rentalCompany === company ? 'active' : ''}`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Custos (Aluguel + Outros Custos) */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="calc-section-title" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Custos
            </h3>

            {/* Rental Cost Input */}
            <div className="input-group">
              <label>Aluguel ({config.rentalPeriod})</label>
              <div className="calc-input-wrapper">
                <span className="calc-currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.rentalCost || ''}
                  onChange={(e) => setConfig(p => ({ ...p, rentalCost: parseFloat(e.target.value) || 0 }))}
                  placeholder="3342.51"
                  className="calc-input-with-prefix"
                />
                <div className="calc-cycle-toggle">
                  <button
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, rentalPeriod: 'Mês' }))}
                    className={`calc-cycle-btn ${config.rentalPeriod === 'Mês' ? 'active' : ''}`}
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, rentalPeriod: 'Semana' }))}
                    className={`calc-cycle-btn ${config.rentalPeriod === 'Semana' ? 'active' : ''}`}
                  >
                    Semana
                  </button>
                </div>
              </div>
            </div>

            {/* Other Monthly Costs */}
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                Outros Custos Mensais
                <span title="Ex: MEI, seguro, lava-jato, plano de celular">
                  <HelpCircle size={14} style={{ color: '#94a3b8' }} />
                </span>
              </label>
              <div className="calc-input-wrapper">
                <span className="calc-currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.otherMonthlyCosts || ''}
                  onChange={(e) => setConfig(p => ({ ...p, otherMonthlyCosts: parseFloat(e.target.value) || 0 }))}
                  placeholder="120.00"
                  className="calc-input-with-prefix"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Combustível */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="calc-section-title" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Combustível
            </h3>

            {/* Fuel Type */}
            <div>
              <label className="input-group" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo de Combustível</span>
              </label>
              <div className="calc-pill-grid">
                {fuelTypes.map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, fuelType: fuel }))}
                    className={`calc-pill-btn ${config.fuelType === fuel ? 'active' : ''}`}
                  >
                    {fuel}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Price & Consumption */}
            <div className="calc-input-row">
              <div className="input-group">
                <label>Preço p/ Litro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.fuelPrice || ''}
                  onChange={(e) => setConfig(p => ({ ...p, fuelPrice: parseFloat(e.target.value) || 0 }))}
                  placeholder="5.89"
                />
              </div>
              <div className="input-group">
                <label>Consumo (km/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.avgConsumption || ''}
                  onChange={(e) => setConfig(p => ({ ...p, avgConsumption: parseFloat(e.target.value) || 0 }))}
                  placeholder="15.0"
                />
                {realAvg ? (
                  <button
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, avgConsumption: parseFloat(realAvg.toFixed(1)) }))}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#ea580c',
                      background: '#fff7ed',
                      border: '1px solid #ffedd5',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      marginTop: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} /> Usar média real ({realAvg.toFixed(1)} km/L)
                  </button>
                ) : (
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                    Ex: 15.0 a 15.5 km/L (2.600km / R$ 1.050)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Jornada & Meta */}
          <div className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 className="calc-section-title" style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
              Jornada & Metas
            </h3>

            <div className="calc-input-row">
              <div className="input-group">
                <label>Dias/Mês</label>
                <input
                  type="number"
                  value={config.workingDaysPerMonth || ''}
                  onChange={(e) => setConfig(p => ({ ...p, workingDaysPerMonth: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="input-group">
                <label>Horas/Dia</label>
                <input
                  type="number"
                  value={config.workingHoursPerDay || ''}
                  onChange={(e) => setConfig(p => ({ ...p, workingHoursPerDay: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="input-group">
                <label>Km/Dia</label>
                <input
                  type="number"
                  value={config.dailyKmTarget || ''}
                  onChange={(e) => setConfig(p => ({ ...p, dailyKmTarget: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Meta Faturamento Mensal (R$)</label>
              <div className="calc-input-wrapper">
                <span className="calc-currency-prefix">R$</span>
                <input
                  type="number"
                  step="100"
                  value={config.targetGrossRevenue || ''}
                  onChange={(e) => setConfig(p => ({ ...p, targetGrossRevenue: parseFloat(e.target.value) || 0 }))}
                  placeholder="10833.00"
                  className="calc-input-with-prefix"
                />
              </div>
            </div>
          </div>

          {/* Submit / Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isSaving ? <Sparkles size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Configurações de Custos
          </button>
        </motion.div>
      )}
    </div>
  );
}
