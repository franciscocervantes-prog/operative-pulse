import { AgentKPI } from '@/lib/csvParser';
import { AlertTriangle, XCircle } from 'lucide-react';

interface Alert {
  agente: string;
  kpi: string;
  valor: number;
  nivel: 'critical' | 'warning';
}

interface AlertPanelProps {
  agents: AgentKPI[];
}

const ABSENTISMO_LIMIT = 10; // %

function generateAlerts(agents: AgentKPI[]): Alert[] {
  const alerts: Alert[] = [];

  agents.forEach(agent => {
    // KPI total < 100 → warning
    if (agent.kpiTotal < 100) {
      alerts.push({ agente: agent.agente, kpi: 'KPI Total', valor: agent.kpiTotal, nivel: agent.kpiTotal < 50 ? 'critical' : 'warning' });
    }
    // Absentismo > 10%
    if (agent.absentismo > ABSENTISMO_LIMIT) {
      alerts.push({ agente: agent.agente, kpi: 'Absentismo', valor: agent.absentismo, nivel: 'critical' });
    }
    if (agent.adherenciaBruta > 0 && agent.adherenciaBruta < 80) {
      alerts.push({ agente: agent.agente, kpi: 'Adherencia Bruta', valor: agent.adherenciaBruta, nivel: 'critical' });
    }
    if (agent.adherenciaNeta > 0 && agent.adherenciaNeta < 75) {
      alerts.push({ agente: agent.agente, kpi: 'Adherencia Neta', valor: agent.adherenciaNeta, nivel: 'critical' });
    }
  });

  return alerts
    .sort((a, b) => (a.nivel === 'critical' ? -1 : 1) - (b.nivel === 'critical' ? -1 : 1))
    .slice(0, 30);
}

export default function AlertPanel({ agents }: AlertPanelProps) {
  const alerts = generateAlerts(agents);

  return (
    <div className="dashboard-card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          🚨 Alertas Operativas
        </h3>
        <span className="text-xs font-mono text-danger font-semibold">
          {alerts.length} alertas
        </span>
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sin alertas activas ✅</p>
        ) : (
          alerts.map((alert, i) => (
            <div
              key={`${alert.agente}-${alert.kpi}-${i}`}
              className={`alert-card ${alert.nivel === 'critical' ? 'alert-critical' : 'alert-warning'} animate-fade-in-up`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-2">
                {alert.nivel === 'critical' ? (
                  <XCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{alert.agente}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {alert.kpi}: <span className={`font-mono font-semibold ${alert.nivel === 'critical' ? 'text-danger' : 'text-warning'}`}>
                      {alert.valor.toFixed(1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
