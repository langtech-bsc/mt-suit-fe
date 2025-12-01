import { SelectHTMLAttributes, forwardRef } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    helperText?: string;
    options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ label, error, helperText, options, className = "", children, ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <select
                        ref={ref}
                        className={`w-full px-4 py-2.5 pr-10 rounded-lg border ${error
                                ? "border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:ring-bsc-blue-medium"
                            } bg-gray-50 focus:ring-2 focus:outline-none appearance-none cursor-pointer transition-shadow ${className}`}
                        {...props}
                    >
                        {options ? (
                            options.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    disabled={option.disabled}
                                >
                                    {option.label}
                                </option>
                            ))
                        ) : (
                            children
                        )}
                    </select>
                    {/* Custom Arrow Icon */}
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                {error && (
                    <span className="text-sm text-red-600">{error}</span>
                )}
                {helperText && !error && (
                    <span className="text-sm text-gray-500">{helperText}</span>
                )}
            </div>
        );
    }
);

Select.displayName = "Select";
