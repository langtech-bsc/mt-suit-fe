import { useMemo } from "react";
import { Select } from "./ui";
import { useLanguagesStore } from "../features/languages/store/languages.store";
import { useLanguagesQuery } from "../features/languages/queries/useLanguagesQuery";

interface LanguageSelectorProps {
    label: string;
    selectedCode: string;
    onChange: (code: string) => void;
    excludeCode?: string;
    allowedIsoCodes?: string[];
}

export function LanguageSelector({ label, selectedCode, onChange, excludeCode, allowedIsoCodes }: Readonly<LanguageSelectorProps>) {
    const { isLoading, error } = useLanguagesQuery();
    const languages = useLanguagesStore((state) => state.languages);

    const allowedSet = useMemo(() => {
        if (!allowedIsoCodes || allowedIsoCodes.length === 0) {
            return null;
        }
        return new Set(allowedIsoCodes.map((code) => code.trim().toLowerCase()));
    }, [allowedIsoCodes]);

    const options = languages
        .filter((language) => language.isActive)
        .filter((language) => {
            if (!allowedSet) {
                return true;
            }
            return allowedSet.has(language.isoCode.trim().toLowerCase());
        })
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
