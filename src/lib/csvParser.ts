export interface OverallKPIs {
  adhBrutaGeneral: number;
  adhNetaGeneral: number;
  productividadGeneral: number;
  absentismoGeneral: number;
  ventasTotales: number;
  primariasTotal: number;
}

export interface DailyAgentRecord {
  agente: string;
  fecha: string;       // dd/mm/yyyy
  area: string;
  gerente: string;
  coordinador: string;
  supervisor: string;
  adhBruta: number;
  adhNeta: number;
  productividad: number;
  absentismo: number;
  ventasHoy: number;
  primarias: number;
  novedad: string;
  novedadAjustada: string;
}

/** Aggregated agent KPIs (computed from daily records) */
export interface AgentKPI {
  agente: string;
  area: string;
  gerente: string;
  coordinador: string;
  supervisor: string;
  adherenciaBruta: number;
  adherenciaNeta: number;
  productividad: number;
  absentismo: number;
  ventasTotales: number;
  primariasTotal: number;
  diasTrabajados: number;
  // KPI ponderado
  kpiHigienicos: number;    // (ADH*0.10 + Prod*0.20 + Abs*0.10) 
  kpiComerciales: number;   // (Primarias*0.20 + Ventas*0.40)
  kpiTotal: number;         // Higiénicos*0.40 + Comerciales*0.60
}

// ── Parsing helpers ──

function parseDate(dateStr: string): Date | null {
  // dd/mm/yyyy
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  return new Date(y, m - 1, d);
}

export function isDateInRange(dateStr: string, from: Date | null, to: Date | null): boolean {
  if (!from && !to) return true;
  const d = parseDate(dateStr);
  if (!d) return true;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export async function fetchOverallKPIs(): Promise<OverallKPIs> {
  const res = await fetch('/data/df_overall_kpis.csv?t=' + Date.now());
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const values = lines[1].split(',').map(Number);

  const idx = (name: string) => {
    const i = headers.findIndex(h => h.includes(name));
    return i >= 0 ? values[i] : 0;
  };

  return {
    adhBrutaGeneral: idx('bruta'),
    adhNetaGeneral: idx('neta'),
    productividadGeneral: idx('productividad'),
    absentismoGeneral: idx('absentismo'),
    ventasTotales: idx('ventas'),
    primariasTotal: idx('primarias'),
  };
}

export async function fetchDailyRecords(): Promise<DailyAgentRecord[]> {
  const res = await fetch('/data/df_daily_kpis.csv?t=' + Date.now());
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const colIndex = (name: string) => headers.findIndex(h => h.includes(name));

  return lines.slice(1).filter(l => l.trim()).map(line => {
    // Handle commas inside fields (not expected here, but safe)
    const cols = line.split(',');
    const num = (name: string) => {
      const i = colIndex(name);
      return i >= 0 ? parseFloat(cols[i]) || 0 : 0;
    };
    const str = (name: string) => {
      const i = colIndex(name);
      return i >= 0 ? (cols[i] || '').trim() : '';
    };

    return {
      agente: (cols[0] || '').trim(),
      fecha: (cols[1] || '').trim(),
      area: str('area'),
      gerente: str('gerente'),
      coordinador: str('coordinador'),
      supervisor: str('supervisor'),
      adhBruta: num('adh_bruta'),
      adhNeta: num('adh_neta'),
      productividad: num('productividad'),
      absentismo: num('absentismo'),
      ventasHoy: num('ventas'),
      primarias: num('primarias'),
      novedad: str('novedad'),
      novedadAjustada: cols[cols.length - 1]?.trim() || '',
    };
  });
}

// ── Aggregation ──

/** Score helpers for KPI ponderado */
function adherenciaScore(avg: number): number {
  // 100 if >= 95, proportional below
  return Math.min(avg / 95 * 100, 100);
}

function productividadScore(avg: number): number {
  // Optimal 55-72 → 100, outside → proportional penalty
  if (avg >= 55 && avg <= 72) return 100;
  if (avg < 55) return (avg / 55) * 100;
  // > 72 → penalize
  return Math.max(0, 100 - ((avg - 72) / 28) * 100);
}

function absentismoScore(avg: number): number {
  // ≤ 10% → 100, > 10% → proportional penalty
  if (avg <= 10) return 100;
  return Math.max(0, 100 - ((avg - 10) / 90) * 100);
}

function ventasScore(total: number): number {
  // Normalize: 10+ ventas = 100
  return Math.min((total / 10) * 100, 100);
}

function primariasScoreFn(total: number): number {
  // Normalize: 5+ primarias = 100 (placeholder threshold, adjust when real data arrives)
  return Math.min((total / 5) * 100, 100);
}

export function aggregateAgents(records: DailyAgentRecord[]): AgentKPI[] {
  const byAgent = new Map<string, DailyAgentRecord[]>();
  records.forEach(r => {
    const list = byAgent.get(r.agente) || [];
    list.push(r);
    byAgent.set(r.agente, list);
  });

  return Array.from(byAgent.entries()).map(([agente, recs]) => {
    // Only count working days (adhBruta > 0 or has some activity)
    const workDays = recs.filter(r => r.adhBruta > 0 || r.productividad > 0);
    const count = workDays.length || 1;

    const avgAdhBruta = workDays.reduce((s, r) => s + r.adhBruta, 0) / count;
    const avgAdhNeta = workDays.reduce((s, r) => s + r.adhNeta, 0) / count;
    const avgProd = workDays.reduce((s, r) => s + r.productividad, 0) / count;
    const avgAbs = recs.reduce((s, r) => s + r.absentismo, 0) / recs.length; // all days
    const totalVentas = recs.reduce((s, r) => s + r.ventasHoy, 0);
    const totalPrimarias = recs.reduce((s, r) => s + r.primarias, 0);

    const first = recs[0];

    // KPI scoring
    const adhScore = adherenciaScore((avgAdhBruta + avgAdhNeta) / 2);
    const prodScore = productividadScore(avgProd);
    const absScore = absentismoScore(avgAbs);
    const vScore = ventasScore(totalVentas);
    const pScore = primariasScoreFn(totalPrimarias);

    const kpiH = (adhScore * 0.10 + prodScore * 0.20 + absScore * 0.10);
    const kpiC = (pScore * 0.20 + vScore * 0.40);
    const kpiTotal = kpiH * 0.40 + kpiC * 0.60;

    return {
      agente,
      area: first.area,
      gerente: first.gerente,
      coordinador: first.coordinador,
      supervisor: first.supervisor,
      adherenciaBruta: avgAdhBruta,
      adherenciaNeta: avgAdhNeta,
      productividad: avgProd,
      absentismo: avgAbs,
      ventasTotales: totalVentas,
      primariasTotal: totalPrimarias,
      diasTrabajados: workDays.length,
      kpiHigienicos: kpiH,
      kpiComerciales: kpiC,
      kpiTotal,
    };
  });
}

export function calculateKPIsFromAgents(agents: AgentKPI[]): OverallKPIs {
  if (agents.length === 0) {
    return { adhBrutaGeneral: 0, adhNetaGeneral: 0, productividadGeneral: 0, absentismoGeneral: 0, ventasTotales: 0, primariasTotal: 0 };
  }
  const active = agents.filter(a => a.adherenciaBruta > 0 || a.productividad > 0);
  const count = active.length || 1;

  const avg = (fn: (a: AgentKPI) => number) => active.reduce((sum, a) => sum + fn(a), 0) / count;
  const total = (fn: (a: AgentKPI) => number) => agents.reduce((sum, a) => sum + fn(a), 0);

  return {
    adhBrutaGeneral: avg(a => a.adherenciaBruta),
    adhNetaGeneral: avg(a => a.adherenciaNeta),
    productividadGeneral: avg(a => a.productividad),
    absentismoGeneral: avg(a => a.absentismo),
    ventasTotales: total(a => a.ventasTotales),
    primariasTotal: total(a => a.primariasTotal),
  };
}

export function getStatusColor(value: number, inverse = false): 'green' | 'yellow' | 'red' {
  if (inverse) {
    if (value <= 10) return 'green';
    return 'red';
  }
  if (value >= 90) return 'green';
  if (value >= 85) return 'yellow';
  return 'red';
}

/** Get unique dates from daily records (for date range) */
export function getDateRange(records: DailyAgentRecord[]): { min: string; max: string } {
  if (records.length === 0) return { min: '', max: '' };
  let minD = records[0].fecha;
  let maxD = records[0].fecha;
  records.forEach(r => {
    const d = parseDate(r.fecha);
    if (!d) return;
    if (d < (parseDate(minD) || d)) minD = r.fecha;
    if (d > (parseDate(maxD) || d)) maxD = r.fecha;
  });
  return { min: minD, max: maxD };
}
