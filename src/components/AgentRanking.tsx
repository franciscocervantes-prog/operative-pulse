import { AgentKPI } from '@/lib/csvParser';

interface AgentRankingProps {
  agents: AgentKPI[];
}

export default function AgentRanking({ agents }: AgentRankingProps) {
  const withData = [...agents].filter(a => a.adherenciaBruta > 0 || a.absentismo > 0);
  const sorted = [...withData].sort((a, b) => b.absentismo - a.absentismo);

  const top5Worst = sorted.slice(0, 5);
  const top5Best = [...withData]
    .sort((a, b) => a.absentismo - b.absentismo)
    .slice(0, 5);

  const maxValue = top5Worst[0]?.absentismo || 100;
  const LIMIT = 10; // %

  return (
    <div className="dashboard-card h-full">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Ranking de Agentes – Absentismo
      </h3>
      <div className="grid grid-cols-2 gap-6">
        {/* Mayor Absentismo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-danger inline-block" />
            <span className="text-xs font-semibold uppercase tracking-wider text-danger">Mayor Impacto</span>
          </div>
          <div className="space-y-2">
            {top5Worst.map((agent, i) => {
              const overLimit = agent.absentismo > LIMIT;
              return (
                <div key={agent.agente} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-foreground font-medium truncate max-w-[130px]">{agent.agente}</span>
                    <span className={`font-mono font-semibold ${overLimit ? 'text-danger' : 'text-warning'}`}>
                      {agent.absentismo.toFixed(1)}%
                      {overLimit && ' 🚨'}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${Math.max((agent.absentismo / Math.max(maxValue, LIMIT)) * 100, 5)}%`,
                        background: overLimit
                          ? 'linear-gradient(90deg, hsl(0, 72%, 40%), hsl(0, 72%, 55%))'
                          : 'linear-gradient(90deg, hsl(45, 93%, 45%), hsl(45, 93%, 58%))',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Menor Absentismo */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            <span className="text-xs font-semibold uppercase tracking-wider text-success">Dentro de Parámetro</span>
          </div>
          <div className="space-y-2">
            {top5Best.map((agent, i) => (
              <div key={agent.agente} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium truncate max-w-[130px]">{agent.agente}</span>
                  <span className="font-mono text-success font-semibold">{agent.absentismo.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${Math.max((agent.absentismo / Math.max(maxValue, LIMIT)) * 100, 3)}%`,
                      background: 'linear-gradient(90deg, hsl(142, 71%, 35%), hsl(142, 71%, 50%))',
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
