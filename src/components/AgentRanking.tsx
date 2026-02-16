import { AgentKPI } from '@/lib/csvParser';

interface AgentRankingProps {
  agents: AgentKPI[];
}

export default function AgentRanking({ agents }: AgentRankingProps) {
  const sorted = [...agents]
    .filter(a => a.desempenoVolumetrico > 0 || a.adherenciaBruta > 0)
    .sort((a, b) => b.desempenoVolumetrico - a.desempenoVolumetrico);

  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.filter(a => a.desempenoVolumetrico > 0).slice(-5).reverse();
  const maxValue = top5[0]?.desempenoVolumetrico || 100;

  return (
    <div className="dashboard-card h-full">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Ranking de Agentes
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Top 5 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            <span className="text-xs font-semibold uppercase tracking-wider text-success">Top 5</span>
          </div>
          <div className="space-y-2">
            {top5.map((agent, i) => (
              <div key={agent.agente} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium truncate max-w-[140px]">{agent.agente}</span>
                  <span className="font-mono text-success font-semibold">{agent.desempenoVolumetrico.toFixed(1)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${(agent.desempenoVolumetrico / maxValue) * 100}%`,
                      background: 'linear-gradient(90deg, hsl(142, 71%, 35%), hsl(142, 71%, 50%))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom 5 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-danger inline-block" />
            <span className="text-xs font-semibold uppercase tracking-wider text-danger">Bottom 5</span>
          </div>
          <div className="space-y-2">
            {bottom5.map((agent, i) => (
              <div key={agent.agente} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium truncate max-w-[140px]">{agent.agente}</span>
                  <span className="font-mono text-danger font-semibold">{agent.desempenoVolumetrico.toFixed(1)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.max((agent.desempenoVolumetrico / maxValue) * 100, 5)}%`,
                      background: 'linear-gradient(90deg, hsl(0, 72%, 40%), hsl(0, 72%, 55%))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
