'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface PlayerInHand {
    id: string;
    seatNumber: number;
    playerName: string;
    position: string;
    startingStack: number;
    holeCards: string | null;
    finalResult: number;
    isHero: boolean;
}

interface Action {
    id: string;
    street: string;
    sequence: number;
    actorName: string;
    actionType: string;
    amount: number;
    potAfterAction: number;
    isAllIn: boolean;
}

interface Hand {
    id: string;
    siteHandId: string;
    timestamp: string;
    stakes: string;
    tableName: string;
    maxSeats: number;
    buttonSeat: number;
    smallBlind: number;
    bigBlind: number;
    boardFlop: string | null;
    boardTurn: string | null;
    boardRiver: string | null;
    potTotal: number;
    rake: number;
    players: PlayerInHand[];
    actions: Action[];
}

interface EquityResult {
    winPercent: number;
    tiePercent: number;
    losePercent: number;
    samples: number;
    rangeCombos: number;
}

const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
const streetColors: Record<string, string> = {
    PREFLOP: 'street-preflop',
    FLOP: 'street-flop',
    TURN: 'street-turn',
    RIVER: 'street-river',
};

function CardDisplay({ card }: { card: string }) {
    const suit = card[1]?.toLowerCase();
    const rank = card[0];

    const colorClass = {
        h: 'card-hearts',
        d: 'card-diamonds',
        c: 'card-clubs',
        s: 'card-spades',
    }[suit] || 'bg-slate-700';

    const suitSymbol = {
        h: '♥',
        d: '♦',
        c: '♣',
        s: '♠',
    }[suit] || '';

    return (
        <div className={`playing-card ${colorClass}`}>
            <span>{rank}{suitSymbol}</span>
        </div>
    );
}

function ActionDisplay({ action, bigBlind }: { action: Action; bigBlind: number }) {
    const actionColors: Record<string, string> = {
        fold: 'text-slate-400',
        check: 'text-slate-300',
        call: 'text-green-400',
        bet: 'text-amber-400',
        raise: 'text-red-400',
        'all-in': 'text-purple-400',
        post: 'text-slate-500',
    };

    const formatAmount = (amount: number) => {
        if (amount === 0) return '';
        const bbs = amount / bigBlind;
        return `$${amount.toFixed(2)} (${bbs.toFixed(1)}BB)`;
    };

    return (
        <div className="flex items-center justify-between py-2 px-3 bg-slate-900/30 rounded-lg">
            <div className="flex items-center gap-3">
                <span className="font-medium text-white w-24 truncate">{action.actorName}</span>
                <span className={`font-medium ${actionColors[action.actionType] || 'text-white'}`}>
                    {action.actionType.toUpperCase()}
                    {action.isAllIn && ' (ALL-IN)'}
                </span>
                {action.amount > 0 && (
                    <span className="text-slate-400 text-sm">{formatAmount(action.amount)}</span>
                )}
            </div>
            <span className="text-slate-500 text-sm">
                Pot: ${action.potAfterAction.toFixed(2)}
            </span>
        </div>
    );
}

// Default ranges based on position/action
const getDefaultRange = (position: string, isAggressor: boolean): string => {
    if (isAggressor) {
        // Preflop raise range by position
        const ranges: Record<string, string> = {
            BTN: 'AA-22, AKs-A2s, KQs-K6s, QJs-Q8s, JTs-J8s, T9s-T8s, 98s-97s, 87s-76s, 65s, 54s, AKo-A8o, KQo-KTo, QJo-QTo, JTo',
            CO: 'AA-22, AKs-A2s, KQs-K8s, QJs-Q9s, JTs-J9s, T9s-T8s, 98s-97s, 87s, 76s, 65s, AKo-A9o, KQo-KTo, QJo-QTo, JTo',
            MP: 'AA-22, AKs-A7s, KQs-K9s, QJs-QTs, JTs, T9s, 98s, 87s, 76s, AKo-ATo, KQo-KJo, QJo',
            UTG: 'AA-55, AKs-A9s, KQs-KJs, QJs, JTs, T9s, AKo-AJo, KQo',
            SB: 'AA-22, AKs-A2s, KQs-K4s, QJs-Q6s, JTs-J7s, T9s-T7s, 98s-96s, 87s-86s, 76s-75s, 65s-64s, 54s, 43s, AKo-A7o, KQo-K9o, QJo-QTo, JTo',
            BB: 'AA-22, AKs-A2s, KQs-K2s, QJs-Q4s, JTs-J6s, T9s-T6s, 98s-95s, 87s-85s, 76s-74s, 65s-63s, 54s-53s, 43s, AKo-A2o, KQo-K6o, QJo-Q8o, JTo-J8o, T9o-T8o, 98o',
        };
        return ranges[position] || 'AA-22, AKs-A5s, KQs-KTs, QJs-QTs, JTs, AKo-ATo';
    } else {
        // Calling range (tighter)
        return 'AA-77, AKs-ATs, KQs-KJs, QJs, JTs, T9s, 98s, AKo-AJo, KQo';
    }
};

export default function HandDetailPage() {
    const params = useParams();
    const [hand, setHand] = useState<Hand | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentStreet, setCurrentStreet] = useState<string>('PREFLOP');

    // Equity calculator state
    const [heroCards, setHeroCards] = useState<string[]>(['', '']);
    const [villainRange, setVillainRange] = useState('');
    const [equityResult, setEquityResult] = useState<EquityResult | null>(null);
    const [calculating, setCalculating] = useState(false);
    const [equityError, setEquityError] = useState<string | null>(null);

    useEffect(() => {
        if (!params.id) return;

        fetch(`/api/hands/${params.id}`)
            .then(res => res.json())
            .then(data => {
                setHand(data.hand);

                // Pre-fill hero cards if available
                const hero = data.hand?.players.find((p: PlayerInHand) => p.isHero);
                if (hero?.holeCards) {
                    const cards = hero.holeCards.split(' ');
                    setHeroCards([cards[0] || '', cards[1] || '']);
                }

                // Set default villain range based on action
                const preflopActions = data.hand?.actions.filter((a: Action) => a.street === 'PREFLOP') || [];
                const lastRaise = preflopActions.filter((a: Action) => a.actionType === 'raise').pop();
                if (lastRaise) {
                    const raiserPlayer = data.hand?.players.find((p: PlayerInHand) => p.playerName === lastRaise.actorName);
                    if (raiserPlayer && !raiserPlayer.isHero) {
                        setVillainRange(getDefaultRange(raiserPlayer.position, true));
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [params.id]);

    const calculateEquity = async () => {
        if (!heroCards[0] || !heroCards[1] || !villainRange) return;

        setCalculating(true);
        setEquityError(null);

        try {
            // Get board cards based on current street
            const boardCards: string[] = [];
            if (hand?.boardFlop && currentStreet !== 'PREFLOP') {
                boardCards.push(...hand.boardFlop.split(' '));
            }
            if (hand?.boardTurn && (currentStreet === 'TURN' || currentStreet === 'RIVER')) {
                boardCards.push(hand.boardTurn);
            }
            if (hand?.boardRiver && currentStreet === 'RIVER') {
                boardCards.push(hand.boardRiver);
            }

            const response = await fetch('/api/equity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    heroCards,
                    board: boardCards,
                    villainRange,
                    samples: 10000,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to calculate equity');
            }

            setEquityResult(data);
        } catch (error) {
            setEquityError(error instanceof Error ? error.message : 'Calculation failed');
        } finally {
            setCalculating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 text-indigo-500 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            </div>
        );
    }

    if (!hand) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400">Hand not found</p>
                <Link href="/hands" className="btn-primary mt-4 inline-block">Back to Hands</Link>
            </div>
        );
    }

    const groupedActions = streetOrder.reduce((acc, street) => {
        acc[street] = hand.actions.filter(a => a.street === street);
        return acc;
    }, {} as Record<string, Action[]>);

    const hero = hand.players.find(p => p.isHero);

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/hands" className="text-slate-400 hover:text-white text-sm mb-2 inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Hands
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Hand #{hand.siteHandId}</h1>
                    <p className="text-slate-400 text-sm">
                        {hand.tableName} • {hand.stakes} • {new Date(hand.timestamp).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-slate-400">Final Pot</p>
                    <p className="text-2xl font-bold text-white">${hand.potTotal.toFixed(2)}</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Replayer */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Players */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">Players</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {hand.players.map(player => (
                                <div
                                    key={player.id}
                                    className={`p-3 rounded-lg ${player.isHero ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-900/50'}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-mono bg-slate-700/50 px-2 py-0.5 rounded">
                                            {player.position}
                                        </span>
                                        <span className="text-slate-500 text-xs">Seat {player.seatNumber}</span>
                                    </div>
                                    <p className="text-white font-medium truncate">{player.playerName}</p>
                                    <p className="text-slate-400 text-sm">${player.startingStack.toFixed(2)}</p>
                                    {player.holeCards && (
                                        <div className="flex gap-1 mt-2">
                                            {player.holeCards.split(' ').map((card, i) => (
                                                <CardDisplay key={i} card={card} />
                                            ))}
                                        </div>
                                    )}
                                    {player.finalResult !== 0 && (
                                        <p className={`text-sm mt-2 font-medium ${player.finalResult > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {player.finalResult > 0 ? '+' : ''}${player.finalResult.toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Street Navigation */}
                    <div className="flex gap-2">
                        {streetOrder.map(street => {
                            const hasActions = groupedActions[street]?.length > 0;
                            const hasBoard = street === 'FLOP' ? hand.boardFlop : street === 'TURN' ? hand.boardTurn : street === 'RIVER' ? hand.boardRiver : true;

                            if (!hasActions && street !== 'PREFLOP') return null;

                            return (
                                <button
                                    key={street}
                                    onClick={() => setCurrentStreet(street)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentStreet === street
                                            ? streetColors[street]
                                            : 'bg-slate-800/50 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {street}
                                </button>
                            );
                        })}
                    </div>

                    {/* Board Display */}
                    {currentStreet !== 'PREFLOP' && (
                        <div className="glass-card p-4">
                            <h3 className="text-sm font-medium text-slate-400 mb-3">Board</h3>
                            <div className="flex gap-2">
                                {hand.boardFlop?.split(' ').map((card, i) => (
                                    <CardDisplay key={`flop-${i}`} card={card} />
                                ))}
                                {(currentStreet === 'TURN' || currentStreet === 'RIVER') && hand.boardTurn && (
                                    <CardDisplay card={hand.boardTurn} />
                                )}
                                {currentStreet === 'RIVER' && hand.boardRiver && (
                                    <CardDisplay card={hand.boardRiver} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="glass-card p-4">
                        <h3 className="text-sm font-medium text-slate-400 mb-3">
                            {currentStreet} Actions
                        </h3>
                        <div className="space-y-2">
                            {groupedActions[currentStreet]?.map(action => (
                                <ActionDisplay key={action.id} action={action} bigBlind={hand.bigBlind} />
                            ))}
                            {(!groupedActions[currentStreet] || groupedActions[currentStreet].length === 0) && (
                                <p className="text-slate-500 text-sm py-4 text-center">No actions on this street</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Equity Calculator Sidebar */}
                <div className="glass-card p-4 h-fit sticky top-24">
                    <h3 className="text-lg font-semibold text-white mb-4">Equity Calculator</h3>

                    {/* Hero Cards */}
                    <div className="mb-4">
                        <label className="text-sm text-slate-400 block mb-2">Hero Cards</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={heroCards[0]}
                                onChange={e => setHeroCards([e.target.value.toUpperCase(), heroCards[1]])}
                                placeholder="Ah"
                                maxLength={2}
                                className="input-field w-20 text-center font-mono"
                            />
                            <input
                                type="text"
                                value={heroCards[1]}
                                onChange={e => setHeroCards([heroCards[0], e.target.value.toUpperCase()])}
                                placeholder="Kd"
                                maxLength={2}
                                className="input-field w-20 text-center font-mono"
                            />
                        </div>
                    </div>

                    {/* Villain Range */}
                    <div className="mb-4">
                        <label className="text-sm text-slate-400 block mb-2">Villain Range</label>
                        <textarea
                            value={villainRange}
                            onChange={e => setVillainRange(e.target.value)}
                            placeholder="e.g., AA-TT, AKs, AQs, AKo"
                            rows={3}
                            className="input-field font-mono text-sm"
                        />
                        <p className="text-slate-500 text-xs mt-1">
                            Supports: QQ+, 22-66, AKs, AQo, A5s-A2s, AKs:0.5
                        </p>
                    </div>

                    {/* Calculate Button */}
                    <button
                        onClick={calculateEquity}
                        disabled={calculating || !heroCards[0] || !heroCards[1] || !villainRange}
                        className="btn-primary w-full mb-4 disabled:opacity-50"
                    >
                        {calculating ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Calculating...
                            </span>
                        ) : 'Calculate Equity'}
                    </button>

                    {/* Error */}
                    {equityError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                            <p className="text-red-400 text-sm">{equityError}</p>
                        </div>
                    )}

                    {/* Results */}
                    {equityResult && (
                        <div className="space-y-3 animate-fade-in">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{equityResult.winPercent.toFixed(1)}%</p>
                                    <p className="text-slate-400 text-xs">Win</p>
                                </div>
                                <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-slate-400">{equityResult.tiePercent.toFixed(1)}%</p>
                                    <p className="text-slate-400 text-xs">Tie</p>
                                </div>
                                <div className="flex-1 bg-slate-900/50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-red-400">{equityResult.losePercent.toFixed(1)}%</p>
                                    <p className="text-slate-400 text-xs">Lose</p>
                                </div>
                            </div>

                            {/* Equity Bar */}
                            <div className="h-3 bg-slate-900 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-green-500 transition-all"
                                    style={{ width: `${equityResult.winPercent}%` }}
                                />
                                <div
                                    className="bg-slate-500 transition-all"
                                    style={{ width: `${equityResult.tiePercent}%` }}
                                />
                                <div
                                    className="bg-red-500 transition-all"
                                    style={{ width: `${equityResult.losePercent}%` }}
                                />
                            </div>

                            <p className="text-slate-500 text-xs text-center">
                                {equityResult.samples.toLocaleString()} samples • {equityResult.rangeCombos} combos in range
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
