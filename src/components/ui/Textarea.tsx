import { TextareaHTMLAttributes, forwardRef } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, helperText, className = "", ...props }, ref) => {
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label className="text-sm font-medium text-gray-700">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    className={`w-full px-4 py-2.5 rounded-lg border ${error
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:ring-bsc-blue-medium"
                        } bg-gray-50 focus:ring-2 focus:outline-none resize-none transition-shadow ${className}`}
                    {...props}
                />
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

Textarea.displayName = "Textarea";
