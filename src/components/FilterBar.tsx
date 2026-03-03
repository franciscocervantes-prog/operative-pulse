import { AgentKPI, DailyAgentRecord } from '@/lib/csvParser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export interface Filters {
  supervisor: string;
  area: string;
  gerente: string;
  coordinador: string;
  agente: string;
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
}

interface FilterBarProps {
  agents: AgentKPI[];
  allRecords: DailyAgentRecord[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

function getUniqueValues(agents: AgentKPI[], key: keyof AgentKPI): string[] {
  const values = new Set<string>();
  agents.forEach(a => {
    const v = String(a[key]).trim();
    if (v && v !== '0' && v !== 'NaN') values.add(v);
  });
  return Array.from(values).sort();
}

function getUniqueAgentes(records: DailyAgentRecord[]): string[] {
  return Array.from(new Set(records.map(r => r.agente))).sort();
}

export function applyFilters(agents: AgentKPI[], filters: Filters): AgentKPI[] {
  return agents.filter(a => {
    if (filters.supervisor && a.supervisor !== filters.supervisor) return false;
    if (filters.area && a.area !== filters.area) return false;
    if (filters.gerente && a.gerente !== filters.gerente) return false;
    if (filters.coordinador && a.coordinador !== filters.coordinador) return false;
    if (filters.agente && a.agente !== filters.agente) return false;
    return true;
  });
}

export const emptyFilters: Filters = { supervisor: '', area: '', gerente: '', coordinador: '', agente: '', dateFrom: '', dateTo: '' };

export default function FilterBar({ agents, allRecords, filters, onFiltersChange }: FilterBarProps) {
  const supervisors = getUniqueValues(agents, 'supervisor');
  const areas = getUniqueValues(agents, 'area');
  const gerentes = getUniqueValues(agents, 'gerente');
  const coordinadores = getUniqueValues(agents, 'coordinador');
  const agentes = getUniqueAgentes(allRecords);

  const update = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value === '__all__' ? '' : value });
  };

  const hasActiveFilter = Object.values(filters).some(v => v !== '');

  const selectConfigs: { key: keyof Filters; label: string; options: string[] }[] = [
    { key: 'area', label: 'Área', options: areas },
    { key: 'gerente', label: 'Gerente', options: gerentes },
    { key: 'coordinador', label: 'Coordinador', options: coordinadores },
    { key: 'supervisor', label: 'Supervisor', options: supervisors },
    { key: 'agente', label: 'Agente', options: agentes },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Desde:</span>
        <Input
          type="date"
          value={filters.dateFrom}
          onChange={e => update('dateFrom', e.target.value)}
          className="h-7 w-[130px] text-xs bg-secondary border-border"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Hasta:</span>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={e => update('dateTo', e.target.value)}
          className="h-7 w-[130px] text-xs bg-secondary border-border"
        />
      </div>

      {selectConfigs
        .filter(f => f.options.length > 0)
        .map(({ key, label, options }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}:</span>
            <Select value={(filters[key] as string) || '__all__'} onValueChange={v => update(key, v)}>
              <SelectTrigger className="h-7 w-[160px] text-xs bg-secondary border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      {hasActiveFilter && (
        <button
          onClick={() => onFiltersChange(emptyFilters)}
          className="text-[10px] uppercase tracking-wider text-danger hover:text-danger/80 font-semibold transition-colors"
        >
          ✕ Limpiar
        </button>
      )}
    </div>
  );
}
