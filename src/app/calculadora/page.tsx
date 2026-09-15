'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Calculator, 
  DollarSign, 
  Fuel, 
  Car, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Check, 
  Save, 
  HelpCircle, 
  Sparkles, 
  Sliders,
  ChevronRight,
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

  // Fetch saved config & vehicle info on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          fetch('/api/cost-config'),
          fetch('/api/vehicle')
        ]);
        
        const cData = await cRes.json();
        const vData = await vRes.json();

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
    <div className="container pb-28">
      {/* Header Bar */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <Link href="/" className="p-2 rounded-full glass hover:bg-slate-200 transition-colors">
          <ArrowLeft size={22} className="text-slate-700" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
            <Calculator size={22} className="text-amber-500" />
            Calculadora de Custos
          </h1>
          <p className="text-xs text-slate-500 font-medium">Metas, despesas e lucro por Km/Hora</p>
        </div>
        <button 
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all"
          title="Salvar Configurações"
        >
          {isSaving ? <Sparkles size={20} className="animate-spin" /> : <Save size={20} />}
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-200/80 backdrop-blur-md rounded-2xl gap-1">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'details'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart size={17} className={activeTab === 'details' ? 'text-amber-500' : ''} />
          Detalhes & Lucro
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders size={17} className={activeTab === 'settings' ? 'text-amber-500' : ''} />
          Configurar Custos
        </button>
      </div>

      {savedSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm"
        >
          <Check size={16} /> Configurações de custos salvas com sucesso!
        </motion.div>
      )}

      {/* TAB 1: DETALHES & LUCRO */}
      {activeTab === 'details' && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-5"
        >
          {/* Header Period Switcher: DIA | SEMANA | MÊS */}
          <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-600 pl-2">Visualizar Período:</span>
            <div className="flex bg-slate-200/90 rounded-xl p-1 gap-1">
              {(['dia', 'semana', 'mes'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setTimePeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition-all ${
                    timePeriod === p
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p === 'mes' ? 'Mês' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Main Profit Card (Lucro Mensal / Semanal / Diário) */}
          <div className="card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-700/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Lucro {timePeriod === 'mes' ? 'Mensal' : timePeriod === 'semana' ? 'Semanal' : 'Diário'}
              </span>
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 font-extrabold text-xs rounded-full border border-amber-500/30">
                {timePeriod.toUpperCase()}
              </span>
            </div>

            {/* Formula line: Gross Revenue (green) - Costs (red) */}
            <div className="flex items-center gap-2 text-xs font-semibold mb-1">
              <span className="text-emerald-400 font-bold">
                R$ {calculations.periodGross.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-400">-</span>
              <span className="text-rose-400 font-bold">
                R$ {calculations.periodCosts.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="text-slate-400">=</span>
            </div>

            {/* Net Profit Main Display */}
            <div className="flex items-baseline gap-3 my-1">
              <h2 className="text-3xl font-black text-white tracking-tight">
                R$ {calculations.periodNetProfit.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h2>
              <span className={`text-sm font-extrabold px-2 py-0.5 rounded-md ${
                calculations.profitMargin >= 30 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : calculations.profitMargin >= 15
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                ({calculations.profitMargin.toFixed(1)}%)
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
              <Info size={13} className="text-amber-400" />
              Margem de lucro sobre o faturamento estimado de R$ {calculations.periodGross.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>

          {/* 4 Performance Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Ganho por Km */}
            <div className="card bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">Ganho por Km</span>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">
                  R$ {calculations.revPerKm.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-semibold text-slate-400"> /km</span>
              </div>
            </div>

            {/* Custo por Km */}
            <div className="card bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">Custo por Km</span>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">
                  R$ {calculations.costPerKm.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-semibold text-slate-400"> /km</span>
              </div>
            </div>

            {/* Ganho por Hora */}
            <div className="card bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">Ganho por Hora</span>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">
                  R$ {calculations.revPerHour.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-semibold text-slate-400"> /hr</span>
              </div>
            </div>

            {/* Custo por Hora */}
            <div className="card bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <span className="text-xs font-bold text-slate-500">Custo por Hora</span>
              <div className="mt-2">
                <span className="text-xl font-black text-slate-900">
                  R$ {calculations.costPerHour.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs font-semibold text-slate-400"> /hr</span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation: "Simule Ganhos Maiores" */}
          <div className="card bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Zap size={16} className="text-amber-500 fill-amber-500" />
                Simule Ganhos Maiores
              </span>
              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
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
              className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />

            <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
              <span>Atual (+0%)</span>
              <span>+15%</span>
              <span>+30%</span>
              <span>+50%</span>
            </div>
          </div>

          {/* Call to Action Button: "Aplicar $/Km e $/Hr no Semáforo" */}
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-base shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <Sparkles size={20} className="animate-spin" />
            ) : (
              <>
                <Check size={20} />
                Aplicar $/Km e $/Hr no Semáforo
              </>
            )}
          </button>

          {/* Breakdown of Costs for Selected Period */}
          <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Custos {timePeriod === 'mes' ? 'Mensais' : timePeriod === 'semana' ? 'Semanais' : 'Diários'}</span>
              <span className="text-rose-600 font-black">
                R$ {calculations.periodCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </h3>

            <div className="space-y-2 text-xs">
              {/* Rental */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Car size={15} className="text-slate-400" />
                  <span>Aluguel do Veículo ({config.rentalCompany})</span>
                </div>
                <span className="font-extrabold text-slate-900">
                  R$ {calculations.periodRentalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Fuel */}
              <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Fuel size={15} className="text-slate-400" />
                  <span>Combustível ({config.fuelType} @ R$ {config.fuelPrice.toFixed(2)})</span>
                </div>
                <span className="font-extrabold text-slate-900">
                  R$ {calculations.periodFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Other costs */}
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <DollarSign size={15} className="text-slate-400" />
                  <span>Outros Custos Fixos</span>
                </div>
                <span className="font-extrabold text-slate-900">
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
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-5"
        >
          {/* Section 1: Empresa de Aluguel */}
          <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="text-xs font-extrabold text-slate-700 block">
              Qual empresa de aluguel você usa?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {rentalCompanies.map((company) => (
                <button
                  key={company}
                  type="button"
                  onClick={() => setConfig(p => ({ ...p, rentalCompany: company }))}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    config.rentalCompany === company
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {company}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Custos (Aluguel + Outros Custos) */}
          <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Custos Fixos
            </h3>

            {/* Rental Cost Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600">Aluguel do Veículo</label>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, rentalPeriod: 'Mês' }))}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      config.rentalPeriod === 'Mês' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, rentalPeriod: 'Semana' }))}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                      config.rentalPeriod === 'Semana' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.rentalCost || ''}
                  onChange={(e) => setConfig(p => ({ ...p, rentalCost: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            {/* Other Monthly Costs */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                Outros Custos Mensais
                <span title="Ex: MEI, seguro, lava-jato, plano de celular">
                  <HelpCircle size={14} className="text-slate-400" />
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={config.otherMonthlyCosts || ''}
                  onChange={(e) => setConfig(p => ({ ...p, otherMonthlyCosts: parseFloat(e.target.value) || 0 }))}
                  placeholder="120,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Combustível */}
          <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Combustível
            </h3>

            {/* Fuel Type */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">Tipo de Combustível</label>
              <div className="grid grid-cols-3 gap-2">
                {fuelTypes.map((fuel) => (
                  <button
                    key={fuel}
                    type="button"
                    onClick={() => setConfig(p => ({ ...p, fuelType: fuel }))}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all ${
                      config.fuelType === fuel
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {fuel}
                  </button>
                ))}
              </div>
            </div>

            {/* Fuel Price & Consumption */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Preço p/ Litro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={config.fuelPrice || ''}
                  onChange={(e) => setConfig(p => ({ ...p, fuelPrice: parseFloat(e.target.value) || 0 }))}
                  placeholder="5.89"
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Consumo (km/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={config.avgConsumption || ''}
                  onChange={(e) => setConfig(p => ({ ...p, avgConsumption: parseFloat(e.target.value) || 0 }))}
                  placeholder="12.5"
                  className="w-full px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Jornada & Meta de Faturamento */}
          <div className="card bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2">
              Jornada de Trabalho & Meta
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Dias/Mês</label>
                <input
                  type="number"
                  value={config.workingDaysPerMonth || ''}
                  onChange={(e) => setConfig(p => ({ ...p, workingDaysPerMonth: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Horas/Dia</label>
                <input
                  type="number"
                  value={config.workingHoursPerDay || ''}
                  onChange={(e) => setConfig(p => ({ ...p, workingHoursPerDay: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Km/Dia</label>
                <input
                  type="number"
                  value={config.dailyKmTarget || ''}
                  onChange={(e) => setConfig(p => ({ ...p, dailyKmTarget: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">Meta de Faturamento Bruto Mensal</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  step="100"
                  value={config.targetGrossRevenue || ''}
                  onChange={(e) => setConfig(p => ({ ...p, targetGrossRevenue: parseFloat(e.target.value) || 0 }))}
                  placeholder="10833,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-slate-900 focus:bg-white focus:border-amber-500 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Submit / Save Button */}
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Sparkles size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Configurações de Custos
          </button>
        </motion.div>
      )}
    </div>
  );
}
