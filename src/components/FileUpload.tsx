import { useState, useRef, useId } from "react";

interface FileUploadProps {
    readonly onFileSelect: (file: File | null) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputId = useId();

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            handleFile(droppedFile);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pickedFile = e.target.files?.[0];
        if (pickedFile) {
            handleFile(pickedFile);
        }
    };

    const handleFile = (file: File) => {
        setSelectedFile(file);
        setText('');
        onFileSelect(file);
    };

    const clearFile = () => {
        setSelectedFile(null);
        setText('');
        onFileSelect(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col gap-2 h-full">
            <label className="text-sm font-medium text-gray-600" htmlFor={fileInputId}>
                Texto o documento de entrada
            </label>

            {selectedFile === null ? (
                <label
                    htmlFor={fileInputId}
                    aria-label="Sube un archivo haciendo clic o arrastrando, o escribe el texto debajo"
                    className={`relative flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors ${dragActive ? "border-bsc-blue-medium bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        id={fileInputId}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleChange}
                        accept=".txt,.pdf,.docx,.pptx"
                    />
                    <div className="flex flex-col flex-1 items-center text-center text-gray-500 pointer-events-none">
                        <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm font-medium">Haz clic para subir o arrastrar y soltar</p>
                        <p className="text-xs mt-1">Formatos: .txt, .pdf, .docx, .pptx</p>
                    </div>

                    <div className="absolute bottom-4 w-full px-4">
                        <div className="flex items-center gap-2 my-2">
                            <div className="h-px bg-gray-300 flex-grow"></div>
                            <span className="text-xs text-gray-400 uppercase">O</span>
                            <div className="h-px bg-gray-300 flex-grow"></div>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onBlur={() => { if (text.trim()) { const file = new File([text], 'texto.txt', {type: 'text/plain'}); setSelectedFile(file); onFileSelect(file); } }}
                            className="w-full h-24 p-2 text-sm bg-transparent border-none focus:ring-0 resize-none placeholder-gray-400"
                            placeholder="Escribe o pega tu texto aquí..."
                            rows={10}
                            onClick={(e) => e.stopPropagation()} // Prevent triggering file upload
                        ></textarea>
                    </div>
                </label>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center p-6 border rounded-lg bg-blue-50 border-bsc-blue-medium">
                    <div className="flex items-center gap-3 mb-4">
                        <svg className="w-8 h-8 text-bsc-blue-medium dark:text-bsc-blue-medium-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="text-left">
                            <p className="text-sm font-semibold text-bsc-blue-dark truncate max-w-[200px]">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                    </div>
                    <button
                        onClick={clearFile}
                        className="text-sm text-red-600 hover:text-red-800 font-medium underline"
                    >
                        Eliminar archivo
                    </button>
                </div>
            )}
        </div>
    );
}
