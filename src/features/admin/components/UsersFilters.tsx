import { Input, Select } from '../../../components/ui'

export type UsersStatusFilter = 'all' | 'active' | 'inactive'

export interface UsersFiltersState {
  query: string
  status: UsersStatusFilter
  role: string
}

interface UsersFiltersProps {
  state: UsersFiltersState
  roleOptions: string[]
  onChange: (next: UsersFiltersState) => void
}

export const UsersFilters = ({ state, roleOptions, onChange }: UsersFiltersProps) => {
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-4">
      <div className="md:col-span-2">
        <Input
          label="Buscar"
          placeholder="Filtrar por nombre o email…"
          value={state.query}
          onChange={(event) => onChange({ ...state, query: event.target.value })}
        />
      </div>
      <Select
        label="Estado"
        value={state.status}
        onChange={(event) => onChange({ ...state, status: event.target.value as UsersStatusFilter })}
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'active', label: 'Activos' },
          { value: 'inactive', label: 'Inactivos' },
        ]}
      />
      <Select
        label="Rol"
        value={state.role}
        onChange={(event) => onChange({ ...state, role: event.target.value })}
        options={[
          { value: 'all', label: 'Todos' },
          ...roleOptions.map((value) => ({ value, label: value })),
        ]}
      />
    </div>
  )
}

