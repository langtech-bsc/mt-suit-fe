import { useState } from "react"
import "./App.css"
import { LanguageSelector } from "./components/LanguageSelector"
import { FileUpload } from "./components/FileUpload"
import { Button, Card } from "./components/ui"

function App() {
  const [sourceLang, setSourceLang] = useState("es");
  const [targetLang, setTargetLang] = useState("en");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-bsc-white text-bsc-blue-dark font-sans">
      {/* Header */}
      <header className="bg-bsc-blue-dark text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Placeholder for BSC Logo */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-bsc-blue-dark font-bold text-xs">
              LOGO
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide">BSC Translation AI</h1>
              <p className="text-xs opacity-80">Barcelona Supercomputing Center</p>
            </div>
          </div>
          <nav>
            <ul className="flex gap-6 text-sm font-medium">
              <li><a href="#" className="hover:text-gray-200 transition-colors">Translator</a></li>
              <li><a href="#" className="hover:text-gray-200 transition-colors">History</a></li>
              <li><a href="#" className="hover:text-gray-200 transition-colors">Settings</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          <Card variant="elevated" padding="lg" className="min-h-[600px] flex flex-col">
            <h2 className="text-2xl font-semibold text-bsc-blue-medium mb-6">
              Neural Machine Translation
            </h2>

            {/* Translation Interface */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow">

              {/* Source Section */}
              <div className="flex flex-col gap-4">
                <LanguageSelector
                  label="Source Language"
                  selectedCode={sourceLang}
                  onChange={setSourceLang}
                />
                <div className="flex-grow">
                  <FileUpload onFileSelect={setFile} />
                </div>
              </div>

              {/* Target Section */}
              <div className="flex flex-col gap-4">
                <LanguageSelector
                  label="Target Language"
                  selectedCode={targetLang}
                  onChange={setTargetLang}
                  excludeCode={sourceLang}
                />
                <div className="flex-grow flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-600">Translation Output</label>
                  <div className="w-full h-full min-h-[200px] p-6 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 flex items-center justify-center">
                    {file ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Document translation will appear here.</p>
                        <Button variant="ghost" size="sm" disabled>
                          Download Translated Document
                        </Button>
                      </div>
                    ) : (
                      <p className="italic text-gray-400">Translation will appear here...</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button variant="primary" size="md">
                <span>Translate</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>&copy; 2025 Barcelona Supercomputing Center. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
