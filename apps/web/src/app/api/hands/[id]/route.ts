import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const hand = await prisma.hand.findUnique({
            where: { id: params.id },
            include: {
                players: {
                    orderBy: { seatNumber: 'asc' },
                },
                actions: {
                    orderBy: { sequence: 'asc' },
                },
            },
        });

        if (!hand) {
            return NextResponse.json({ error: 'Hand not found' }, { status: 404 });
        }

        return NextResponse.json({ hand });
    } catch (error) {
        console.error('Hand detail error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hand' },
            { status: 500 }
        );
    }
}
