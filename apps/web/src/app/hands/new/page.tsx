'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { clsx } from 'clsx';

interface Player {
    playerName: string;
    position: string;
    seatNumber: number;
    startingStack: number;
    holeCards: string;
    isHero: boolean;
    finalResult: number;
}

interface Action {
    street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER';
    sequence: number;
    actorName: string;
    actionType: 'check' | 'call' | 'raise' | 'fold' | 'post';
    amount: number;
    potAfterAction: number;
    isAllIn: boolean;
}

interface EquityResult {
    winPercent: number;
    tiePercent: number;
    losePercent: number;
}

function CardDisplay({ card }: { card: string }) {
    if (!card) return <div className="w-10 h-14 bg-slate-800 border border-slate-700 rounded-md"></div>;

    const suit = card[1]?.toLowerCase();
    const rank = card[0]?.toUpperCase();

    const colorClass = {
        h: 'text-red-500 bg-white',
        d: 'text-blue-500 bg-white',
        c: 'text-green-600 bg-white',
        s: 'text-slate-900 bg-white',
    }[suit] || 'text-white bg-slate-700';

    const suitSymbol = {
        h: '♥',
        d: '♦',
        c: '♣',
        s: '♠',
    }[suit] || '';

    return (
        <div className={clsx(
            "w-10 h-14 rounded-md flex flex-col items-center justify-center font-bold text-lg shadow-md",
            colorClass
        )}>
            <span>{rank}</span>
            <span>{suitSymbol}</span>
        </div>
    );
}

const POSITIONS = ['SB', 'BB', 'UTG', 'MP', 'CO', 'BTN'];

const DEFAULT_RANGES: Record<string, string> = {
    'UTG': '77+, ATs+, KJs+, QJs, AJo+, KQo',
    'MP': '66+, A9s+, KTs+, QTs+, JTs, ATo+, KJo+',
    'CO': '44+, A2s+, K8s+, Q9s+, J9s+, T9s, ATo+, KTo+, QTo+',
    'BTN': '22+, A2s+, K2s+, Q5s+, J7s+, T7s+, 97s+, 87s, 76s, 65s, A2o+, K9o+, Q9o+, J9o+, T9o',
    'SB': '22+, A2s+, K2s+, Q2s+, J2s+, T5s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K5o+, Q8o+, J8o+, T8o+, 98o',
    'BB': 'Any 2 Cards (Defending)',
};

export default function NewHandPage() {
    const router = useRouter();
    const [step, setStep] = useState<'SETUP' | 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SUMMARY'>('SETUP');

    // Hand State
    const [stakes, setStakes] = useState('$0.25/$0.50');
    const [bigBlind, setBigBlind] = useState(0.50);
    const [heroCards, setHeroCards] = useState(['', '']);
    const [villainCards, setVillainCards] = useState(['', '']);
    const [villainRange, setVillainRange] = useState(DEFAULT_RANGES['BB']);
    const [winner, setWinner] = useState<'Hero' | 'Villain' | 'Split'>('Hero');

    const [heroPos, setHeroPos] = useState('BTN');
    const [villainPos, setVillainPos] = useState('BB');

    const [players, setPlayers] = useState<Player[]>([
        { playerName: 'Hero', position: 'BTN', seatNumber: 1, startingStack: 50.00, holeCards: '', isHero: true, finalResult: 0 },
        { playerName: 'Villain', position: 'BB', seatNumber: 2, startingStack: 50.00, holeCards: '', isHero: false, finalResult: 0 },
    ]);

    const [actions, setActions] = useState<Action[]>([]);
    const [boardFlop, setBoardFlop] = useState(['', '', '']);
    const [boardTurn, setBoardTurn] = useState('');
    const [boardRiver, setBoardRiver] = useState('');

    const [, setPotTotal] = useState(0);
    const [equity, setEquity] = useState<EquityResult | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Derived States
    const currentPot = actions.reduce((sum, a) => sum + a.amount, 0);

    useEffect(() => {
        // Update players and range when positions change
        setPlayers([
            { ...players[0], position: heroPos },
            { ...players[1], position: villainPos },
        ]);

        // Auto-update villain range if it hasn't been manually tweaked (too much)
        if (DEFAULT_RANGES[villainPos]) {
            setVillainRange(DEFAULT_RANGES[villainPos]);
        }
    }, [heroPos, villainPos]);

    useEffect(() => {
        // Initial blinds
        if (actions.length === 0) {
            const sb = bigBlind / 2;
            setActions([
                { street: 'PREFLOP', sequence: 0, actorName: 'Hero', actionType: 'post', amount: sb, potAfterAction: sb, isAllIn: false },
                { street: 'PREFLOP', sequence: 1, actorName: 'Villain', actionType: 'post', amount: bigBlind, potAfterAction: sb + bigBlind, isAllIn: false },
            ]);
            setPotTotal(sb + bigBlind);
        }
    }, []);

    const handleAddAction = (actorName: string, type: Action['actionType'], amount: number) => {
        const newPot = currentPot + amount;
        const newAction: Action = {
            street: step as any,
            sequence: actions.length,
            actorName,
            actionType: type,
            amount,
            potAfterAction: newPot,
            isAllIn: false // Simplification for now
        };
        setActions([...actions, newAction]);
        setPotTotal(newPot);
    };

    const calculateEquity = async () => {
        if (!heroCards[0] || !heroCards[1] || !villainRange) return;

        setCalculating(true);
        try {
            const board = [
                ...boardFlop.filter(Boolean),
                boardTurn,
                boardRiver
            ].filter(Boolean);

            const res = await fetch('/api/equity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heroCards: heroCards,
                    villainRange: villainRange,
                    board: board
                }),
            });
            const data = await res.json();
            setEquity(data);
        } catch (error) {
            console.error('Equity error:', error);
        } finally {
            setCalculating(false);
        }
    };

    const saveHand = async () => {
        setSaving(true);
        try {
            const handData = {
                stakes,
                smallBlind: bigBlind / 2,
                bigBlind,
                boardFlop: boardFlop.filter(Boolean).join(' ') || null,
                boardTurn: boardTurn || null,
                boardRiver: boardRiver || null,
                potTotal: currentPot,
                players: players.map(p => ({
                    ...p,
                    holeCards: p.isHero ? heroCards.join(' ') : villainCards.join(' '),
                    finalResult: (p.playerName === winner) ? currentPot : (winner === 'Split' ? currentPot / 2 : 0)
                })),
                actions: actions
            };

            const res = await fetch('/api/hands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand: handData }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.details || data.error || 'Failed to save hand');
            }

            router.push('/hands');
            router.refresh();
        } catch (error) {
            console.error('Save error:', error);
            alert(error instanceof Error ? error.message : 'Failed to save hand');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-white">Hand Lab <span className="text-indigo-500 font-normal text-lg">Manual Input</span></h1>
                    <div className="flex gap-2 text-sm">
                        {['SETUP', 'PREFLOP', 'FLOP', 'TURN', 'RIVER'].map((s) => (
                            <div key={s} className={clsx(
                                "px-3 py-1 rounded-full border transition-all",
                                step === s ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-900 border-slate-800 text-slate-500"
                            )}>
                                {s}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Input Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {step === 'SETUP' && (
                            <div className="glass-card p-6 space-y-4">
                                <h3 className="text-xl font-semibold text-white mb-4">Initial Setup</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Stakes</label>
                                        <input
                                            value={stakes}
                                            onChange={e => setStakes(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Big Blind ($)</label>
                                        <input
                                            type="number"
                                            value={bigBlind}
                                            onChange={e => setBigBlind(parseFloat(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Hero Position</label>
                                        <select
                                            value={heroPos}
                                            onChange={e => setHeroPos(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-white"
                                        >
                                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-1">Villain Position</label>
                                        <select
                                            value={villainPos}
                                            onChange={e => setVillainPos(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-md p-2 text-white"
                                        >
                                            {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-slate-400 mb-1">Your Cards</label>
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="As"
                                            value={heroCards[0]}
                                            onChange={e => setHeroCards([e.target.value.substring(0, 2), heroCards[1]])}
                                            className="w-20 bg-slate-900 border border-slate-800 rounded-md p-2 text-white font-mono uppercase"
                                        />
                                        <input
                                            placeholder="Ks"
                                            value={heroCards[1]}
                                            onChange={e => setHeroCards([heroCards[0], e.target.value.substring(0, 2)])}
                                            className="w-20 bg-slate-900 border border-slate-800 rounded-md p-2 text-white font-mono uppercase"
                                        />
                                        <div className="flex gap-1 ml-2">
                                            <CardDisplay card={heroCards[0]} />
                                            <CardDisplay card={heroCards[1]} />
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setStep('PREFLOP')}
                                    className="w-full btn-primary py-3 mt-4"
                                >
                                    Start Preflop Action
                                </button>
                            </div>
                        )}

                        {['PREFLOP', 'FLOP', 'TURN', 'RIVER'].includes(step) && (
                            <div className="space-y-6">
                                {/* Board Input for Post-flop */}
                                {step !== 'PREFLOP' && (
                                    <div className="glass-card p-6">
                                        <h3 className="text-white font-medium mb-4">Board Cards</h3>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex gap-2">
                                                {step === 'FLOP' && boardFlop.map((c, i) => (
                                                    <input
                                                        key={i}
                                                        placeholder="Flop"
                                                        value={c}
                                                        onChange={e => {
                                                            const newFlop = [...boardFlop];
                                                            newFlop[i] = e.target.value.substring(0, 2);
                                                            setBoardFlop(newFlop);
                                                        }}
                                                        className="w-16 bg-slate-900 border border-slate-800 rounded-md p-2 text-sm font-mono uppercase"
                                                    />
                                                ))}
                                                {step === 'TURN' && (
                                                    <input
                                                        placeholder="Turn"
                                                        value={boardTurn}
                                                        onChange={e => setBoardTurn(e.target.value.substring(0, 2))}
                                                        className="w-16 bg-slate-900 border border-slate-800 rounded-md p-2 text-sm font-mono uppercase"
                                                    />
                                                )}
                                                {step === 'RIVER' && (
                                                    <input
                                                        placeholder="River"
                                                        value={boardRiver}
                                                        onChange={e => setBoardRiver(e.target.value.substring(0, 2))}
                                                        className="w-16 bg-slate-900 border border-slate-800 rounded-md p-2 text-sm font-mono uppercase"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                {boardFlop.map((c, i) => <CardDisplay key={i} card={c} />)}
                                                {boardTurn && <CardDisplay card={boardTurn} />}
                                                {boardRiver && <CardDisplay card={boardRiver} />}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Entry */}
                                <div className="glass-card p-6">
                                    <h3 className="text-white font-medium mb-4">Add Action for {step}</h3>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        {players.map(player => (
                                            <div key={player.playerName} className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                                                <p className="text-indigo-400 font-semibold mb-3">{player.playerName} ({player.position})</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleAddAction(player.playerName, 'check', 0)}
                                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs"
                                                    >
                                                        CHECK
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const lastAmount = actions[actions.length - 1]?.amount || 0;
                                                            handleAddAction(player.playerName, 'call', lastAmount);
                                                        }}
                                                        className="px-3 py-1 bg-green-900/40 text-green-400 hover:bg-green-900/60 rounded text-xs"
                                                    >
                                                        CALL
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const amt = prompt('Raise to:');
                                                            if (amt) handleAddAction(player.playerName, 'raise', parseFloat(amt));
                                                        }}
                                                        className="px-3 py-1 bg-red-900/40 text-red-400 hover:bg-red-900/60 rounded text-xs"
                                                    >
                                                        RAISE
                                                    </button>
                                                    <button
                                                        onClick={() => handleAddAction(player.playerName, 'fold', 0)}
                                                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs"
                                                    >
                                                        FOLD
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action History for current street */}
                                    <div className="space-y-2">
                                        {actions.filter(a => a.street === step).map((a, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm py-2 px-3 bg-slate-900/30 rounded border border-slate-800/50">
                                                <span className="text-slate-400">{i + 1}. {a.actorName}</span>
                                                <span className="text-white font-mono uppercase">{a.actionType} {a.amount > 0 ? `$${a.amount.toFixed(2)}` : ''}</span>
                                                <span className="text-slate-500">Pot: ${a.potAfterAction.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={() => {
                                                if (step === 'PREFLOP') setStep('FLOP');
                                                else if (step === 'FLOP') setStep('TURN');
                                                else if (step === 'TURN') setStep('RIVER');
                                                else if (step === 'RIVER') setStep('SUMMARY');
                                            }}
                                            className="flex-1 btn-primary py-3"
                                        >
                                            Next Street ({step === 'RIVER' ? 'Showdown' : 'Proceed'})
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 'SUMMARY' && (
                            <div className="glass-card p-6">
                                <h3 className="text-2xl font-bold text-white mb-6 text-center">Hand Summary</h3>

                                <div className="space-y-6 max-w-md mx-auto">
                                    {/* Winner Selection */}
                                    <div>
                                        <label className="block text-sm text-slate-400 mb-3 text-center uppercase tracking-wider">Who Won?</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['Hero', 'Villain', 'Split'].map((w) => (
                                                <button
                                                    key={w}
                                                    onClick={() => setWinner(w as any)}
                                                    className={clsx(
                                                        "py-2 rounded-md border font-medium transition-all",
                                                        winner === w ? "bg-indigo-600 border-indigo-400 text-white" : "bg-slate-900 border-slate-800 text-slate-400"
                                                    )}
                                                >
                                                    {w.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Villain Cards at Showdown */}
                                    <div className="pt-6 border-t border-slate-800">
                                        <label className="block text-sm text-slate-400 mb-3 text-center uppercase tracking-wider">Villain Cards (Showdown)</label>
                                        <div className="flex justify-center gap-4">
                                            <div className="flex gap-2">
                                                <input
                                                    placeholder="2s"
                                                    value={villainCards[0]}
                                                    onChange={e => setVillainCards([e.target.value.substring(0, 2), villainCards[1]])}
                                                    className="w-16 bg-slate-900 border border-slate-800 rounded-md p-2 text-center text-white font-mono uppercase"
                                                />
                                                <input
                                                    placeholder="2c"
                                                    value={villainCards[1]}
                                                    onChange={e => setVillainCards([villainCards[0], e.target.value.substring(0, 2)])}
                                                    className="w-16 bg-slate-900 border border-slate-800 rounded-md p-2 text-center text-white font-mono uppercase"
                                                />
                                            </div>
                                            <div className="flex gap-1">
                                                <CardDisplay card={villainCards[0]} />
                                                <CardDisplay card={villainCards[1]} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-800 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Total Pot</span>
                                            <span className="text-white font-bold">${currentPot.toFixed(2)}</span>
                                        </div>
                                        <button
                                            onClick={saveHand}
                                            disabled={saving}
                                            className="w-full btn-primary py-4 text-lg font-bold"
                                        >
                                            {saving ? 'Saving...' : 'Save to History'}
                                        </button>
                                        <button
                                            onClick={() => setStep('RIVER')}
                                            className="w-full py-2 text-slate-500 text-sm hover:text-slate-300"
                                        >
                                            ← Go back to edit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar: Stats & Equity */}
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Real-time Analysis</h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Current Pot</p>
                                    <p className="text-2xl font-bold text-white">${currentPot.toFixed(2)}</p>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <label className="block text-xs text-slate-500 mb-2">Villain Range</label>
                                    <textarea
                                        value={villainRange}
                                        onChange={e => setVillainRange(e.target.value)}
                                        className="w-full h-20 bg-slate-900 border border-slate-800 rounded p-2 text-xs font-mono text-indigo-300"
                                    />
                                    <button
                                        onClick={calculateEquity}
                                        disabled={calculating || !heroCards[0]}
                                        className="w-full mt-2 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded text-sm font-medium hover:bg-indigo-600/30 transition-colors disabled:opacity-50"
                                    >
                                        {calculating ? 'Calculating...' : 'Update Equity'}
                                    </button>
                                </div>

                                {equity && (
                                    <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 animate-fade-in">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-400">Your Equity</span>
                                            <span className="text-white font-bold">{equity.winPercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-500 h-full transition-all duration-500"
                                                style={{ width: `${equity.winPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="glass-card p-6">
                            <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Tips</h4>
                            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                                <li>Use the format 2s, Ad, Kh for cards.</li>
                                <li>Raise amounts are the <strong>total</strong> bet size.</li>
                                <li>The equity calculator assumes Villain has any hand in their range.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
