import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateEquity, parseRange } from '@poker-lab/equity';
import { parseCardString, Card } from '@poker-lab/shared';

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
    // For grading
    correctContext: {
        potOdds: number;
        mdf: number;
        boardTexture: string;
        villainRange: string;
    };
}

// Classify board texture
function classifyBoardTexture(board: string): string {
    const cards = board.split(' ').filter(c => c.length > 0);
    if (cards.length < 3) return 'unknown';

    const suits = cards.map(c => c[1]?.toLowerCase());
    const ranks = cards.map(c => {
        const r = c[0]?.toUpperCase();
        const rankMap: Record<string, number> = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return rankMap[r] || 0;
    });

    // Check for monotone
    if (suits.length >= 3 && suits.slice(0, 3).every(s => s === suits[0])) {
        return 'monotone (flush possible)';
    }

    // Check for paired
    const rankCounts = new Map<number, number>();
    ranks.forEach(r => rankCounts.set(r, (rankCounts.get(r) || 0) + 1));
    if ([...rankCounts.values()].some(c => c >= 2)) {
        return 'paired';
    }

    // Check for connected
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < sortedRanks.length; i++) {
        gaps.push(sortedRanks[i] - sortedRanks[i - 1]);
    }
    const isConnected = gaps.every(g => g <= 2);
    if (isConnected) {
        return 'connected (straight draws possible)';
    }

    // High card check
    const hasHighCards = ranks.filter(r => r >= 11).length >= 2;
    if (hasHighCards) {
        return 'high card heavy';
    }

    return 'dry/disconnected';
}

// Generate preflop line description
function describePreflopLine(actions: { actorName: string; actionType: string; amount: number }[], heroName: string): string {
    const raises = actions.filter(a => a.actionType === 'raise');

    if (raises.length === 0) {
        return 'Limped pot';
    } else if (raises.length === 1) {
        const raiser = raises[0].actorName;
        if (raiser === heroName) {
            return 'Hero opened, called';
        }
        return 'Single raised pot (SRP)';
    } else if (raises.length === 2) {
        return '3-bet pot';
    } else {
        return `${raises.length}-bet pot`;
    }
}

// Get default villain range based on position and action
function getVillainRange(position: string, is3Better: boolean): string {
    if (is3Better) {
        return 'QQ+, AKs, AKo'; // Tight 3-bet range
    }

    // Opening range by position
    const ranges: Record<string, string> = {
        BTN: 'AA-22, AKs-A2s, KQs-K8s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, 65s, AKo-A8o, KQo-KTo, QJo',
        CO: 'AA-22, AKs-A4s, KQs-K9s, QJs-Q9s, JTs-J9s, T9s, 98s, 87s, 76s, AKo-A9o, KQo-KTo, QJo',
        MP: 'AA-33, AKs-A8s, KQs-KTs, QJs, JTs, T9s, 98s, AKo-ATo, KQo',
        UTG: 'AA-55, AKs-ATs, KQs, QJs, JTs, AKo-AJo, KQo',
        SB: 'AA-22, AKs-A2s, KQs-K5s, QJs-Q7s, JTs-J8s, T9s-T8s, 98s, 87s, 76s, 65s, AKo-A6o, KQo-K9o, QJo-QTo',
    };

    return ranges[position] || 'AA-TT, AKs-ATs, KQs, AKo-AJo';
}

export async function GET(_request: NextRequest) {
    const searchParams = _request.nextUrl.searchParams;
    const heroName = searchParams.get('hero');
    const count = parseInt(searchParams.get('count') || '10');

    if (!heroName) {
        return NextResponse.json({ error: 'Hero name required' }, { status: 400 });
    }

    try {
        // Find hands where hero faced a c-bet on the flop
        const handsWithHero = await prisma.hand.findMany({
            where: {
                boardFlop: { not: null }, // Must have a flop
                players: {
                    some: {
                        playerName: heroName,
                        holeCards: { not: null }, // Hero's cards must be known
                    },
                },
            },
            include: {
                players: true,
                actions: {
                    orderBy: { sequence: 'asc' },
                },
            },
            take: 200, // Get a pool to filter from
        });

        const questions: TrainerQuestion[] = [];

        for (const hand of handsWithHero) {
            if (questions.length >= count) break;

            const hero = hand.players.find(p => p.playerName === heroName);
            if (!hero || !hero.holeCards) continue;

            const preflopActions = hand.actions.filter(a => a.street === 'PREFLOP');
            const flopActions = hand.actions.filter(a => a.street === 'FLOP');

            // Check for c-bet defense scenario
            // Hero must NOT be the preflop aggressor
            const preflopRaises = preflopActions.filter(a => a.actionType === 'raise');
            const heroRaised = preflopRaises.some(r => r.actorName === heroName);

            if (heroRaised) continue; // Skip if hero was aggressor

            // Find c-bet (first bet on flop by preflop aggressor)
            const pfAggressor = preflopRaises.length > 0 ? preflopRaises[preflopRaises.length - 1].actorName : null;
            if (!pfAggressor || pfAggressor === heroName) continue;

            const cbetAction = flopActions.find(a =>
                a.actorName === pfAggressor &&
                (a.actionType === 'bet' || a.actionType === 'raise')
            );

            if (!cbetAction) continue;

            // Hero must have an action after the c-bet
            const heroFlopAction = flopActions.find(a =>
                a.actorName === heroName &&
                a.sequence > cbetAction.sequence
            );

            if (!heroFlopAction) continue;

            // Get villain position
            const villain = hand.players.find(p => p.playerName === pfAggressor);
            if (!villain) continue;

            // Calculate pot and bet size at decision point
            const potBeforeBet = flopActions
                .filter(a => a.sequence < cbetAction.sequence)
                .reduce((sum, a) => sum + a.amount, 0) ||
                preflopActions.reduce((sum, a) => sum + a.amount, 0);

            const potAtDecision = potBeforeBet + cbetAction.amount;
            const betSize = cbetAction.amount;

            // Calculate effective stack
            const effectiveStack = Math.min(hero.startingStack, villain.startingStack);

            // Calculate pot odds
            const potOdds = (betSize / (potAtDecision + betSize)) * 100;
            const mdf = (1 - (betSize / (potAtDecision + betSize))) * 100;

            // Classify board
            const boardTexture = classifyBoardTexture(hand.boardFlop || '');

            // Get preflop line description
            const preflopLine = describePreflopLine(
                preflopActions.map(a => ({ actorName: a.actorName, actionType: a.actionType, amount: a.amount })),
                heroName
            );

            questions.push({
                id: `${hand.id}-flop`,
                handId: hand.id,
                heroName,
                heroPosition: hero.position,
                villainPosition: villain.position,
                effectiveStack,
                preflopLine,
                board: hand.boardFlop || '',
                potSize: potAtDecision,
                betSizeFaced: betSize,
                heroCards: hero.holeCards,
                street: 'FLOP',
                correctContext: {
                    potOdds,
                    mdf,
                    boardTexture,
                    villainRange: getVillainRange(villain.position, preflopRaises.length > 1),
                },
            });
        }

        return NextResponse.json({ questions });
    } catch (error) {
        console.error('Trainer error:', error);
        return NextResponse.json(
            { error: 'Failed to generate questions' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    // Grade an answer
    try {
        const body = await request.json();
        const { answer, heroCards, board, villainRange, potOdds, mdf } = body;

        // Calculate equity if we have hero cards
        let equity = null;
        if (heroCards && villainRange) {
            try {
                const parsedHero: [Card, Card] = [
                    parseCardString(heroCards.split(' ')[0])!,
                    parseCardString(heroCards.split(' ')[1])!,
                ];
                const parsedBoard = board.split(' ').map((c: string) => parseCardString(c)).filter(Boolean);
                const range = parseRange(villainRange);

                const result = calculateEquity(parsedHero, parsedBoard, range, 5000);
                equity = result.winPercent;
            } catch {
                // Continue without equity
            }
        }

        // Build feedback
        const feedback: {
            grade: 'green' | 'yellow' | 'red';
            explanation: string;
            potOdds: number;
            mdf: number;
            equity: number | null;
            assumptions: string[];
        } = {
            grade: 'yellow',
            explanation: '',
            potOdds,
            mdf,
            equity,
            assumptions: [
                `Villain range assumed: ${villainRange}`,
                'This is a simplified heuristic analysis, not solver-derived frequencies.',
            ],
        };

        // Grading logic


        if (answer === 'fold') {
            if (equity !== null && equity < potOdds - 5) {
                feedback.grade = 'green';
                feedback.explanation = `Good fold! Your equity (${equity.toFixed(1)}%) is significantly below your pot odds (${potOdds.toFixed(1)}%).`;
            } else if (equity !== null && equity > potOdds + 10) {
                feedback.grade = 'red';
                feedback.explanation = `Questionable fold. Your equity (${equity.toFixed(1)}%) exceeds pot odds (${potOdds.toFixed(1)}%). Consider calling or raising.`;
            } else {
                feedback.grade = 'yellow';
                feedback.explanation = `Folding is marginal here. Your equity is close to pot odds. Board texture and implied odds matter.`;
            }
        } else if (answer === 'call') {
            if (equity !== null && equity >= potOdds - 5 && equity <= potOdds + 15) {
                feedback.grade = 'green';
                feedback.explanation = `Good call! Your equity (${equity.toFixed(1)}%) meets the pot odds requirement (${potOdds.toFixed(1)}%).`;
            } else if (equity !== null && equity < potOdds - 10) {
                feedback.grade = 'red';
                feedback.explanation = `Loose call. Your equity (${equity.toFixed(1)}%) is below pot odds (${potOdds.toFixed(1)}%) without strong implied odds.`;
            } else if (equity !== null && equity > potOdds + 20) {
                feedback.grade = 'yellow';
                feedback.explanation = `Calling is fine, but with ${equity.toFixed(1)}% equity, raising might be better for value/protection.`;
            } else {
                feedback.grade = 'yellow';
                feedback.explanation = 'Calling is reasonable given the pot odds and board texture.';
            }
        } else if (answer === 'raise') {
            if (equity !== null && equity > 55) {
                feedback.grade = 'green';
                feedback.explanation = `Strong raise! With ${equity.toFixed(1)}% equity, you have a value raise.`;
            } else if (equity !== null && equity < 40 && equity > 30) {
                feedback.grade = 'yellow';
                feedback.explanation = `Semi-bluff raise. With ${equity.toFixed(1)}% equity and fold equity, this can be +EV but is high variance.`;
            } else if (equity !== null && equity < 30) {
                feedback.grade = 'red';
                feedback.explanation = `Risky raise. With only ${equity.toFixed(1)}% equity, you need significant fold equity for this to be profitable.`;
            } else {
                feedback.grade = 'yellow';
                feedback.explanation = 'Raising is an aggressive option. Consider your fold equity and table image.';
            }
        }

        return NextResponse.json(feedback);
    } catch (error) {
        console.error('Grading error:', error);
        return NextResponse.json(
            { error: 'Failed to grade answer' },
            { status: 500 }
        );
    }
}
