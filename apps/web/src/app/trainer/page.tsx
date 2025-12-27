'use client';

import { useEffect, useState } from 'react';

interface Player {
    name: string;
    handsCount: number;
}

interface TrainerQuestion {
    id: string;
    handId: string;
    heroName: string;
    heroPosition: string;
    villainPosition: string;
    effectiveStack: number;
    preflopLine: string;
    board: string;
    potSize: number;
    betSizeFaced: number;
    heroCards: string | null;
    street: string;
    correctContext: {
        potOdds: number;
        mdf: number;
        boardTexture: string;
        villainRange: string;
    };
}

interface TrainerFeedback {
    grade: 'green' | 'yellow' | 'red';
    explanation: string;
    potOdds: number;
    mdf: number;
    equity: number | null;
    assumptions: string[];
}

interface SessionResult {
    questionId: string;
    answer: string;
    feedback: TrainerFeedback;
}

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

export default function TrainerPage() {
    const [players, setPlayers] = useState<Player[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState('');
    const [sessionStarted, setSessionStarted] = useState(false);
    const [questions, setQuestions] = useState<TrainerQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<SessionResult[]>([]);
    const [currentFeedback, setCurrentFeedback] = useState<TrainerFeedback | null>(null);
    const [answering, setAnswering] = useState(false);

    useEffect(() => {
        fetch('/api/players')
            .then(res => res.json())
            .then(data => {
                setPlayers(data.players || []);
                const hero = data.players?.find((p: Player) => p.name === 'Hero');
                if (hero) setSelectedPlayer(hero.name);
                else if (data.players?.length > 0) setSelectedPlayer(data.players[0].name);
            })
            .catch(console.error);
    }, []);

    const startSession = async () => {
        if (!selectedPlayer) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/trainer?hero=${encodeURIComponent(selectedPlayer)}&count=10`);
            const data = await res.json();

            if (data.questions?.length > 0) {
                setQuestions(data.questions);
                setCurrentIndex(0);
                setResults([]);
                setCurrentFeedback(null);
                setSessionStarted(true);
            } else {
                alert('No suitable hands found for training. Import more hands where you defended vs a c-bet.');
            }
        } catch (error) {
            console.error('Failed to start session:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitAnswer = async (answer: 'fold' | 'call' | 'raise') => {
        const question = questions[currentIndex];
        if (!question) return;

        setAnswering(true);
        try {
            const res = await fetch('/api/trainer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questionId: question.id,
                    answer,
                    heroCards: question.heroCards,
                    board: question.board,
                    villainRange: question.correctContext.villainRange,
                    potOdds: question.correctContext.potOdds,
                    mdf: question.correctContext.mdf,
                    betSizeFaced: question.betSizeFaced,
                    potSize: question.potSize,
                }),
            });

            const feedback = await res.json();
            setCurrentFeedback(feedback);
            setResults([...results, { questionId: question.id, answer, feedback }]);
        } catch (error) {
            console.error('Failed to grade answer:', error);
        } finally {
            setAnswering(false);
        }
    };

    const nextQuestion = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCurrentFeedback(null);
        }
    };

    const endSession = () => {
        setSessionStarted(false);
        setQuestions([]);
        setCurrentIndex(0);
        setCurrentFeedback(null);
    };

    const currentQuestion = questions[currentIndex];
    const isLastQuestion = currentIndex === questions.length - 1;
    const isSessionComplete = results.length === questions.length && questions.length > 0;

    // Calculate session stats
    const greenCount = results.filter(r => r.feedback.grade === 'green').length;
    const yellowCount = results.filter(r => r.feedback.grade === 'yellow').length;
    const redCount = results.filter(r => r.feedback.grade === 'red').length;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Trainer Mode</h1>
                <p className="text-slate-400">Practice decision-making with quizzes from your hands</p>
            </div>

            {!sessionStarted ? (
                <div className="glass-card p-8">
                    {/* Setup */}
                    <div className="text-center mb-8">
                        <h2 className="text-xl font-semibold text-white mb-2">Start Training Session</h2>
                        <p className="text-slate-400">
                            Practice defending vs continuation bets on the flop
                        </p>
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                        {/* Player Selection */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Select Hero</label>
                            <select
                                value={selectedPlayer}
                                onChange={e => setSelectedPlayer(e.target.value)}
                                className="select-field"
                            >
                                {players.map(p => (
                                    <option key={p.name} value={p.name}>
                                        {p.name} ({p.handsCount} hands)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Scenario Info */}
                        <div className="p-4 bg-slate-900/50 rounded-lg">
                            <h3 className="text-white font-medium mb-2">Scenario: Flop C-Bet Defense</h3>
                            <p className="text-slate-400 text-sm">
                                You will be shown situations where you called preflop and faced a continuation bet on the flop.
                                Decide whether to fold, call, or raise.
                            </p>
                            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded text-amber-400 text-sm">
                                <strong>Note:</strong> Feedback uses heuristics (pot odds, MDF, equity) and assumed ranges.
                                This is not solver-derived &mdash; use it to study concepts, not exact play.
                            </div>
                        </div>

                        <button
                            onClick={startSession}
                            disabled={loading || !selectedPlayer}
                            className="btn-primary w-full py-3 text-lg disabled:opacity-50"
                        >
                            {loading ? 'Loading Questions...' : 'Start 10-Question Session'}
                        </button>
                    </div>
                </div>
            ) : isSessionComplete && currentFeedback ? (
                /* Session Summary */
                <div className="glass-card p-8 animate-fade-in">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white mb-2">Session Complete!</h2>
                        <p className="text-slate-400">You answered {questions.length} questions</p>
                    </div>

                    {/* Score Summary */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-3xl font-bold text-green-400">{greenCount}</p>
                            <p className="text-slate-400 text-sm">Good</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-3xl font-bold text-yellow-400">{yellowCount}</p>
                            <p className="text-slate-400 text-sm">Marginal</p>
                        </div>
                        <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-3xl font-bold text-red-400">{redCount}</p>
                            <p className="text-slate-400 text-sm">Questionable</p>
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="space-y-3 mb-8 max-h-64 overflow-y-auto">
                        {results.map((result, idx) => (
                            <div
                                key={result.questionId}
                                className={`p-3 rounded-lg flex items-center justify-between ${result.feedback.grade === 'green' ? 'grade-green' :
                                        result.feedback.grade === 'yellow' ? 'grade-yellow' : 'grade-red'
                                    }`}
                            >
                                <span>Question {idx + 1}: {result.answer.toUpperCase()}</span>
                                <span className="text-sm opacity-80">{result.feedback.grade.toUpperCase()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={startSession} className="btn-primary flex-1">
                            New Session
                        </button>
                        <button onClick={endSession} className="btn-secondary flex-1">
                            Exit
                        </button>
                    </div>
                </div>
            ) : currentQuestion ? (
                /* Question Display */
                <div className="space-y-6 animate-fade-in">
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-slate-400">
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                        <div className="flex gap-1">
                            {questions.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-3 h-3 rounded-full ${idx < results.length
                                            ? results[idx].feedback.grade === 'green'
                                                ? 'bg-green-500'
                                                : results[idx].feedback.grade === 'yellow'
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                            : idx === currentIndex
                                                ? 'bg-indigo-500'
                                                : 'bg-slate-700'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Scenario Card */}
                    <div className="glass-card p-6">
                        {/* Positions & Stacks */}
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <span className="text-slate-400 text-sm">You are </span>
                                <span className="px-2 py-1 bg-indigo-600/20 border border-indigo-500/30 rounded text-indigo-400 font-mono">
                                    {currentQuestion.heroPosition}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-slate-400 text-sm">Effective: </span>
                                <span className="text-white">${currentQuestion.effectiveStack.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Preflop Line */}
                        <div className="mb-4 p-3 bg-slate-900/50 rounded-lg">
                            <span className="text-slate-400 text-sm">Preflop: </span>
                            <span className="text-white">{currentQuestion.preflopLine}</span>
                        </div>

                        {/* Board */}
                        <div className="mb-4">
                            <span className="text-slate-400 text-sm block mb-2">Flop:</span>
                            <div className="flex gap-2">
                                {currentQuestion.board.split(' ').map((card, i) => (
                                    <CardDisplay key={i} card={card} />
                                ))}
                            </div>
                        </div>

                        {/* Hero Cards */}
                        {currentQuestion.heroCards && (
                            <div className="mb-4">
                                <span className="text-slate-400 text-sm block mb-2">Your Hand:</span>
                                <div className="flex gap-2">
                                    {currentQuestion.heroCards.split(' ').map((card, i) => (
                                        <CardDisplay key={i} card={card} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Faced */}
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-red-400 font-medium">
                                        {currentQuestion.villainPosition} bets ${currentQuestion.betSizeFaced.toFixed(2)}
                                    </span>
                                    <p className="text-slate-400 text-sm">
                                        into pot of ${(currentQuestion.potSize - currentQuestion.betSizeFaced).toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-bold">Pot: ${currentQuestion.potSize.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Answer Buttons or Feedback */}
                    {!currentFeedback ? (
                        <div className="glass-card p-6">
                            <p className="text-center text-slate-400 mb-4">What do you do?</p>
                            <div className="grid grid-cols-3 gap-4">
                                <button
                                    onClick={() => submitAnswer('fold')}
                                    disabled={answering}
                                    className="py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                                >
                                    FOLD
                                </button>
                                <button
                                    onClick={() => submitAnswer('call')}
                                    disabled={answering}
                                    className="py-4 bg-green-600/80 hover:bg-green-600 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                                >
                                    CALL
                                </button>
                                <button
                                    onClick={() => submitAnswer('raise')}
                                    disabled={answering}
                                    className="py-4 bg-red-600/80 hover:bg-red-600 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
                                >
                                    RAISE
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`glass-card p-6 animate-fade-in ${currentFeedback.grade === 'green' ? 'border-green-500/50' :
                                currentFeedback.grade === 'yellow' ? 'border-yellow-500/50' : 'border-red-500/50'
                            }`}>
                            {/* Grade Header */}
                            <div className={`flex items-center gap-3 mb-4 pb-4 border-b ${currentFeedback.grade === 'green' ? 'border-green-500/30' :
                                    currentFeedback.grade === 'yellow' ? 'border-yellow-500/30' : 'border-red-500/30'
                                }`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentFeedback.grade === 'green' ? 'bg-green-500/20' :
                                        currentFeedback.grade === 'yellow' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                                    }`}>
                                    {currentFeedback.grade === 'green' ? '✓' :
                                        currentFeedback.grade === 'yellow' ? '~' : '✗'}
                                </div>
                                <div>
                                    <p className={`font-semibold ${currentFeedback.grade === 'green' ? 'text-green-400' :
                                            currentFeedback.grade === 'yellow' ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {currentFeedback.grade === 'green' ? 'Good Decision' :
                                            currentFeedback.grade === 'yellow' ? 'Marginal' : 'Questionable'}
                                    </p>
                                </div>
                            </div>

                            {/* Explanation */}
                            <p className="text-white mb-4">{currentFeedback.explanation}</p>

                            {/* Math */}
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                                    <p className="text-xl font-bold text-indigo-400">
                                        {currentFeedback.potOdds.toFixed(1)}%
                                    </p>
                                    <p className="text-slate-400 text-xs">Pot Odds</p>
                                </div>
                                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                                    <p className="text-xl font-bold text-purple-400">
                                        {currentFeedback.mdf.toFixed(1)}%
                                    </p>
                                    <p className="text-slate-400 text-xs">MDF</p>
                                </div>
                                <div className="p-3 bg-slate-900/50 rounded-lg text-center">
                                    <p className="text-xl font-bold text-cyan-400">
                                        {currentFeedback.equity !== null ? `${currentFeedback.equity.toFixed(1)}%` : 'N/A'}
                                    </p>
                                    <p className="text-slate-400 text-xs">Equity</p>
                                </div>
                            </div>

                            {/* Assumptions */}
                            <div className="text-slate-500 text-xs space-y-1 mb-4">
                                {currentFeedback.assumptions.map((a, i) => (
                                    <p key={i}>• {a}</p>
                                ))}
                            </div>

                            {/* Next Button */}
                            <button
                                onClick={isLastQuestion ? () => { } : nextQuestion}
                                className="btn-primary w-full"
                            >
                                {isLastQuestion ? 'View Summary' : 'Next Question'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400">
                    Loading questions...
                </div>
            )}
        </div>
    );
}
