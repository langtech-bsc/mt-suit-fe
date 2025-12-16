import { Select } from "./ui";
import { useLanguagesStore } from "../features/languages/store/languages.store";
import { useLanguagesQuery } from "../features/languages/queries/useLanguagesQuery";

interface LanguageSelectorProps {
    label: string;
    selectedCode: string;
    onChange: (code: string) => void;
    excludeCode?: string;
}

export function LanguageSelector({ label, selectedCode, onChange, excludeCode }: Readonly<LanguageSelectorProps>) {
    const { isLoading, error } = useLanguagesQuery();
    const languages = useLanguagesStore((state) => state.languages);

    const options = languages
        .filter((language) => language.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((lang) => ({
            value: lang.isoCode,
            label: lang.name,
            disabled: lang.isoCode === excludeCode,
        }));

    return (
        <Select
            label={label}
            value={selectedCode}
            onChange={(e) => onChange(e.target.value)}
            options={options}
            disabled={options.length === 0}
            helperText={isLoading ? 'Cargando idiomas…' : error ? error.message : undefined}
        />
    );
}
