export interface Language {
    code: string;
    name: string;
    isRTL?: boolean;
}

export const SUPPORTED_LANGUAGES: Language[] = [
    // Co-official & Specific Varieties
    { code: "es", name: "Spanish" },
    { code: "ca", name: "Catalan" },
    { code: "eu", name: "Basque" },
    { code: "gl", name: "Galician" },
    { code: "an", name: "Aragonese" },
    { code: "oc", name: "Aranese (Occitan)" }, // Often mapped to Occitan
    { code: "ast", name: "Asturian" },

    // European Languages (Common subset to reach ~38 total)
    { code: "en", name: "English" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "nl", name: "Dutch" },
    { code: "pl", name: "Polish" },
    { code: "ro", name: "Romanian" },
    { code: "sv", name: "Swedish" },
    { code: "da", name: "Danish" },
    { code: "fi", name: "Finnish" },
    { code: "el", name: "Greek" },
    { code: "cs", name: "Czech" },
    { code: "hu", name: "Hungarian" },
    { code: "bg", name: "Bulgarian" },
    { code: "sk", name: "Slovak" },
    { code: "sl", name: "Slovenian" },
    { code: "et", name: "Estonian" },
    { code: "lv", name: "Latvian" },
    { code: "lt", name: "Lithuanian" },
    { code: "ga", name: "Irish" },
    { code: "mt", name: "Maltese" },
    { code: "hr", name: "Croatian" },
    { code: "is", name: "Icelandic" },
    { code: "no", name: "Norwegian" },
    { code: "uk", name: "Ukrainian" },
    { code: "ru", name: "Russian" },
    { code: "sr", name: "Serbian" },

    // RTL Support
    { code: "ar", name: "Arabic", isRTL: true },
];
