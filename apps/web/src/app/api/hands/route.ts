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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { hand } = body;

        if (!hand) {
            return NextResponse.json({ error: 'No hand data provided' }, { status: 400 });
        }

        // Generate a random ID for siteHandId since it's manual
        const siteHandId = `MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

        // Create hand with players and actions
        const savedHand = await prisma.hand.create({
            data: {
                siteHandId,
                timestamp: new Date(),
                stakes: hand.stakes || '$0.25/$0.50',
                currency: 'USD',
                tableName: 'Manual Lab',
                maxSeats: 6,
                buttonSeat: 1,
                smallBlind: hand.smallBlind || 0.25,
                bigBlind: hand.bigBlind || 0.50,
                ante: 0,
                boardFlop: hand.boardFlop || null,
                boardTurn: hand.boardTurn || null,
                boardRiver: hand.boardRiver || null,
                potTotal: hand.potTotal || 0,
                rake: 0,
                players: {
                    create: hand.players.map((p: any) => ({
                        seatNumber: p.seatNumber,
                        playerName: p.playerName,
                        position: p.position,
                        startingStack: p.startingStack,
                        holeCards: p.holeCards || null,
                        finalResult: p.finalResult || 0,
                        isHero: p.isHero || false,
                    })),
                },
                actions: {
                    create: hand.actions.map((a: any) => ({
                        street: a.street,
                        sequence: a.sequence,
                        actorName: a.actorName,
                        actionType: a.actionType,
                        amount: a.amount,
                        potAfterAction: a.potAfterAction,
                        isAllIn: a.isAllIn || false,
                    })),
                },
            },
            include: {
                players: true,
                actions: true,
            }
        });

        return NextResponse.json({ success: true, hand: savedHand });
    } catch (error) {
        console.error('Save manual hand error:', error);

        const message = error instanceof Error ? error.message : String(error);
        let details = 'Database request failed. Check the Vercel function logs for the server-side error.';

        if (message.includes('Environment variable not found') && message.includes('DATABASE_URL')) {
            details = 'DATABASE_URL is not configured for this deployment.';
        } else if (message.includes('P2021') || (message.toLowerCase().includes('table') && message.toLowerCase().includes('does not exist'))) {
            details = 'The PostgreSQL tables are missing. Run the Prisma schema setup against the production database.';
        } else if (message.includes('P1001') || message.includes("Can't reach database server")) {
            details = 'The app cannot reach the PostgreSQL database. Check DATABASE_URL and database availability.';
        } else if (message.includes('P1000') || message.toLowerCase().includes('authentication failed')) {
            details = 'PostgreSQL authentication failed. Check the credentials in DATABASE_URL.';
        }

        return NextResponse.json(
            { error: 'Failed to save hand', details },
            { status: 500 }
        );
    }
}

