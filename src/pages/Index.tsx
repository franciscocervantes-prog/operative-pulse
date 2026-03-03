import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import GaugeChart from '@/components/GaugeChart';
import SalesChart from '@/components/SalesChart';
import AgentRanking from '@/components/AgentRanking';
import AlertPanel from '@/components/AlertPanel';
import KPIBreakdown from '@/components/KPIBreakdown';
import FilterBar, { Filters, applyFilters, emptyFilters } from '@/components/FilterBar';
import { fetchOverallKPIs, fetchDailyRecords, aggregateAgents, calculateKPIsFromAgents, getStatusColor, isDateInRange, OverallKPIs, DailyAgentRecord, AgentKPI } from '@/lib/csvParser';

const REFRESH_INTERVAL = 5 * 60 * 1000;

const Index = () => {
  const [overallRaw, setOverallRaw] = useState<OverallKPIs | null>(null);
  const [dailyRecords, setDailyRecords] = useState<DailyAgentRecord[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const loadData = useCallback(async () => {
    try {
      const [overallData, records] = await Promise.all([
        fetchOverallKPIs(),
        fetchDailyRecords(),
      ]);
      setOverallRaw(overallData);
      setDailyRecords(records);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter daily records by date range
  const dateFilteredRecords = useMemo(() => {
    if (!filters.dateFrom && !filters.dateTo) return dailyRecords;
    const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const to = filters.dateTo ? new Date(filters.dateTo + 'T23:59:59') : null;
    return dailyRecords.filter(r => isDateInRange(r.fecha, from, to));
  }, [dailyRecords, filters.dateFrom, filters.dateTo]);

  // Aggregate daily → agent KPIs
  const allAgents = useMemo(() => aggregateAgents(dateFilteredRecords), [dateFilteredRecords]);

  // Apply hierarchy filters
  const hasActiveFilter = Object.values(filters).some(v => v !== '');
  const filteredAgents = useMemo(() => applyFilters(allAgents, filters), [allAgents, filters]);

  // Recalculate overall KPIs
  const overall = useMemo(() => {
    if (!overallRaw && filteredAgents.length === 0) return null;
    if (hasActiveFilter || filters.dateFrom || filters.dateTo) {
      return calculateKPIsFromAgents(filteredAgents);
    }
    return overallRaw;
  }, [overallRaw, hasActiveFilter, filteredAgents, filters.dateFrom, filters.dateTo]);

  if (!overall) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const absentismoValue = overall.absentismoGeneral > 1 ? overall.absentismoGeneral : overall.absentismoGeneral * 100;

  return (
    <div
      className="min-h-screen p-4 flex flex-col gap-4 transition-colors duration-500"
      style={{
        maxWidth: 1920,
        margin: '0 auto',
        background: darkMode ? '#000000' : undefined,
      }}
    >
      <DashboardHeader darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      <FilterBar agents={allAgents} allRecords={dailyRecords} filters={filters} onFiltersChange={setFilters} />

      {/* KPI Breakdown */}
      <KPIBreakdown agents={filteredAgents} />

      {/* KPIs Gauges */}
      <div className="grid grid-cols-5 gap-4">
        <GaugeChart
          label="Adherencia Bruta"
          value={overall.adhBrutaGeneral}
          color={getStatusColor(overall.adhBrutaGeneral)}
          unit="Porcentaje (%)"
          meta={95}
          metaLabel="≥ 95%"
        />
        <GaugeChart
          label="Adherencia Neta"
          value={overall.adhNetaGeneral}
          color={getStatusColor(overall.adhNetaGeneral)}
          unit="Porcentaje (%)"
          meta={97}
          metaLabel="≥ 97%"
        />
        <GaugeChart
          label="Productividad"
          value={overall.productividadGeneral}
          color={
            overall.productividadGeneral >= 55 && overall.productividadGeneral <= 72
              ? 'green'
              : overall.productividadGeneral < 55
              ? 'yellow'
              : 'red'
          }
          unit="Porcentaje (%)"
          rangeMode
          rangeMin={55}
          rangeMax={72}
        />
        <GaugeChart
          label="Absentismo"
          value={absentismoValue}
          color={absentismoValue <= 10 ? 'green' : 'red'}
          unit="Porcentaje (%)"
          meta={10}
          metaLabel="≤ 10%"
          lowerIsBetter
        />
        <GaugeChart
          label="Ventas Totales"
          value={overall.ventasTotales}
          color={overall.ventasTotales >= 10 ? 'green' : overall.ventasTotales >= 5 ? 'yellow' : 'red'}
          suffix=""
          unit="Número de ventas"
          meta={10}
          metaLabel="≥ 10 ventas"
        />
      </div>

      {/* Bottom Grid: Sales + Ranking + Alerts */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        <div className="col-span-5">
          <SalesChart records={dateFilteredRecords} />
        </div>
        <div className="col-span-4">
          <AgentRanking agents={filteredAgents} />
        </div>
        <div className="col-span-3">
          <AlertPanel agents={filteredAgents} />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground px-2">
        <span>
          Actualización automática cada 5 min
          {hasActiveFilter && <span className="ml-2 text-accent font-semibold">• Filtro activo ({filteredAgents.length} agentes)</span>}
        </span>
        <span>Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}</span>
      </div>
    </div>
  );
};

export default Index;
