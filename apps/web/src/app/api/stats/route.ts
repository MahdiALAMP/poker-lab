import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const playerName = searchParams.get('player');

    if (!playerName) {
        return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    try {
        console.log(`Calculating stats for player: "${playerName}"`);
        // Get all hands where this player participated
        const playerHands = await prisma.playerInHand.findMany({
            where: { playerName },
            include: {
                hand: {
                    include: {
                        actions: true,
                        players: true,
                    },
                },
            },
            orderBy: {
                hand: {
                    timestamp: 'asc',
                },
            },
        });

        console.log(`Found ${playerHands.length} hands for player: "${playerName}"`);

        if (playerHands.length === 0) {
            return NextResponse.json({
                playerName,
                handsPlayed: 0,
                stats: null,
                positionStats: [],
                resultsOverTime: [],
            });
        }

        // Calculate stats
        let vpipCount = 0;
        let pfrCount = 0;
        let threeBetOpportunities = 0;
        let threeBetCount = 0;
        let foldToThreeBetOpportunities = 0;
        let foldToThreeBetCount = 0;
        let cbetOpportunities = 0;
        let cbetCount = 0;
        let foldToCbetOpportunities = 0;
        let foldToCbetCount = 0;
        let sawFlop = 0;
        let wonAtFlop = 0;
        let wentToShowdown = 0;
        let wonAtShowdown = 0;
        let netWon = 0;
        let totalBigBlinds = 0;

        const positionData: Record<string, { hands: number; vpip: number; pfr: number; netWon: number }> = {};
        const resultsOverTime: { date: string; netWon: number; hands: number }[] = [];
        let cumulativeResult = 0;

        for (const ph of playerHands) {
            const hand = ph.hand;
            const actions = hand.actions;
            const position = ph.position;

            // Initialize position data
            if (!positionData[position]) {
                positionData[position] = { hands: 0, vpip: 0, pfr: 0, netWon: 0 };
            }
            positionData[position].hands++;

            // Track results
            netWon += ph.finalResult;
            positionData[position].netWon += ph.finalResult;
            totalBigBlinds += hand.bigBlind;

            // Get preflop actions for this player
            const preflopActions = actions.filter(a => a.street === 'PREFLOP' && a.actorName === playerName);
            const allPreflopActions = actions.filter(a => a.street === 'PREFLOP');

            // VPIP: voluntarily put money in pot (call, raise, bet - not just blinds)
            const voluntaryActions = preflopActions.filter(a =>
                a.actionType === 'call' || a.actionType === 'raise' || a.actionType === 'bet' || a.actionType === 'all-in'
            );
            if (voluntaryActions.length > 0) {
                vpipCount++;
                positionData[position].vpip++;
            }

            // PFR: preflop raise
            const raiseActions = preflopActions.filter(a =>
                a.actionType === 'raise' || (a.actionType === 'bet' && a.amount > hand.bigBlind)
            );
            if (raiseActions.length > 0) {
                pfrCount++;
                positionData[position].pfr++;
            }

            // 3-bet tracking
            const raises = allPreflopActions.filter(a => a.actionType === 'raise');
            if (raises.length >= 1) {
                // There was a raise before player's action
                const firstRaise = raises[0];
                const playerActionsAfterRaise = preflopActions.filter(a => a.sequence > firstRaise.sequence);

                if (playerActionsAfterRaise.length > 0) {
                    threeBetOpportunities++;
                    const player3bet = playerActionsAfterRaise.find(a => a.actionType === 'raise');
                    if (player3bet) {
                        threeBetCount++;
                    }
                }
            }

            // Fold to 3-bet tracking
            if (raises.length >= 2) {
                const playerRaise = raises.find(r => r.actorName === playerName);
                if (playerRaise) {
                    const opponentRaise = raises.find(r => r.actorName !== playerName && r.sequence > playerRaise.sequence);
                    if (opponentRaise) {
                        foldToThreeBetOpportunities++;
                        const playerFold = preflopActions.find(a => a.sequence > opponentRaise.sequence && a.actionType === 'fold');
                        if (playerFold) {
                            foldToThreeBetCount++;
                        }
                    }
                }
            }

            // Check if player saw flop
            const flopActions = actions.filter(a => a.street === 'FLOP');
            const playerSawFlop = flopActions.some(a => a.actorName === playerName) ||
                (flopActions.length > 0 && !preflopActions.some(a => a.actionType === 'fold'));

            if (playerSawFlop && hand.boardFlop) {
                sawFlop++;

                // C-bet tracking (was player the preflop aggressor?)
                const wasPFAggressor = raiseActions.length > 0;
                const flopPlayerActions = flopActions.filter(a => a.actorName === playerName);

                if (wasPFAggressor && flopPlayerActions.length > 0) {
                    cbetOpportunities++;
                    const cbet = flopPlayerActions.find(a => a.actionType === 'bet');
                    if (cbet) {
                        cbetCount++;
                    }
                }

                // Fold to c-bet tracking
                const opponentBet = flopActions.find(a => a.actorName !== playerName && a.actionType === 'bet');
                if (opponentBet && !wasPFAggressor) {
                    foldToCbetOpportunities++;
                    const playerFold = flopPlayerActions.find(a => a.actionType === 'fold');
                    if (playerFold) {
                        foldToCbetCount++;
                    }
                }

                // Win tracking
                if (ph.finalResult > 0) {
                    wonAtFlop++;
                }
            }

            // Showdown tracking
            const showdownActions = actions.filter(a => a.street === 'RIVER');
            if (showdownActions.some(a => a.actorName === playerName) && hand.boardRiver) {
                wentToShowdown++;
                if (ph.finalResult > 0) {
                    wonAtShowdown++;
                }
            }

            // Results over time
            const dateStr = hand.timestamp.toISOString().split('T')[0];
            cumulativeResult += ph.finalResult;

            const lastEntry = resultsOverTime[resultsOverTime.length - 1];
            if (lastEntry && lastEntry.date === dateStr) {
                lastEntry.netWon = cumulativeResult;
                lastEntry.hands++;
            } else {
                resultsOverTime.push({ date: dateStr, netWon: cumulativeResult, hands: 1 });
            }
        }

        const handsPlayed = playerHands.length;
        const avgBB = totalBigBlinds / handsPlayed || 0;

        const stats = {
            vpip: handsPlayed > 0 ? (vpipCount / handsPlayed) * 100 : 0,
            pfr: handsPlayed > 0 ? (pfrCount / handsPlayed) * 100 : 0,
            threeBet: threeBetOpportunities > 0 ? (threeBetCount / threeBetOpportunities) * 100 : 0,
            foldToThreeBet: foldToThreeBetOpportunities > 0 ? (foldToThreeBetCount / foldToThreeBetOpportunities) * 100 : 0,
            cbet: cbetOpportunities > 0 ? (cbetCount / cbetOpportunities) * 100 : 0,
            foldToCbet: foldToCbetOpportunities > 0 ? (foldToCbetCount / foldToCbetOpportunities) * 100 : 0,
            wtsd: sawFlop > 0 ? (wentToShowdown / sawFlop) * 100 : 0,
            wssd: wentToShowdown > 0 ? (wonAtShowdown / wentToShowdown) * 100 : 0,
            wwsf: sawFlop > 0 ? (wonAtFlop / sawFlop) * 100 : 0,
            netWon,
            bbPer100: avgBB > 0 ? (netWon / avgBB) / (handsPlayed / 100) : 0,
        };

        const positionStats = Object.entries(positionData).map(([position, data]) => ({
            position,
            handsPlayed: data.hands,
            vpip: data.hands > 0 ? (data.vpip / data.hands) * 100 : 0,
            pfr: data.hands > 0 ? (data.pfr / data.hands) * 100 : 0,
            netWon: data.netWon,
        }));

        return NextResponse.json({
            playerName,
            handsPlayed,
            stats,
            positionStats,
            resultsOverTime,
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate stats' },
            { status: 500 }
        );
    }
}
