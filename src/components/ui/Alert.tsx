import type { HTMLAttributes, ReactNode } from "react";

export type AlertVariant = "info" | "success" | "warning" | "danger" | "neutral";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    variant?: AlertVariant;
    title?: string;
    description?: string;
    icon?: ReactNode;
    actions?: ReactNode;
}

const defaultIcons: Record<AlertVariant, ReactNode> = {
    info: (
        <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M12 12v4m9-4a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    success: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    ),
    warning: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
    ),
    danger: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10 3h4l8 8-8 8h-4L2 11z" />
        </svg>
    ),
    neutral: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

export function Alert({
    variant = "info",
    title,
    description,
    icon,
    actions,
    className = "",
    children,
    ...props
}: AlertProps) {
    const variantStyles: Record<AlertVariant, string> = {
        info: "border-blue-200 bg-blue-50 text-bsc-blue-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-100",
        warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/60 dark:bg-amber-500/10 dark:text-amber-100",
        danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/60 dark:bg-red-500/15 dark:text-red-100",
        neutral: "border-gray-200 bg-gray-50 text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
    };

    return (
        <div
            role="alert"
            className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${variantStyles[variant]} ${className}`}
            {...props}
        >
            <div className="mt-0.5 text-base">{icon ?? defaultIcons[variant]}</div>
            <div className="flex-1">
                {title && <p className="font-semibold">{title}</p>}
                {description && <p className="mt-1 text-sm opacity-90">{description}</p>}
                {children}
                {actions && <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">{actions}</div>}
            </div>
        </div>
    );
}
