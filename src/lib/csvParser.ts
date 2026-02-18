export interface OverallKPIs {
  adhBrutaGeneral: number;
  adhNetaGeneral: number;
  productividadGeneral: number;
  absentismoGeneral: number;
  ventasTotales: number;
}

export interface AgentKPI {
  agente: string;
  adherenciaBruta: number;
  adherenciaNeta: number;
  absentismo: number;
  excesoDePausa: number;
  bajaProductividad: number;
  desempenoVolumetrico: number;
  ventasTotales: number;
  area: string;
  gerente: string;
  coordinador: string;
  supervisor: string;
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
  };
}

export async function fetchAgentKPIs(): Promise<AgentKPI[]> {
  const res = await fetch('/data/df_agent_kpis.csv?t=' + Date.now());
  const text = await res.text();
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  const colIndex = (name: string) => headers.findIndex(h => h.includes(name));

  return lines.slice(1).map(line => {
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
      agente: cols[0]?.trim() || '',
      adherenciaBruta: num('adherencia_bruta'),
      adherenciaNeta: num('adherencia_neta'),
      absentismo: num('absentismo'),
      excesoDePausa: num('exceso'),
      bajaProductividad: num('baja_productividad'),
      desempenoVolumetrico: num('desempe'),
      ventasTotales: num('ventas'),
      area: str('area'),
      gerente: str('gerente'),
      coordinador: str('coordinador'),
      supervisor: str('supervisor'),
    };
  });
}

export function calculateKPIsFromAgents(agents: AgentKPI[]): OverallKPIs {
  if (agents.length === 0) {
    return { adhBrutaGeneral: 0, adhNetaGeneral: 0, productividadGeneral: 0, absentismoGeneral: 0, ventasTotales: 0 };
  }
  const activeAgents = agents.filter(a => a.adherenciaBruta > 0 || a.desempenoVolumetrico > 0);
  const count = activeAgents.length || 1;
  
  const avg = (fn: (a: AgentKPI) => number) => activeAgents.reduce((sum, a) => sum + fn(a), 0) / count;
  const total = (fn: (a: AgentKPI) => number) => agents.reduce((sum, a) => sum + fn(a), 0);

  return {
    adhBrutaGeneral: avg(a => a.adherenciaBruta),
    adhNetaGeneral: avg(a => a.adherenciaNeta),
    productividadGeneral: avg(a => a.desempenoVolumetrico),
    absentismoGeneral: avg(a => a.absentismo),
    ventasTotales: total(a => a.ventasTotales),
  };
}

export function getStatusColor(value: number, inverse = false): 'green' | 'yellow' | 'red' {
  if (inverse) {
    if (value < 10) return 'green';
    if (value < 20) return 'yellow';
    return 'red';
  }
  if (value >= 90) return 'green';
  if (value >= 85) return 'yellow';
  return 'red';
}
