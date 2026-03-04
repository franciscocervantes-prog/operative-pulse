import { LoadProgress } from '@/hooks/useDataLoader';

interface LoadingOverlayProps {
  progress: LoadProgress;
}

const stageLabels: Record<string, string> = {
  idle: 'Iniciando...',
  fetching: 'Descargando datos...',
  parsing: 'Procesando registros...',
  aggregating: 'Calculando KPIs...',
  done: '¡Listo!',
  error: 'Error al cargar datos',
};

export default function LoadingOverlay({ progress }: LoadingOverlayProps) {
  if (progress.stage === 'done') return null;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 w-80">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        
        <p className="text-sm font-semibold text-foreground">
          {stageLabels[progress.stage] || 'Cargando...'}
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="flex justify-between w-full text-[10px] text-muted-foreground">
          <span>{progress.percent}%</span>
          {progress.totalRows && (
            <span>
              {progress.processedRows
                ? `${progress.processedRows.toLocaleString('es-MX')} / ${progress.totalRows.toLocaleString('es-MX')} filas`
                : `${progress.totalRows.toLocaleString('es-MX')} filas`}
            </span>
          )}
        </div>

        {progress.message && (
          <p className={`text-xs ${progress.stage === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
            {progress.message}
          </p>
        )}
      </div>
    </div>
  );
}
