'use client';

import { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface Player {
    name: string;
    handsCount: number;
}

interface Stats {
    vpip: number;
    pfr: number;
    threeBet: number;
    foldToThreeBet: number;
    cbet: number;
    foldToCbet: number;
    wtsd: number;
    wssd: number;
    wwsf: number;
    netWon: number;
    bbPer100: number;
}

interface PositionStat {
    position: string;
    handsPlayed: number;
    vpip: number;
    pfr: number;
    netWon: number;
}

interface StatsData {
    playerName: string;
    handsPlayed: number;
    stats: Stats | null;
    positionStats: PositionStat[];
    resultsOverTime: { date: string; netWon: number; hands: number }[];
}

function StatCard({ label, value, suffix = '%', tooltip }: {
    label: string;
    value: number;
    suffix?: string;
    tooltip?: string;
}) {
    return (
        <div className="stat-card group relative" title={tooltip}>
            <span className="stat-value">
                {suffix === '$' ? `$${value.toFixed(2)}` : `${value.toFixed(1)}${suffix}`}
            </span>
            <span className="stat-label">{label}</span>
        </div>
    );
}

export default function DashboardPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string>('');
    const [statsData, setStatsData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch('/api/players')
            .then(res => res.json())
            .then(data => {
                setPlayers(data.players || []);
                // Auto-select hero or first player
                const hero = data.players?.find((p: Player) => p.name === 'Hero');
                if (hero) {
                    setSelectedPlayer(hero.name);
                } else if (data.players?.length > 0) {
                    setSelectedPlayer(data.players[0].name);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!selectedPlayer) return;

        setLoading(true);
        fetch(`/api/stats?player=${encodeURIComponent(selectedPlayer)}`)
            .then(res => res.json())
            .then(data => {
                setStatsData(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedPlayer]);

    const positionOrder = ['BTN', 'CO', 'HJ', 'MP', 'MP+1', 'UTG+1', 'UTG', 'SB', 'BB'];

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                    <p className="text-slate-400">View your poker statistics and trends</p>
                </div>

                {/* Player Selector */}
                <div className="flex items-center gap-3">
                    <label className="text-slate-400">Player:</label>
                    <select
                        value={selectedPlayer}
                        onChange={e => setSelectedPlayer(e.target.value)}
                        className="select-field w-48"
                    >
                        {players.length === 0 && (
                            <option value="">No players found</option>
                        )}
                        {players.map(p => (
                            <option key={p.name} value={p.name}>
                                {p.name} ({p.handsCount} hands)
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {players.length === 0 && (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Data Yet</h3>
                    <p className="text-slate-400 mb-6">Import hand histories to see your statistics</p>
                    <a href="/upload" className="btn-primary">Import Hands</a>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center py-12">
                    <svg className="w-8 h-8 text-indigo-500 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                </div>
            )}

            {statsData && statsData.stats && !loading && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary Stats */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">Overall Statistics</h2>
                            <span className="text-slate-400">{statsData.handsPlayed} hands</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            <StatCard
                                label="VPIP"
                                value={statsData.stats.vpip}
                                tooltip="Voluntarily Put In Pot - % of hands where you put money in voluntarily"
                            />
                            <StatCard
                                label="PFR"
                                value={statsData.stats.pfr}
                                tooltip="Preflop Raise - % of hands where you raised preflop"
                            />
                            <StatCard
                                label="3-Bet"
                                value={statsData.stats.threeBet}
                                tooltip="3-Bet - % of times you re-raised a raise"
                            />
                            <StatCard
                                label="Fold to 3-Bet"
                                value={statsData.stats.foldToThreeBet}
                                tooltip="% of times you folded when facing a 3-bet"
                            />
                            <StatCard
                                label="C-Bet"
                                value={statsData.stats.cbet}
                                tooltip="Continuation Bet - % of times you bet flop as preflop aggressor"
                            />
                            <StatCard
                                label="Fold to C-Bet"
                                value={statsData.stats.foldToCbet}
                                tooltip="% of times you folded to opponent's c-bet"
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-700">
                            <StatCard
                                label="WTSD"
                                value={statsData.stats.wtsd}
                                tooltip="Went To Showdown - % of hands that went to showdown after seeing flop"
                            />
                            <StatCard
                                label="W$SD"
                                value={statsData.stats.wssd}
                                tooltip="Won $ at Showdown - % win rate when reaching showdown"
                            />
                            <StatCard
                                label="WWSF"
                                value={statsData.stats.wwsf}
                                tooltip="Won When Saw Flop - % of hands you won after seeing the flop"
                            />
                            <StatCard
                                label="BB/100"
                                value={statsData.stats.bbPer100}
                                suffix=""
                                tooltip="Big Blinds won per 100 hands"
                            />
                        </div>
                    </div>

                    {/* Position Stats */}
                    {statsData.positionStats.length > 0 && (
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Position Breakdown</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-slate-400 font-medium">Position</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-medium">Hands</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-medium">VPIP</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-medium">PFR</th>
                                            <th className="text-right py-3 px-4 text-slate-400 font-medium">Net Won</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {statsData.positionStats
                                            .sort((a, b) => positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position))
                                            .map(pos => (
                                                <tr key={pos.position} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-1 bg-slate-700/50 rounded text-white text-sm font-mono">
                                                            {pos.position}
                                                        </span>
                                                    </td>
                                                    <td className="text-right py-3 px-4 text-slate-300">{pos.handsPlayed}</td>
                                                    <td className="text-right py-3 px-4 text-slate-300">{pos.vpip.toFixed(1)}%</td>
                                                    <td className="text-right py-3 px-4 text-slate-300">{pos.pfr.toFixed(1)}%</td>
                                                    <td className={`text-right py-3 px-4 font-medium ${pos.netWon >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {pos.netWon >= 0 ? '+' : ''}${pos.netWon.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Results Chart */}
                    {statsData.resultsOverTime.length > 1 && (
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white">Results Over Time</h2>
                                <span className={`text-lg font-bold ${statsData.stats.netWon >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {statsData.stats.netWon >= 0 ? '+' : ''}${statsData.stats.netWon.toFixed(2)}
                                </span>
                            </div>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={statsData.resultsOverTime}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `$${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#1e293b',
                                                border: '1px solid #334155',
                                                borderRadius: '8px',
                                            }}
                                            labelStyle={{ color: '#f8fafc' }}
                                            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Net Won']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="netWon"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
