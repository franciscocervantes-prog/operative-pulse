import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyAgentRecord } from '@/lib/csvParser';
import { useMemo } from 'react';

interface SalesChartProps {
  records: DailyAgentRecord[];
}

export default function SalesChart({ records }: SalesChartProps) {
  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, number>();
    records.forEach(r => {
      const parts = r.fecha.split('/');
      if (parts.length !== 3) return;
      const key = `${parts[1]}/${parts[2]}`; // mm/yyyy
      byMonth.set(key, (byMonth.get(key) || 0) + r.ventasHoy);
    });

    const monthNames: Record<string, string> = {
      '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
      '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
      '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
    };

    return Array.from(byMonth.entries())
      .sort((a, b) => {
        const [ma, ya] = a[0].split('/').map(Number);
        const [mb, yb] = b[0].split('/').map(Number);
        return ya !== yb ? ya - yb : ma - mb;
      })
      .map(([key, ventas]) => {
        const [m, y] = key.split('/');
        return { mes: `${monthNames[m] || m} ${y}`, ventas };
      });
  }, [records]);

  const totalVentas = monthlyData.reduce((s, d) => s + d.ventas, 0);

  return (
    <div className="dashboard-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          💰 Ventas Generadas en el Periodo
        </h3>
        <span className="text-lg font-mono font-bold text-foreground">
          {totalVentas.toLocaleString('es-MX')} ventas
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsla(220, 10%, 55%, 0.1)" />
          <XAxis
            dataKey="mes"
            stroke="hsla(220, 10%, 55%, 0.5)"
            tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }}
          />
          <YAxis
            stroke="hsla(220, 10%, 55%, 0.5)"
            tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0, 0%, 10%)',
              border: '1px solid hsl(220, 10%, 18%)',
              borderRadius: '8px',
              color: 'hsl(0, 0%, 95%)',
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="ventas"
            fill="hsl(142, 71%, 45%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
