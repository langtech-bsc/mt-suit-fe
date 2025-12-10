import { forwardRef, useEffect, useRef } from "react";
import type { InputHTMLAttributes, MutableRefObject, ReactNode } from "react";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string | ReactNode;
    description?: string | ReactNode;
    helperText?: string;
    error?: string;
    indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
    ({ label, description, helperText, error, indeterminate = false, className = "", children, ...props }, ref) => {
        const internalRef = useRef<HTMLInputElement>(null);

        const assignRef = (node: HTMLInputElement | null) => {
            internalRef.current = node;
            if (typeof ref === "function") {
                ref(node);
            } else if (ref) {
                (ref as MutableRefObject<HTMLInputElement | null>).current = node;
            }
        };

        useEffect(() => {
            if (internalRef.current) {
                internalRef.current.indeterminate = Boolean(indeterminate);
            }
        }, [indeterminate]);

        return (
            <label
                className={`flex items-start gap-3 text-sm leading-tight ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${className}`}
            >
                <span className="relative flex h-5 w-5">
                    <input
                        type="checkbox"
                        ref={assignRef}
                        className="peer sr-only"
                        {...props}
                    />
                    <span
                        className={`flex h-5 w-5 items-center justify-center rounded-md border bg-white transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-bsc-blue-medium peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-white dark:bg-slate-900 dark:peer-focus-visible:ring-offset-slate-900 ${error ? "border-red-500" : "border-gray-300 dark:border-slate-600"} peer-checked:border-bsc-blue-medium peer-checked:bg-bsc-blue-medium`}
                        data-indeterminate={indeterminate}
                    >
                        <svg
                            className="h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                        >
                            <path d="M5 10l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={`absolute h-0.5 w-3 rounded bg-white transition-opacity ${indeterminate ? "opacity-100" : "opacity-0"}`} />
                    </span>
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                    {label && <span className="font-medium text-gray-900 dark:text-slate-100">{label}</span>}
                    {description && <span className="text-gray-600 dark:text-slate-300">{description}</span>}
                    {children}
                    {error ? (
                        <span className="text-xs text-red-600">{error}</span>
                    ) : (
                        helperText && <span className="text-xs text-gray-500 dark:text-slate-400">{helperText}</span>
                    )}
                </span>
            </label>
        );
    }
);

Checkbox.displayName = "Checkbox";
