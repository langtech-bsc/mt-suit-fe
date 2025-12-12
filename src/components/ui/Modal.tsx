import { useEffect } from "react";
import ReactDOM from "react-dom";
import type { ReactNode } from "react";

export interface ModalProps {
    open: boolean;
    title?: string;
    description?: string;
    children: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg";
    onClose: () => void;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-3xl",
};

export function Modal({
    open,
    title,
    description,
    children,
    footer,
    size = "md",
    onClose,
}: Readonly<ModalProps>) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
            <button
                type="button"
                aria-label="Cerrar modal"
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div
                aria-modal="true"
                className={`relative w-full ${sizeClasses[size]} rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 max-h-[95vh] overflow-y-auto`}
            >
                {(title || description) && (
                    <div className="border-b border-gray-100 px-6 py-5 dark:border-slate-800">
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                {title && <h2 className="text-lg font-semibold text-bsc-blue-dark dark:text-white">{title}</h2>}
                                {description && <p className="text-sm text-gray-600 dark:text-slate-300">{description}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-2 py-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                aria-label="Cerrar"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                <div className="px-6 py-6">{children}</div>
                {footer && (
                    <div className="border-t border-gray-100 px-6 py-4 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-end gap-3">{footer}</div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
