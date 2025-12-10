import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    description?: string;
    helperText?: string;
    error?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
    ({ label, description, helperText, error, className = "", ...props }, ref) => {
        const helper = error ?? helperText;

        return (
            <label className={`inline-flex items-center gap-3 text-sm ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}>
                <span className="relative inline-flex h-6 w-11 flex-shrink-0 items-center">
                    <input
                        type="checkbox"
                        className="peer sr-only"
                        ref={ref}
                        {...props}
                    />
                    <span
                        className={`h-6 w-11 rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-bsc-blue-medium peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:peer-focus-visible:ring-offset-slate-900 ${error ? "border-red-400" : "border-transparent"} peer-checked:bg-bsc-blue-medium peer-checked:border-bsc-blue-medium bg-gray-300 peer-disabled:bg-gray-200 dark:bg-slate-700 dark:peer-disabled:bg-slate-800`}
                    ></span>
                    <span
                        className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-disabled:bg-gray-100 dark:bg-slate-100 dark:peer-disabled:bg-slate-400"
                    ></span>
                </span>
                <span className="flex flex-col gap-0.5">
                    {label && <span className="font-medium text-gray-900 dark:text-slate-100">{label}</span>}
                    {description && <span className="text-gray-600 dark:text-slate-300">{description}</span>}
                    {helper && <span className={`text-xs ${error ? "text-red-600" : "text-gray-500 dark:text-slate-400"}`}>{helper}</span>}
                </span>
            </label>
        );
    }
);

Switch.displayName = "Switch";
