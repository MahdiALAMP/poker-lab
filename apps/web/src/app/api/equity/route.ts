import { NextRequest, NextResponse } from 'next/server';
import { calculateEquity, parseRange } from '@poker-lab/equity';
import { parseCardString, Card } from '@poker-lab/shared';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { heroCards, board, villainRange, samples = 10000 } = body;

        if (!heroCards || heroCards.length !== 2) {
            return NextResponse.json(
                { error: 'Hero must have exactly 2 cards' },
                { status: 400 }
            );
        }

        if (!villainRange) {
            return NextResponse.json(
                { error: 'Villain range is required' },
                { status: 400 }
            );
        }

        // Parse hero cards
        const parsedHeroCards: [Card, Card] = [
            parseCardString(heroCards[0])!,
            parseCardString(heroCards[1])!,
        ];

        if (!parsedHeroCards[0] || !parsedHeroCards[1]) {
            return NextResponse.json(
                { error: 'Invalid hero cards format' },
                { status: 400 }
            );
        }

        // Parse board cards
        const parsedBoard: Card[] = [];
        if (board && board.length > 0) {
            for (const cardStr of board) {
                const card = parseCardString(cardStr);
                if (!card) {
                    return NextResponse.json(
                        { error: `Invalid board card: ${cardStr}` },
                        { status: 400 }
                    );
                }
                parsedBoard.push(card);
            }
        }

        // Parse villain range
        let range;
        try {
            range = parseRange(villainRange);
        } catch (error) {
            return NextResponse.json(
                { error: `Invalid range notation: ${error instanceof Error ? error.message : 'Unknown error'}` },
                { status: 400 }
            );
        }

        if (range.hands.length === 0) {
            return NextResponse.json(
                { error: 'Villain range is empty' },
                { status: 400 }
            );
        }

        // Calculate equity
        const result = calculateEquity(
            parsedHeroCards,
            parsedBoard,
            range,
            Math.min(samples, 50000) // Cap samples
        );

        return NextResponse.json({
            winPercent: result.winPercent,
            tiePercent: result.tiePercent,
            losePercent: result.losePercent,
            samples: result.samples,
            rangeCombos: range.hands.length,
        });
    } catch (error) {
        console.error('Equity calculation error:', error);
        return NextResponse.json(
            { error: 'Failed to calculate equity' },
            { status: 500 }
        );
    }
}
