import type { HTMLAttributes } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "outlined" | "elevated";
    padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
    variant = "default",
    padding = "md",
    className = "",
    children,
    ...props
}: Readonly<CardProps>) {
    const variantStyles = {
        default: "bg-white border border-gray-200 dark:bg-slate-900 dark:border-slate-800",
        outlined: "bg-transparent border-2 border-gray-300 dark:border-slate-700",
        elevated: "bg-white shadow-lg border border-gray-100 dark:bg-slate-900 dark:border-slate-700",
    };

    const paddingStyles = {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
    };

    return (
        <div
            className={`rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
