import { AgentKPI } from '@/lib/csvParser';
import { useMemo } from 'react';

interface KPIBreakdownProps {
  agents: AgentKPI[];
}

export default function KPIBreakdown({ agents }: KPIBreakdownProps) {
  const avgKPI = useMemo(() => {
    if (agents.length === 0) return { total: 0, hig: 0, com: 0 };
    const sum = agents.reduce(
      (acc, a) => ({
        total: acc.total + a.kpiTotal,
        hig: acc.hig + a.kpiHigienicos,
        com: acc.com + a.kpiComerciales,
      }),
      { total: 0, hig: 0, com: 0 }
    );
    const n = agents.length;
    return { total: sum.total / n, hig: sum.hig / n, com: sum.com / n };
  }, [agents]);

  const items = [
    { label: 'KPI Total', value: avgKPI.total, weight: '100%', color: 'hsl(var(--primary))' },
    { label: 'Higiénicos', value: avgKPI.hig, weight: '40%', color: 'hsl(var(--chart-line))' },
    { label: 'Comerciales', value: avgKPI.com, weight: '60%', color: 'hsl(var(--accent))' },
  ];

  return (
    <div className="dashboard-card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        📊 Ponderación KPI
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
            <p className="text-2xl font-mono font-bold" style={{ color: item.color }}>
              {item.value.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">Peso: {item.weight}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 text-[9px] text-muted-foreground text-center">
        Higiénicos = ADH(10%) + Productividad(20%) + Absentismo(10%) | Comerciales = Primarias(20%) + Ventas(40%)
      </div>
    </div>
  );
}
