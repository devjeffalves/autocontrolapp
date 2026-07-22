'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, ChevronRight, Filter, Loader2, Pencil, Trash2, X, Save, 
  Search, RotateCcw, ArrowUpDown, TrendingUp, DollarSign, Navigation, 
  Fuel, Gauge, Clock, Award, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Historico() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<any>(null);

  // Estados dos Filtros
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'tudo' | 'hoje' | 'semana' | 'mes' | 'selecionar_mes' | 'ano' | 'custom'>('tudo');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'todos' | 'Aplicativos' | 'Passeio'>('todos');
  const [sortBy, setSortBy] = useState<'recentes' | 'antigos' | 'lucro_desc' | 'ganhos_desc' | 'km_desc'>('recentes');
  const [viewMode, setViewMode] = useState<'rides' | 'fuelings'>('rides');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [rRes, vRes] = await Promise.all([
        fetch('/api/rides'),
        fetch('/api/vehicle')
      ]);
      const rData = await rRes.json();
      const vData = await vRes.json();
      if (rData.success) setHistory(rData.data);
      if (vData.success) setVehicle(vData.data);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const formatForDateTimeInput = (dateVal: any) => {
    if (!dateVal) return '';
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

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

  const resetFilters = () => {
    setSearchQuery('');
    setPeriodFilter('tudo');
    setStartDate('');
    setEndDate('');
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setPlatformFilter('todos');
    setSortBy('recentes');
  };

  // Preço médio do combustível global
  const { avgFuelPrice, globalConsumptionNum } = useMemo(() => {
    let totalFuelCost = 0;
    let totalLitres = 0;
    let totalKm = 0;

    history.forEach(r => {
      const kmTotal = (r.kmEnd || 0) - r.kmStart;
      const rideLitres = r.fuelings?.reduce((fAcc: number, fCurr: any) => fAcc + (fCurr.litres || 0), 0) || 0;
      totalLitres += rideLitres;
      totalKm += kmTotal;
      r.fuelings?.forEach((f: any) => {
        totalFuelCost += (f.cost || 0);
      });
    });

    const price = totalLitres > 0 ? (totalFuelCost / totalLitres) : 5.50;
    const calculatedAvg = totalLitres > 0 ? (totalKm / totalLitres) : 0;
    const isAvgInconsistent = totalLitres > 0 && (calculatedAvg < 6 || calculatedAvg > 22);

    const consumption = (totalLitres > 0 && !isAvgInconsistent)
      ? calculatedAvg
      : (vehicle?.avgConsumption || 14.5);

    return { avgFuelPrice: price, globalConsumptionNum: consumption };
  }, [history, vehicle]);

  // Filtragem e Ordenação do Histórico
  const filteredHistory = useMemo(() => {
    const now = new Date();
    
    return history.filter(item => {
      const itemDate = new Date(item.date || item.createdAt || Date.now());

      // 1. Filtro por Plataforma
      if (platformFilter !== 'todos' && item.platform !== platformFilter) {
        return false;
      }

      // 2. Filtro por Período
      if (periodFilter === 'hoje') {
        const isToday = itemDate.getDate() === now.getDate() &&
          itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (periodFilter === 'semana') {
        const day = now.getDay();
        const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        if (itemDate < monday || itemDate > sunday) return false;
      } else if (periodFilter === 'mes') {
        const isThisMonth = itemDate.getMonth() === now.getMonth() &&
          itemDate.getFullYear() === now.getFullYear();
        if (!isThisMonth) return false;
      } else if (periodFilter === 'selecionar_mes') {
        if (selectedMonth) {
          const [yearStr, monthStr] = selectedMonth.split('-');
          const year = parseInt(yearStr, 10);
          const month = parseInt(monthStr, 10) - 1;
          const isSelectedMonth = itemDate.getFullYear() === year && itemDate.getMonth() === month;
          if (!isSelectedMonth) return false;
        }
      } else if (periodFilter === 'ano') {
        if (itemDate.getFullYear() !== now.getFullYear()) return false;
      } else if (periodFilter === 'custom') {
        if (startDate) {
          const sDate = new Date(startDate);
          sDate.setHours(0, 0, 0, 0);
          if (itemDate < sDate) return false;
        }
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (itemDate > eDate) return false;
        }
      }

      // 3. Busca por texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const platformMatch = item.platform?.toLowerCase().includes(query);
        const earningsMatch = (item.earnings || 0).toString().includes(query);
        const kmMatch = ((item.kmEnd || 0) - item.kmStart).toString().includes(query);
        const dateMatch = itemDate.toLocaleDateString('pt-BR').includes(query);
        
        if (!platformMatch && !earningsMatch && !kmMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const getLucro = (r: any) => {
        const itemKm = (r.kmEnd || 0) - r.kmStart;
        const fuelCost = (itemKm / globalConsumptionNum) * avgFuelPrice;
        return (r.earnings || 0) - fuelCost;
      };

      if (sortBy === 'recentes') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'antigos') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'ganhos_desc') {
        return (b.earnings || 0) - (a.earnings || 0);
      } else if (sortBy === 'lucro_desc') {
        return getLucro(b) - getLucro(a);
      } else if (sortBy === 'km_desc') {
        return ((b.kmEnd || 0) - b.kmStart) - ((a.kmEnd || 0) - a.kmStart);
      }
      return 0;
    });
  }, [history, platformFilter, periodFilter, startDate, endDate, searchQuery, sortBy, globalConsumptionNum, avgFuelPrice]);

  // Cálculo de Métricas com Base nos Filtros
  const metrics = useMemo(() => {
    let grossEarnings = 0;
    let totalKm = 0;
    let totalFuelLitres = 0;
    let totalFuelCost = 0;
    let totalHours = 0;
    let totalRides = 0;

    filteredHistory.forEach(item => {
      const itemKm = (item.kmEnd || 0) - item.kmStart;
      totalKm += itemKm;
      
      if (item.platform !== 'Passeio') {
        grossEarnings += item.earnings || 0;
        totalRides += item.rides || 0;
      }

      item.fuelings?.forEach((f: any) => {
        totalFuelCost += f.cost || 0;
        totalFuelLitres += f.litres || 0;
      });

      if (item.startTime && item.endTime) {
        const diffMs = new Date(item.endTime).getTime() - new Date(item.startTime).getTime();
        if (diffMs > 0) {
          totalHours += diffMs / (1000 * 60 * 60);
        }
      }
    });

    const consumoReal = totalFuelLitres > 0 ? (totalKm / totalFuelLitres) : globalConsumptionNum;
    const fuelCostConsumed = (totalKm / globalConsumptionNum) * avgFuelPrice;
    const netProfit = grossEarnings - fuelCostConsumed;

    const costPerKm = totalKm > 0 ? (fuelCostConsumed / totalKm) : 0;
    const profitPerKm = totalKm > 0 ? (netProfit / totalKm) : 0;
    const profitPerHour = totalHours > 0 ? (netProfit / totalHours) : 0;
    const earningsPerRide = totalRides > 0 ? (grossEarnings / totalRides) : 0;

    return {
      grossEarnings,
      netProfit,
      totalKm,
      totalFuelCost,
      totalFuelLitres,
      consumoReal,
      costPerKm,
      profitPerKm,
      profitPerHour,
      earningsPerRide,
      totalHours,
      totalRides
    };
  }, [filteredHistory, globalConsumptionNum, avgFuelPrice]);

  // Extração e filtragem de abastecimentos para a pesquisa de Gastos com Combustível
  const filteredFuelings = useMemo(() => {
    const list: Array<{
      id: string;
      rideId: string;
      cost: number;
      litres: number;
      pricePerLitre: number;
      date: Date;
      km?: number;
      platform: string;
    }> = [];

    const now = new Date();

    history.forEach((ride) => {
      if (ride.fuelings && ride.fuelings.length > 0) {
        ride.fuelings.forEach((f: any, fIdx: number) => {
          const itemDate = new Date(f.date || ride.date || ride.createdAt || Date.now());

          // 1. Filtro por Período
          if (periodFilter === 'hoje') {
            const isToday = itemDate.getDate() === now.getDate() &&
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear();
            if (!isToday) return;
          } else if (periodFilter === 'semana') {
            const day = now.getDay();
            const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(now);
            monday.setDate(diffToMonday);
            monday.setHours(0, 0, 0, 0);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            sunday.setHours(23, 59, 59, 999);

            if (itemDate < monday || itemDate > sunday) return;
          } else if (periodFilter === 'mes') {
            const isThisMonth = itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear();
            if (!isThisMonth) return;
          } else if (periodFilter === 'selecionar_mes') {
            if (selectedMonth) {
              const [yearStr, monthStr] = selectedMonth.split('-');
              const year = parseInt(yearStr, 10);
              const month = parseInt(monthStr, 10) - 1;
              const isSelectedMonth = itemDate.getFullYear() === year && itemDate.getMonth() === month;
              if (!isSelectedMonth) return;
            }
          } else if (periodFilter === 'ano') {
            if (itemDate.getFullYear() !== now.getFullYear()) return;
          } else if (periodFilter === 'custom') {
            if (startDate) {
              const sDate = new Date(startDate);
              sDate.setHours(0, 0, 0, 0);
              if (itemDate < sDate) return;
            }
            if (endDate) {
              const eDate = new Date(endDate);
              eDate.setHours(23, 59, 59, 999);
              if (itemDate > eDate) return;
            }
          }

          // 2. Busca por texto
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const costMatch = (f.cost || 0).toString().includes(query);
            const litresMatch = (f.litres || 0).toString().includes(query);
            const dateMatch = itemDate.toLocaleDateString('pt-BR').includes(query);
            const kmMatch = (f.km || 0).toString().includes(query);

            if (!costMatch && !litresMatch && !dateMatch && !kmMatch) {
              return;
            }
          }

          const pricePerLitre = f.litres > 0 ? (f.cost / f.litres) : 0;
          list.push({
            id: `${ride._id}-${fIdx}`,
            rideId: ride._id,
            cost: f.cost || 0,
            litres: f.litres || 0,
            pricePerLitre,
            date: itemDate,
            km: f.km || (ride.kmEnd ? ride.kmEnd : ride.kmStart),
            platform: ride.platform
          });
        });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [history, periodFilter, selectedMonth, startDate, endDate, searchQuery]);

  const fuelMetrics = useMemo(() => {
    let totalSpent = 0;
    let totalLitres = 0;

    filteredFuelings.forEach(f => {
      totalSpent += f.cost;
      totalLitres += f.litres;
    });

    const avgPricePerLitre = totalLitres > 0 ? (totalSpent / totalLitres) : 0;

    return {
      totalSpent,
      totalLitres,
      avgPricePerLitre,
      count: filteredFuelings.length
    };
  }, [filteredFuelings]);

  const hasActiveFilters = searchQuery !== '' || periodFilter !== 'tudo' || platformFilter !== 'todos' || sortBy !== 'recentes';

  return (
    <div className="historico-page">
      <header className="header">
        <div>
          <h1 className="title">Histórico</h1>
          <p className="subtitle">Relatório detalhado de corridas e desempenho</p>
        </div>
        <button 
          className={`filter-btn glass ${hasActiveFilters ? 'active' : ''}`}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          title="Filtros de Pesquisa"
        >
          <Filter size={20} />
          {hasActiveFilters && <span className="active-dot" />}
        </button>
      </header>

      {/* Abas de Navegação de Visualização */}
      <div className="view-mode-tabs">
        <button 
          className={`view-tab ${viewMode === 'rides' ? 'active' : ''}`}
          onClick={() => setViewMode('rides')}
        >
          <Navigation size={16} /> Turnos & Corridas ({filteredHistory.length})
        </button>
        <button 
          className={`view-tab ${viewMode === 'fuelings' ? 'active' : ''}`}
          onClick={() => setViewMode('fuelings')}
        >
          <Fuel size={16} /> Gastos com Combustível ({filteredFuelings.length})
        </button>
      </div>

      {/* Barra de Busca Rápida */}
      <div className="search-bar card glass">
        <Search size={18} className="text-muted" />
        <input 
          type="text" 
          placeholder={viewMode === 'rides' ? "Buscar por data, valor, km ou plataforma..." : "Buscar por valor (R$), litros, data ou km..."} 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Barra Rápida de Seleção de Período & Filtro Instantâneo de Mês */}
      <div className="quick-period-bar">
        <div className="chip-group scrollable">
          {[
            { id: 'tudo', label: 'Tudo' },
            { id: 'hoje', label: 'Hoje' },
            { id: 'semana', label: 'Esta Semana' },
            { id: 'mes', label: 'Este Mês' },
            { id: 'selecionar_mes', label: 'Escolher Mês 📅' },
            { id: 'ano', label: 'Este Ano' },
          ].map(p => (
            <button 
              key={p.id}
              className={`chip ${periodFilter === p.id ? 'active' : ''}`}
              onClick={() => {
                setPeriodFilter(p.id as any);
                if (p.id === 'selecionar_mes' && !selectedMonth) {
                  setSelectedMonth(new Date().toISOString().slice(0, 7));
                }
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodFilter === 'selecionar_mes' && (
          <motion.div 
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="quick-month-selector card glass"
          >
            <Calendar size={16} className="text-muted" />
            <label>Filtrar Mês:</label>
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
            />
          </motion.div>
        )}
      </div>

      {/* Painel de Filtros Expansível */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="filter-panel card glass"
          >
            <div className="panel-header">
              <h3>Filtros & Ordenação</h3>
              {hasActiveFilters && (
                <button className="reset-btn" onClick={resetFilters}>
                  <RotateCcw size={14} /> Limpar Filtros
                </button>
              )}
            </div>

            <div className="filter-group">
              <label>Período de Análise</label>
              <div className="chip-group">
                {[
                  { id: 'tudo', label: 'Tudo' },
                  { id: 'hoje', label: 'Hoje' },
                  { id: 'semana', label: '7 Dias' },
                  { id: 'mes', label: 'Este Mês' },
                  { id: 'selecionar_mes', label: 'Escolher Mês 📅' },
                  { id: 'ano', label: 'Este Ano' },
                  { id: 'custom', label: 'Personalizado' },
                ].map(p => (
                  <button 
                    key={p.id}
                    className={`chip ${periodFilter === p.id ? 'active' : ''}`}
                    onClick={() => setPeriodFilter(p.id as any)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {periodFilter === 'selecionar_mes' && (
              <div className="custom-dates">
                <div className="date-input">
                  <label>Mês Selecionado:</label>
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)} 
                  />
                </div>
              </div>
            )}

            {periodFilter === 'custom' && (
              <div className="custom-dates">
                <div className="date-input">
                  <label>De:</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="date-input">
                  <label>Até:</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="filter-row">
              <div className="filter-group half">
                <label>Atividade</label>
                <select value={platformFilter} onChange={e => setPlatformFilter(e.target.value as any)}>
                  <option value="todos">Todas</option>
                  <option value="Aplicativos">Aplicativos (Trabalho)</option>
                  <option value="Passeio">Passeio (Lazer)</option>
                </select>
              </div>

              <div className="filter-group half">
                <label>Ordenar Por</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                  <option value="recentes">Data (Mais Recente)</option>
                  <option value="antigos">Data (Mais Antigo)</option>
                  <option value="lucro_desc">Maior Lucro Líquido</option>
                  <option value="ganhos_desc">Maior Faturamento</option>
                  <option value="km_desc">Maior Quilometragem</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Renderização Condicional de Acordo com a Aba Selecionada */}
      {viewMode === 'rides' ? (
        <>
          {/* Banner de Métricas Detalhadas de Faturamento e Rendimento Veicular */}
          <section className="summary-banner card">
            <div className="banner-top">
              <div className="main-metric">
                <span className="metric-label">Lucro Líquido Real</span>
                <h2 className="metric-value positive">R$ {metrics.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              </div>
              <div className="main-metric align-right">
                <span className="metric-label">Faturamento Bruto</span>
                <h2 className="metric-value">R$ {metrics.grossEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
              </div>
            </div>

            <div className="banner-divider-h" />

            <div className="metrics-grid">
              <div className="grid-item">
                <div className="item-icon-bg green">
                  <Navigation size={16} />
                </div>
                <div>
                  <p className="grid-label">Total Rodado</p>
                  <p className="grid-value">{metrics.totalKm.toLocaleString('pt-BR')} km</p>
                </div>
              </div>

              <div className="grid-item">
                <div className="item-icon-bg blue">
                  <Gauge size={16} />
                </div>
                <div>
                  <p className="grid-label">Rendimento Automóvel</p>
                  <p className="grid-value">{metrics.consumoReal.toFixed(1)} km/L</p>
                </div>
              </div>

              <div className="grid-item">
                <div className="item-icon-bg purple">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="grid-label">Lucro / KM</p>
                  <p className="grid-value">R$ {metrics.profitPerKm.toFixed(2)}/km</p>
                </div>
              </div>

              <div className="grid-item">
                <div className="item-icon-bg orange">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="grid-label">Rendimento / Hora</p>
                  <p className="grid-value">R$ {metrics.profitPerHour.toFixed(2)}/h</p>
                </div>
              </div>
            </div>
          </section>

          {/* Lista do Histórico de Turnos */}
          <div className="history-list-header">
            <span>Exibindo <strong>{filteredHistory.length}</strong> de {history.length} turnos</span>
          </div>

          <div className="history-list">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="loading-state">
                  <Loader2 className="animate-spin" />
                  <p>Carregando histórico...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="empty-state card glass">
                  <Search size={32} className="text-muted" />
                  <p>Nenhum turno encontrado para os filtros selecionados.</p>
                  {hasActiveFilters && (
                    <button className="reset-btn mt" onClick={resetFilters}>
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredHistory.map((item, index) => (
                  <motion.div 
                    key={item._id || index} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    className={`history-item glass ${isDeleting === item._id ? 'deleting' : ''}`}
                  >
                    <div className="history-date">
                      <div className="date-group">
                        <Calendar size={14} className="text-muted" />
                        <span>{new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="actions">
                        <button className="action-btn edit" onClick={() => setEditingItem(item)} title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(item._id)} title="Excluir">
                          {isDeleting === item._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="history-main mt-2">
                      <div>
                        <span className={`platform-tag ${item.platform?.toLowerCase()}`}>
                          {item.platform || 'Aplicativos'}
                        </span>
                        <p className="history-meta">
                          {(item.kmEnd || 0) - item.kmStart} km • {item.rides || 0} corridas
                        </p>
                      </div>
                      <div className="earnings-group">
                        <span className="earning-value">
                          R$ {(item.earnings || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        {item.platform !== 'Passeio' && (
                          <span className="profit-badge positive">
                            Lucro: R$ {(((item.earnings || 0) - (((item.kmEnd || 0) - item.kmStart) / globalConsumptionNum) * avgFuelPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <>
          {/* Banner de Métricas de Gastos com Combustível */}
          <section className="summary-banner fuel-banner card">
            <div className="banner-top">
              <div className="main-metric">
                <span className="metric-label">Gasto Total com Combustível</span>
                <h2 className="metric-value" style={{ color: '#38bdf8' }}>
                  R$ {fuelMetrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h2>
              </div>
              <div className="main-metric align-right">
                <span className="metric-label">Total de Litros</span>
                <h2 className="metric-value">{fuelMetrics.totalLitres.toFixed(1)} L</h2>
              </div>
            </div>

            <div className="banner-divider-h" />

            <div className="metrics-grid">
              <div className="grid-item">
                <div className="item-icon-bg blue">
                  <Fuel size={16} />
                </div>
                <div>
                  <p className="grid-label">Preço Médio / Litro</p>
                  <p className="grid-value">R$ {fuelMetrics.avgPricePerLitre.toFixed(2)}/L</p>
                </div>
              </div>

              <div className="grid-item">
                <div className="item-icon-bg orange">
                  <Gauge size={16} />
                </div>
                <div>
                  <p className="grid-label">Abastecimentos</p>
                  <p className="grid-value">{fuelMetrics.count} registros</p>
                </div>
              </div>
            </div>
          </section>

          {/* Lista de Abastecimentos */}
          <div className="history-list-header">
            <span>Exibindo <strong>{filteredFuelings.length}</strong> abastecimentos</span>
          </div>

          <div className="history-list">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="loading-state">
                  <Loader2 className="animate-spin" />
                  <p>Carregando abastecimentos...</p>
                </div>
              ) : filteredFuelings.length === 0 ? (
                <div className="empty-state card glass">
                  <Fuel size={32} className="text-muted" />
                  <p>Nenhum abastecimento encontrado para os filtros selecionados.</p>
                  {hasActiveFilters && (
                    <button className="reset-btn mt" onClick={resetFilters}>
                      Limpar Filtros
                    </button>
                  )}
                </div>
              ) : (
                filteredFuelings.map((fuel, index) => (
                  <motion.div 
                    key={fuel.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: Math.min(index * 0.03, 0.3) }}
                    className="history-item fuel-item glass"
                  >
                    <div className="history-date">
                      <div className="date-group">
                        <Calendar size={14} className="text-muted" />
                        <span>{fuel.date.toLocaleDateString('pt-BR')} às {fuel.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <span className="platform-tag" style={{ background: '#0284c7', color: 'white' }}>
                        Combustível
                      </span>
                    </div>

                    <div className="history-main" style={{ marginTop: '10px' }}>
                      <div className="history-meta">
                        <p style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>
                          {fuel.litres.toFixed(2)} Litros
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Preço/L: R$ {fuel.pricePerLitre.toFixed(2)} {fuel.km ? `• KM no posto: ${fuel.km}` : ''}
                        </p>
                      </div>
                      <div className="earnings-group">
                        <span className="earning-value" style={{ fontSize: '1.15rem', color: '#0284c7', fontWeight: '800' }}>
                          R$ {fuel.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}

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
                  <div className="form-group">
                    <label>Início do Turno</label>
                    <input 
                      type="datetime-local" 
                      value={formatForDateTimeInput(editingItem.startTime)} 
                      onChange={e => setEditingItem({...editingItem, startTime: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Fim do Turno</label>
                    <input 
                      type="datetime-local" 
                      value={formatForDateTimeInput(editingItem.endTime)} 
                      onChange={e => setEditingItem({...editingItem, endTime: e.target.value})}
                    />
                  </div>
                  <div className="form-group full">
                    <label>Tipo / Plataforma</label>
                    <select 
                      value={editingItem.platform} 
                      onChange={e => setEditingItem({...editingItem, platform: e.target.value})}
                    >
                      <option value="Aplicativos">Aplicativos</option>
                      <option value="Passeio">Passeio</option>
                    </select>
                  </div>
                </div>

                {/* Seção de Abastecimentos no Modal */}
                <div className="modal-fuelings-section">
                  <h4 className="fuelings-title">Abastecimentos do Turno</h4>
                  
                  <div className="modal-fuelings-list">
                    {!editingItem.fuelings || editingItem.fuelings.length === 0 ? (
                      <p className="no-fuelings">Nenhum abastecimento associado.</p>
                    ) : (
                      editingItem.fuelings.map((f: any, fIdx: number) => (
                        <div key={fIdx} className="modal-fueling-item">
                          <span>R$ {f.cost.toFixed(2)} • {f.litres}L {f.km ? `• ${f.km} KM` : ''}</span>
                          <button 
                            type="button" 
                            className="remove-fueling-btn"
                            onClick={() => {
                              const updatedFuelings = [...editingItem.fuelings];
                              updatedFuelings.splice(fIdx, 1);
                              setEditingItem({ ...editingItem, fuelings: updatedFuelings });
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="add-fueling-quick">
                    <h5>Adicionar Abastecimento</h5>
                    <div className="quick-inputs">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="R$ 0,00"
                        id="quick-cost"
                      />
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00 L"
                        id="quick-litres"
                      />
                      <input 
                        type="number" 
                        placeholder="KM no posto"
                        id="quick-km"
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const costEl = document.getElementById('quick-cost') as HTMLInputElement;
                          const litresEl = document.getElementById('quick-litres') as HTMLInputElement;
                          const kmEl = document.getElementById('quick-km') as HTMLInputElement;
                          
                          if (costEl && litresEl) {
                            const cost = parseFloat(costEl.value);
                            const litres = parseFloat(litresEl.value);
                            const km = kmEl.value ? parseInt(kmEl.value) : undefined;
                            
                            if (cost > 0 && litres > 0) {
                              const newF = {
                                cost,
                                litres,
                                km,
                                date: new Date()
                              };
                              const updatedFuelings = [...(editingItem.fuelings || []), newF];
                              setEditingItem({ ...editingItem, fuelings: updatedFuelings });
                              
                              costEl.value = '';
                              litresEl.value = '';
                              kmEl.value = '';
                            } else {
                              alert('Preencha Valor e Litros.');
                            }
                          }
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button type="submit" className="save-btn" style={{ marginTop: '10px' }}>
                  <Save size={18} />
                  Salvar Alterações
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .historico-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 40px;
        }

        .view-mode-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 14px;
        }

        .view-tab {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          border: none;
          background: transparent;
          border-radius: 10px;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-tab.active {
          background: white;
          color: var(--primary);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 6px;
        }

        .title {
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1.2;
        }

        .subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .filter-btn {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          position: relative;
          color: var(--foreground);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn.active {
          border-color: var(--primary);
          background: rgba(37, 99, 235, 0.1);
          color: var(--primary);
        }

        .active-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--primary);
        }

        /* Search Bar */
        .search-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 14px;
          background: #ffffff;
        }

        .search-bar input {
          border: none;
          background: transparent;
          width: 100%;
          font-size: 0.9rem;
          color: var(--foreground);
          outline: none;
        }

        .clear-search {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
        }

        /* Painel de Filtros */
        .filter-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 18px;
          overflow: hidden;
          background: white;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h3 {
          font-size: 0.95rem;
          font-weight: 700;
        }

        .reset-btn {
          background: none;
          border: none;
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group.half {
          flex: 1;
        }

        .filter-row {
          display: flex;
          gap: 12px;
        }

        .filter-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .filter-group select {
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--card-border);
          background: #f8fafc;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--foreground);
        }

        .quick-period-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }

        .chip-group.scrollable {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 4px;
          scrollbar-width: none;
          white-space: nowrap;
        }

        .chip-group.scrollable::-webkit-scrollbar {
          display: none;
        }

        .quick-month-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 12px;
          background: white;
          border: 1px solid var(--primary-glow);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
          align-self: flex-start;
        }

        .quick-month-selector label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .quick-month-selector input[type="month"] {
          border: 1px solid var(--card-border);
          border-radius: 8px;
          padding: 4px 8px;
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--foreground);
          background: #f8fafc;
          outline: none;
          cursor: pointer;
        }

        .chip-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid var(--card-border);
          background: #f8fafc;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .chip.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .custom-dates {
          display: flex;
          gap: 12px;
          background: #f8fafc;
          padding: 10px;
          border-radius: 10px;
        }

        .date-input {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
        }

        .date-input label {
          font-size: 0.75rem;
          font-weight: 700;
        }

        .date-input input {
          width: 100%;
          padding: 6px;
          border-radius: 6px;
          border: 1px solid var(--card-border);
          font-size: 0.8rem;
        }

        /* Summary Banner */
        .summary-banner {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          padding: 20px;
          border: none;
          color: white;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.4);
        }

        .banner-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .main-metric .metric-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          font-weight: 700;
        }

        .main-metric.align-right {
          text-align: right;
        }

        .main-metric .metric-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
        }

        .main-metric .metric-value.positive {
          color: #4ade80;
        }

        .banner-divider-h {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .grid-item {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.05);
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .item-icon-bg {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .item-icon-bg.green { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
        .item-icon-bg.blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .item-icon-bg.purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
        .item-icon-bg.orange { background: rgba(249, 115, 22, 0.2); color: #fb923c; }

        .grid-label {
          font-size: 0.65rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .grid-value {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .history-list-header {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 0 4px;
        }

        .history-list-header strong {
          color: var(--foreground);
        }

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

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          text-align: center;
          padding: 40px 20px;
          color: var(--text-muted);
        }

        .empty-state .reset-btn.mt {
          margin-top: 8px;
          background: var(--primary);
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
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
          background: white;
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
          background: rgba(248, 250, 252, 0.8);
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

        .platform-tag.aplicativos {
          background: #000;
          color: #fff;
        }

        .platform-tag.passeio {
          background: var(--success);
          color: white;
        }

        .history-meta {
          font-size: 0.825rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .history-earnings {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .earnings-group {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .earning-value {
          font-weight: 800;
          font-size: 1.05rem;
          color: var(--foreground);
        }

        .profit-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .profit-badge.positive {
          background: #dcfce7;
          color: #166534;
        }

        .profit-badge.negative {
          background: #fee2e2;
          color: #991b1b;
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
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 12px;
        }

        .modal-content {
          width: 100%;
          max-width: 450px;
          padding: 20px;
          background: white;
          border-radius: 16px;
          margin: auto;
          max-height: 85dvh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-shrink: 0;
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
          padding: 4px;
        }

        .edit-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
          overflow-y: auto;
          padding-right: 4px;
          flex: 1;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          padding: 9px 12px;
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
          flex-shrink: 0;
        }

        .save-btn:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        .modal-fuelings-section {
          border-top: 1px solid var(--glass-border);
          padding-top: 12px;
          margin-top: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fuelings-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .modal-fuelings-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 100px;
          overflow-y: auto;
        }

        .no-fuelings {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-style: italic;
        }

        .modal-fueling-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid #f1f5f9;
        }

        .remove-fueling-btn {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px;
        }

        .add-fueling-quick {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: #f8fafc;
          padding: 10px;
          border-radius: 8px;
          border: 1px dashed var(--glass-border);
        }

        .add-fueling-quick h5 {
          font-size: 0.725rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .quick-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 6px;
          align-items: center;
        }

        .quick-inputs input {
          padding: 6px 8px !important;
          font-size: 0.75rem !important;
          font-weight: 600;
          border-radius: 6px !important;
        }

        .quick-inputs button {
          background: var(--primary);
          color: white;
          border: none;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 480px) {
          .title {
            font-size: 1.25rem;
          }
          .metrics-grid {
            grid-template-columns: 1fr;
          }
          .filter-row {
            flex-direction: column;
          }
          .form-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .form-group.full {
            grid-column: span 1;
          }
          .modal-overlay {
            padding: 8px;
          }
          .modal-content {
            padding: 14px;
            max-height: 82dvh;
            border-radius: 14px;
          }
          .quick-inputs {
            grid-template-columns: 1fr 1fr;
          }
          .quick-inputs input:nth-child(3) {
            grid-column: span 2;
          }
          .quick-inputs button {
            grid-column: span 2;
            width: 100%;
            height: 34px;
          }
        }
      `}</style>
    </div>
  );
}

