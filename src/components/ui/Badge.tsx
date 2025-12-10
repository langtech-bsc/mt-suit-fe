import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
    size?: BadgeSize;
    icon?: ReactNode;
}

export function Badge({
    variant = "default",
    size = "md",
    icon,
    className = "",
    children,
    ...props
}: BadgeProps) {
    const variantStyles: Record<BadgeVariant, string> = {
        default: "bg-bsc-blue-medium/10 text-bsc-blue-medium",
        success: "bg-emerald-50 text-emerald-700",
        warning: "bg-amber-50 text-amber-700",
        danger: "bg-red-50 text-red-700",
        info: "bg-blue-50 text-bsc-blue-medium",
        outline: "bg-transparent border border-bsc-blue-medium text-bsc-blue-medium",
    };

    const sizeStyles: Record<BadgeSize, string> = {
        sm: "text-xs px-2 py-0.5",
        md: "text-sm px-3 py-1",
    };

    return (
        <span
            className={`inline-flex items-center gap-1.5 font-medium rounded-full tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            {...props}
        >
            {icon && <span className="inline-flex items-center text-current">{icon}</span>}
            {children}
        </span>
    );
}
