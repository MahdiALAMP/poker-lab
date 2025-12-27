'use client';

import { useState, useCallback } from 'react';

interface ImportResult {
    success: boolean;
    totalHands: number;
    importedHands: number;
    skipped: number;
    errors?: string[];
}

export default function UploadPage() {
    const [files, setFiles] = useState<File[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            f => f.name.endsWith('.txt') || f.name.endsWith('.log')
        );
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        if (files.length === 0) return;

        setImporting(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            files.forEach(file => formData.append('files', file));

            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Import failed');
            }

            setResult(data);
            setFiles([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Import Hand Histories</h1>
                <p className="text-slate-400">
                    Upload PokerStars hand history files (.txt) to analyze your play.
                </p>
            </div>

            {/* Drop Zone */}
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
          ${dragActive
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }
        `}
            >
                <input
                    type="file"
                    accept=".txt,.log"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white font-medium">Drop hand history files here</p>
                        <p className="text-slate-400 text-sm mt-1">or click to browse</p>
                    </div>
                    <p className="text-slate-500 text-xs">
                        Supports PokerStars .txt files
                    </p>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="mt-6 glass-card p-4">
                    <h3 className="text-sm font-medium text-slate-400 mb-3">
                        {files.length} file{files.length > 1 ? 's' : ''} selected
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {files.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600/20 rounded flex items-center justify-center">
                                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-white text-sm">{file.name}</p>
                                        <p className="text-slate-500 text-xs">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFile(index)}
                                    className="text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleImport}
                        disabled={importing}
                        className="mt-4 w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Importing...
                            </span>
                        ) : (
                            `Import ${files.length} file${files.length > 1 ? 's' : ''}`
                        )}
                    </button>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="mt-6 glass-card p-6 animate-fade-in">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Import Complete</h3>
                            <p className="text-slate-400 text-sm">Your hands have been imported successfully</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                            <p className="text-2xl font-bold text-white">{result.totalHands}</p>
                            <p className="text-slate-400 text-sm">Total Parsed</p>
                        </div>
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                            <p className="text-2xl font-bold text-green-400">{result.importedHands}</p>
                            <p className="text-slate-400 text-sm">Imported</p>
                        </div>
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg">
                            <p className="text-2xl font-bold text-slate-400">{result.skipped}</p>
                            <p className="text-slate-400 text-sm">Skipped</p>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <a href="/dashboard" className="btn-primary flex-1 text-center">
                            View Dashboard
                        </a>
                        <a href="/hands" className="btn-secondary flex-1 text-center">
                            Browse Hands
                        </a>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="mt-6 glass-card p-4 border-red-500/30 animate-fade-in">
                    <div className="flex items-center gap-3 text-red-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
