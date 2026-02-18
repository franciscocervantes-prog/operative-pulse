import { AgentKPI } from '@/lib/csvParser';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Filters {
  supervisor: string;
  area: string;
  gerente: string;
  coordinador: string;
}

interface FilterBarProps {
  agents: AgentKPI[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

function getUniqueValues(agents: AgentKPI[], key: keyof AgentKPI): string[] {
  const values = new Set<string>();
  agents.forEach(a => {
    const v = String(a[key]).trim();
    if (v && v !== '0') values.add(v);
  });
  return Array.from(values).sort();
}

export function applyFilters(agents: AgentKPI[], filters: Filters): AgentKPI[] {
  return agents.filter(a => {
    if (filters.supervisor && a.supervisor !== filters.supervisor) return false;
    if (filters.area && a.area !== filters.area) return false;
    if (filters.gerente && a.gerente !== filters.gerente) return false;
    if (filters.coordinador && a.coordinador !== filters.coordinador) return false;
    return true;
  });
}

export const emptyFilters: Filters = { supervisor: '', area: '', gerente: '', coordinador: '' };

export default function FilterBar({ agents, filters, onFiltersChange }: FilterBarProps) {
  const supervisors = getUniqueValues(agents, 'supervisor');
  const areas = getUniqueValues(agents, 'area');
  const gerentes = getUniqueValues(agents, 'gerente');
  const coordinadores = getUniqueValues(agents, 'coordinador');

  const hasFilters = supervisors.length > 0 || areas.length > 0 || gerentes.length > 0 || coordinadores.length > 0;

  if (!hasFilters) return null;

  const update = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value === '__all__' ? '' : value });
  };

  const hasActiveFilter = Object.values(filters).some(v => v !== '');

  const filterConfigs: { key: keyof Filters; label: string; options: string[] }[] = [
    { key: 'area', label: 'Área', options: areas },
    { key: 'gerente', label: 'Gerente', options: gerentes },
    { key: 'coordinador', label: 'Coordinador', options: coordinadores },
    { key: 'supervisor', label: 'Supervisor', options: supervisors },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {filterConfigs
        .filter(f => f.options.length > 0)
        .map(({ key, label, options }) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}:</span>
            <Select value={filters[key] || '__all__'} onValueChange={v => update(key, v)}>
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
