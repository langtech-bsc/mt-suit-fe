import { SUPPORTED_LANGUAGES } from "../data/languages";
import { Select } from "./ui";

interface LanguageSelectorProps {
    label: string;
    selectedCode: string;
    onChange: (code: string) => void;
    excludeCode?: string;
}

export function LanguageSelector({ label, selectedCode, onChange, excludeCode }: Readonly<LanguageSelectorProps>) {
    const options = SUPPORTED_LANGUAGES.map((lang) => ({
        value: lang.code,
        label: lang.name,
        disabled: lang.code === excludeCode,
    }));

    return (
        <Select
            label={label}
            value={selectedCode}
            onChange={(e) => onChange(e.target.value)}
            options={options}
        />
    );
}
