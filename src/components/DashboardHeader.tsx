import { useEffect, useState } from 'react';
import { Activity, Moon, Sun } from 'lucide-react';

interface DashboardHeaderProps {
  darkMode?: boolean;
  onToggleDark?: () => void;
}

export default function DashboardHeader({ darkMode, onToggleDark }: DashboardHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-2">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Dashboard Operativo — México
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Monitoreo en tiempo real
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors"
          title={darkMode ? 'Modo normal' : 'Modo negro'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="text-right">
          <p className="text-sm font-mono font-semibold text-foreground">
            {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {time.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </header>
  );
}
