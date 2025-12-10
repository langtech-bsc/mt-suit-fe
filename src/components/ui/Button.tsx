import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = "primary", size = "md", fullWidth = false, className = "", children, ...props }, ref) => {
        const baseStyles = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

        const variantStyles = {
            primary: "bg-bsc-blue-medium text-white hover:bg-bsc-blue-dark focus:ring-bsc-blue-medium shadow-md",
            secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
            outline: "border-2 border-bsc-blue-medium text-bsc-blue-medium hover:bg-bsc-blue-medium hover:text-white focus:ring-bsc-blue-medium dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-800",
            ghost: "text-bsc-blue-medium hover:bg-blue-50 focus:ring-bsc-blue-medium dark:text-slate-100 dark:hover:bg-slate-800",
            danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-md dark:bg-red-500 dark:hover:bg-red-400",
        };

        const sizeStyles = {
            sm: "px-3 py-1.5 text-sm",
            md: "px-6 py-3 text-base",
            lg: "px-8 py-4 text-lg",
        };

        const widthStyle = fullWidth ? "w-full" : "";

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";
