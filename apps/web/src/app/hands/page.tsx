'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HandSummary {
    id: string;
    siteHandId: string;
    timestamp: string;
    stakes: string;
    tableName: string;
    board: string;
    potTotal: number;
    heroName: string | null;
    heroPosition: string | null;
    heroCards: string | null;
    heroResult: number;
    playerCount: number;
}

interface Player {
    name: string;
    handsCount: number;
}

const POSITIONS = ['BTN', 'CO', 'HJ', 'MP', 'UTG', 'SB', 'BB'];

export default function HandsPage() {
    const [hands, setHands] = useState<HandSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Filters
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [selectedPosition, setSelectedPosition] = useState<string>('');
    const [sawFlop, setSawFlop] = useState<string>('');

    useEffect(() => {
        fetch('/api/players')
            .then(res => res.json())
            .then(data => setPlayers(data.players || []))
            .catch(console.error);
    }, []);

    useEffect(() => {
        setLoading(true);

        const params = new URLSearchParams();
        if (selectedPlayer) params.set('player', selectedPlayer);
        if (selectedPosition) params.set('position', selectedPosition);
        if (sawFlop) params.set('sawFlop', sawFlop);
        params.set('page', page.toString());

        fetch(`/api/hands?${params}`)
            .then(res => res.json())
            .then(data => {
                setHands(data.hands || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedPlayer, selectedPosition, sawFlop, page]);

    const clearFilters = () => {
        setSelectedPlayer('');
        setSelectedPosition('');
        setSawFlop('');
        setPage(1);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Hand History</h1>
                <p className="text-slate-400">Browse and analyze your imported hands</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-slate-400 text-sm">Player:</label>
                        <select
                            value={selectedPlayer}
                            onChange={e => { setSelectedPlayer(e.target.value); setPage(1); }}
                            className="select-field w-40"
                        >
                            <option value="">All Players</option>
                            {players.map(p => (
                                <option key={p.name} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-slate-400 text-sm">Position:</label>
                        <select
                            value={selectedPosition}
                            onChange={e => { setSelectedPosition(e.target.value); setPage(1); }}
                            className="select-field w-32"
                        >
                            <option value="">All</option>
                            {POSITIONS.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-slate-400 text-sm">Saw Flop:</label>
                        <select
                            value={sawFlop}
                            onChange={e => { setSawFlop(e.target.value); setPage(1); }}
                            className="select-field w-28"
                        >
                            <option value="">All</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    </div>

                    {(selectedPlayer || selectedPosition || sawFlop) && (
                        <button
                            onClick={clearFilters}
                            className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear
                        </button>
                    )}

                    <div className="ml-auto text-slate-400 text-sm">
                        {total} hand{total !== 1 ? 's' : ''} found
                    </div>
                </div>
            </div>

            {/* Hands List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <svg className="w-8 h-8 text-indigo-500 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
            ) : hands.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-slate-400">No hands found. Try adjusting your filters or import more hands.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {hands.map(hand => (
                        <Link
                            key={hand.id}
                            href={`/hands/${hand.id}`}
                            className="glass-card-hover p-4 flex items-center gap-4 group"
                        >
                            {/* Hand ID & Time */}
                            <div className="w-48 flex-shrink-0">
                                <p className="text-white font-mono text-sm">#{hand.siteHandId}</p>
                                <p className="text-slate-500 text-xs">
                                    {new Date(hand.timestamp).toLocaleString()}
                                </p>
                            </div>

                            {/* Position & Cards */}
                            <div className="w-32 flex-shrink-0">
                                {hand.heroPosition && (
                                    <span className="px-2 py-1 bg-slate-700/50 rounded text-xs font-mono text-white">
                                        {hand.heroPosition}
                                    </span>
                                )}
                                {hand.heroCards && (
                                    <p className="text-indigo-400 font-mono text-sm mt-1">{hand.heroCards}</p>
                                )}
                            </div>

                            {/* Board */}
                            <div className="flex-1">
                                {hand.board ? (
                                    <div className="flex gap-1">
                                        {hand.board.split(' ').map((card, i) => (
                                            <span
                                                key={i}
                                                className={`px-2 py-1 rounded text-xs font-mono font-bold ${card.includes('h') || card.includes('d')
                                                        ? card.includes('h') ? 'bg-red-600/20 text-red-400' : 'bg-blue-600/20 text-blue-400'
                                                        : card.includes('c') ? 'bg-green-600/20 text-green-400' : 'bg-slate-600 text-white'
                                                    }`}
                                            >
                                                {card}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-slate-500 text-sm">No flop</span>
                                )}
                            </div>

                            {/* Pot & Result */}
                            <div className="w-32 text-right flex-shrink-0">
                                <p className="text-slate-400 text-sm">Pot: ${hand.potTotal.toFixed(2)}</p>
                                {hand.heroResult !== 0 && (
                                    <p className={`font-medium ${hand.heroResult > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {hand.heroResult > 0 ? '+' : ''}${hand.heroResult.toFixed(2)}
                                    </p>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="text-slate-500 group-hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="btn-secondary disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-slate-400 px-4">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="btn-secondary disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
