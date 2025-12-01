import { HTMLAttributes } from "react";

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
}: CardProps) {
    const variantStyles = {
        default: "bg-white border border-gray-200",
        outlined: "bg-transparent border-2 border-gray-300",
        elevated: "bg-white shadow-lg border border-gray-100",
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
