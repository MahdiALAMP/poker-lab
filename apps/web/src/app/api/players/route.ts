import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const players = await prisma.playerInHand.groupBy({
            by: ['playerName'],
            _count: { playerName: true },
            orderBy: { _count: { playerName: 'desc' } },
            take: 100,
        });

        return NextResponse.json({
            players: players.map(p => ({
                name: p.playerName,
                handsCount: p._count.playerName,
            })),
        });
    } catch (error) {
        console.error('Players error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch players' },
            { status: 500 }
        );
    }
}
