import Link from 'next/link'

export default function HomePage() {
    return (
        <div className="max-w-4xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-16 animate-fade-in">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-indigo-400 text-sm mb-6">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Off-table study tool
                </div>
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                    Poker Lab
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                    Import your hand histories, analyze your play, and improve your NLHE game with advanced statistics, equity calculations, and interactive training.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link href="/upload" className="btn-primary text-lg px-6 py-3">
                        Import Hands
                    </Link>
                    <Link href="/dashboard" className="btn-secondary text-lg px-6 py-3">
                        View Dashboard
                    </Link>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 mb-16">
                <Link href="/upload" className="glass-card-hover p-6 group">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-600/30 transition-colors">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Import Hand Histories</h3>
                    <p className="text-slate-400 text-sm">
                        Upload PokerStars hand history files and automatically parse them for analysis.
                    </p>
                </Link>

                <Link href="/dashboard" className="glass-card-hover p-6 group">
                    <div className="w-12 h-12 bg-green-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600/30 transition-colors">
                        <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Statistics Dashboard</h3>
                    <p className="text-slate-400 text-sm">
                        Track VPIP, PFR, 3-bet%, continuation bet stats, and more across all your sessions.
                    </p>
                </Link>

                <Link href="/hands" className="glass-card-hover p-6 group">
                    <div className="w-12 h-12 bg-amber-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-600/30 transition-colors">
                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Hand Replayer</h3>
                    <p className="text-slate-400 text-sm">
                        Review hands action-by-action with pot progression and integrated equity calculations.
                    </p>
                </Link>

                <Link href="/trainer" className="glass-card-hover p-6 group">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600/30 transition-colors">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Trainer Mode</h3>
                    <p className="text-slate-400 text-sm">
                        Practice decision-making with quizzes based on your own hands. Get heuristic-based feedback.
                    </p>
                </Link>
            </div>

            {/* Disclaimer */}
            <div className="glass-card p-6 text-center">
                <p className="text-slate-400 text-sm">
                    <span className="text-amber-400 font-medium">Note:</span> Poker Lab is designed for off-table study only.
                    Trainer feedback uses baseline heuristics and equity calculations, not solver-derived frequencies.
                </p>
            </div>
        </div>
    )
}
