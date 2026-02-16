export interface OverallKPIs {
  adhBrutaGeneral: number;
  adhNetaGeneral: number;
  productividadGeneral: number;
  absentismoGeneral: number;
}

export interface AgentKPI {
  agente: string;
  adherenciaBruta: number;
  adherenciaNeta: number;
  absentismo: number;
  excesoDePausa: number;
  bajaProductividad: number;
  desempenoVolumetrico: number;
}

export async function fetchOverallKPIs(): Promise<OverallKPIs> {
  const res = await fetch('/data/df_overall_kpis.csv?t=' + Date.now());
  const text = await res.text();
  const lines = text.trim().split('\n');
  const values = lines[1].split(',').map(Number);
  return {
    adhBrutaGeneral: values[0],
    adhNetaGeneral: values[1],
    productividadGeneral: values[2],
    absentismoGeneral: values[3],
  };
}

export async function fetchAgentKPIs(): Promise<AgentKPI[]> {
  const res = await fetch('/data/df_agent_kpis.csv?t=' + Date.now());
  const text = await res.text();
  const lines = text.trim().split('\n');
  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      agente: cols[0],
      adherenciaBruta: parseFloat(cols[1]),
      adherenciaNeta: parseFloat(cols[2]),
      absentismo: parseFloat(cols[3]),
      excesoDePausa: parseFloat(cols[4]),
      bajaProductividad: parseFloat(cols[5]),
      desempenoVolumetrico: parseFloat(cols[6]),
    };
  });
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
