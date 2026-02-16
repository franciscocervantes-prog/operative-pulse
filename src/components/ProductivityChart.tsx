import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useEffect, useState } from 'react';

interface ProductivityChartProps {
  currentValue: number;
  meta: number;
}

export default function ProductivityChart({ currentValue, meta }: ProductivityChartProps) {
  const [data, setData] = useState<{ hora: string; valor: number }[]>([]);

  useEffect(() => {
    // Simulate hourly data points for the day
    const now = new Date();
    const hours = now.getHours();
    const points = [];
    for (let i = 8; i <= Math.min(hours, 22); i++) {
      // Simulate realistic variation around the current value
      const variation = (Math.random() - 0.5) * 4;
      points.push({
        hora: `${i.toString().padStart(2, '0')}:00`,
        valor: Math.max(0, currentValue + variation),
      });
    }
    // Last point is the actual current value
    if (points.length > 0) {
      points[points.length - 1].valor = currentValue;
    }
    setData(points);
  }, [currentValue]);

  return (
    <div className="dashboard-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Productividad en Tiempo Real
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-chart-line inline-block" />
            Actual
          </span>
          <span className="text-muted-foreground">Meta: {meta}%</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorProductividad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsla(220, 10%, 55%, 0.1)" />
          <XAxis
            dataKey="hora"
            stroke="hsla(220, 10%, 55%, 0.5)"
            tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }}
          />
          <YAxis
            stroke="hsla(220, 10%, 55%, 0.5)"
            tick={{ fill: 'hsl(220, 10%, 55%)', fontSize: 11 }}
            domain={[0, 'auto']}
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
          <Area
            type="monotone"
            dataKey="valor"
            stroke="hsl(199, 89%, 48%)"
            strokeWidth={2.5}
            fill="url(#colorProductividad)"
            dot={{ fill: 'hsl(199, 89%, 48%)', r: 3 }}
            activeDot={{ r: 5, fill: 'hsl(199, 89%, 48%)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
