import { useEffect, useState, useCallback, useMemo } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import GaugeChart from '@/components/GaugeChart';
import ProductivityChart from '@/components/ProductivityChart';
import AgentRanking from '@/components/AgentRanking';
import AlertPanel from '@/components/AlertPanel';
import FilterBar, { Filters, applyFilters, emptyFilters } from '@/components/FilterBar';
import { fetchOverallKPIs, fetchAgentKPIs, calculateKPIsFromAgents, getStatusColor, OverallKPIs, AgentKPI } from '@/lib/csvParser';

const PRODUCTIVITY_META = 15;
const REFRESH_INTERVAL = 5 * 60 * 1000;

const Index = () => {
  const [overallRaw, setOverallRaw] = useState<OverallKPIs | null>(null);
  const [agents, setAgents] = useState<AgentKPI[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [darkMode, setDarkMode] = useState(false);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const loadData = useCallback(async () => {
    try {
      const [overallData, agentData] = await Promise.all([
        fetchOverallKPIs(),
        fetchAgentKPIs(),
      ]);
      setOverallRaw(overallData);
      setAgents(agentData);
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

  const hasActiveFilter = Object.values(filters).some(v => v !== '');
  const filteredAgents = useMemo(() => applyFilters(agents, filters), [agents, filters]);

  // Recalculate KPIs from filtered agents when filters are active; otherwise use raw overall
  const overall = useMemo(() => {
    if (!overallRaw) return null;
    if (!hasActiveFilter) return overallRaw;
    return calculateKPIsFromAgents(filteredAgents);
  }, [overallRaw, hasActiveFilter, filteredAgents]);

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

  return (
    <div
      className="min-h-screen p-4 flex flex-col gap-4 transition-colors duration-500"
      style={{
        maxWidth: 1920,
        margin: '0 auto',
        background: darkMode ? '#000000' : undefined,
      }}
    >
      {/* Header */}
      <DashboardHeader darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />

      {/* Filters */}
      <FilterBar agents={agents} filters={filters} onFiltersChange={setFilters} />

      {/* KPIs Gauges */}
      <div className="grid grid-cols-5 gap-4">
        <GaugeChart
          label="Adherencia Bruta"
          value={overall.adhBrutaGeneral}
          color={getStatusColor(overall.adhBrutaGeneral)}
        />
        <GaugeChart
          label="Adherencia Neta"
          value={overall.adhNetaGeneral}
          color={getStatusColor(overall.adhNetaGeneral)}
        />
        <GaugeChart
          label="Productividad"
          value={overall.productividadGeneral}
          color={overall.productividadGeneral >= PRODUCTIVITY_META ? 'green' : 'red'}
          meta={PRODUCTIVITY_META}
        />
        <GaugeChart
          label="Absentismo"
          value={overall.absentismoGeneral * 100}
          color={getStatusColor(overall.absentismoGeneral * 100, true)}
        />
        <GaugeChart
          label="Ventas Totales"
          value={overall.ventasTotales}
          color={overall.ventasTotales > 0 ? 'green' : 'yellow'}
          suffix=""
        />
      </div>

      {/* Bottom Grid: Chart + Ranking + Alerts */}
      <div className="grid grid-cols-12 gap-4 flex-1">
        <div className="col-span-5">
          <ProductivityChart currentValue={overall.productividadGeneral} meta={PRODUCTIVITY_META} />
        </div>
        <div className="col-span-4">
          <AgentRanking agents={filteredAgents} />
        </div>
        <div className="col-span-3">
          <AlertPanel agents={filteredAgents} />
        </div>
      </div>

      {/* Footer */}
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
