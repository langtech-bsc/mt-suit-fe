import { Input, Select } from '../../../components/ui'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-4">
      <div className="md:col-span-2">
        <Input
          label={t('usersFilters.searchLabel')}
          placeholder={t('usersFilters.searchPlaceholder')}
          value={state.query}
          onChange={(event) => onChange({ ...state, query: event.target.value })}
        />
      </div>
      <Select
        label={t('usersFilters.statusLabel')}
        value={state.status}
        onChange={(event) => onChange({ ...state, status: event.target.value as UsersStatusFilter })}
        options={[
          { value: 'all', label: t('usersFilters.statusAll') },
          { value: 'active', label: t('usersFilters.statusActive') },
          { value: 'inactive', label: t('usersFilters.statusInactive') },
        ]}
      />
      <Select
        label={t('usersFilters.roleLabel')}
        value={state.role}
        onChange={(event) => onChange({ ...state, role: event.target.value })}
        options={[
          { value: 'all', label: t('usersFilters.roleAll') },
          ...roleOptions.map((value) => ({ value, label: value })),
        ]}
      />
    </div>
  )
}
