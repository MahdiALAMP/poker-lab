import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const player = searchParams.get('player');
    const position = searchParams.get('position');
    const sawFlop = searchParams.get('sawFlop');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    try {
        const where: Record<string, unknown> = {};

        // Build player filter
        if (player) {
            where.players = {
                some: { playerName: player },
            };
        }

        // Build position filter
        if (position && player) {
            where.players = {
                some: {
                    playerName: player,
                    position: position,
                },
            };
        }

        // Saw flop filter - hands that have a flop board
        if (sawFlop === 'true') {
            where.boardFlop = { not: null };
        } else if (sawFlop === 'false') {
            where.boardFlop = null;
        }

        const [hands, total] = await Promise.all([
            prisma.hand.findMany({
                where,
                include: {
                    players: true,
                    actions: {
                        orderBy: { sequence: 'asc' },
                        take: 5, // Just get first few actions for preview
                    },
                },
                orderBy: { timestamp: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.hand.count({ where }),
        ]);

        // Transform hands for response
        const transformedHands = hands.map(hand => {
            const hero = hand.players.find(p => p.isHero);
            const heroPlayer = player ? hand.players.find(p => p.playerName === player) : hero;

            return {
                id: hand.id,
                siteHandId: hand.siteHandId,
                timestamp: hand.timestamp,
                stakes: hand.stakes,
                tableName: hand.tableName,
                maxSeats: hand.maxSeats,
                board: [hand.boardFlop, hand.boardTurn, hand.boardRiver].filter(Boolean).join(' '),
                potTotal: hand.potTotal,
                heroName: heroPlayer?.playerName || null,
                heroPosition: heroPlayer?.position || null,
                heroCards: heroPlayer?.holeCards || null,
                heroResult: heroPlayer?.finalResult || 0,
                playerCount: hand.players.length,
            };
        });

        return NextResponse.json({
            hands: transformedHands,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Hands error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hands' },
            { status: 500 }
        );
    }
}
