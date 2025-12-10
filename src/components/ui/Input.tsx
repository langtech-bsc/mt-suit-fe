import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = "", ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`w-full px-4 py-2.5 rounded-lg border ${error
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-bsc-blue-medium dark:border-slate-700 dark:focus:ring-bsc-blue-medium"
                        } bg-gray-50 text-slate-900 focus:ring-2 focus:outline-none transition-shadow dark:bg-slate-900 dark:text-slate-100 ${className}`}
                    {...props}
                />
                {error && (
                    <span className="text-sm text-red-600">{error}</span>
                )}
                {helperText && !error && (
                    <span className="text-sm text-gray-500 dark:text-slate-400">{helperText}</span>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";
