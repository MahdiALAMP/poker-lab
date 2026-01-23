import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PokerStarsParser } from '@poker-lab/parser';
import { cardToString } from '@poker-lab/shared';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const parser = new PokerStarsParser();
        let totalHands = 0;
        let importedHands = 0;
        const errors: string[] = [];

        for (const file of files) {
            const content = await file.text();
            const hands = parser.parseMultipleHands(content);
            totalHands += hands.length;

            for (const hand of hands) {
                try {
                    // Check if hand already exists
                    const existing = await prisma.hand.findUnique({
                        where: { siteHandId: hand.siteHandId },
                    });

                    if (existing) {
                        continue; // Skip duplicate hands
                    }

                    // Create hand with players and actions
                    await prisma.hand.create({
                        data: {
                            siteHandId: hand.siteHandId,
                            timestamp: hand.timestamp,
                            stakes: hand.stakes,
                            currency: hand.currency,
                            tableName: hand.tableName,
                            maxSeats: hand.maxSeats,
                            buttonSeat: hand.buttonSeat,
                            smallBlind: hand.smallBlind,
                            bigBlind: hand.bigBlind,
                            ante: hand.ante,
                            boardFlop: hand.board.slice(0, 3).map(c => cardToString(c)).join(' ') || null,
                            boardTurn: hand.board[3] ? cardToString(hand.board[3]) : null,
                            boardRiver: hand.board[4] ? cardToString(hand.board[4]) : null,
                            potTotal: hand.potTotal,
                            rake: hand.rake,
                            players: {
                                create: hand.players.map(p => ({
                                    seatNumber: p.seatNumber,
                                    playerName: p.name,
                                    position: p.position,
                                    startingStack: p.startingStack,
                                    holeCards: p.holeCards ? p.holeCards.map(c => cardToString(c)).join(' ') : null,
                                    finalResult: p.finalResult,
                                    isHero: p.isHero,
                                })),
                            },
                            actions: {
                                create: hand.actions.map(a => ({
                                    street: a.street,
                                    sequence: a.sequence,
                                    actorName: a.actor,
                                    actionType: a.actionType,
                                    amount: a.amount,
                                    potAfterAction: a.potAfterAction,
                                    isAllIn: a.isAllIn,
                                })),
                            },
                        },
                    });

                    importedHands++;
                    console.log(`Successfully imported hand ${hand.siteHandId}`);
                } catch (error) {
                    console.error(`Error importing hand ${hand.siteHandId}:`, error);
                    errors.push(`Failed to import hand ${hand.siteHandId}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalHands,
            importedHands,
            skipped: totalHands - importedHands,
            errors: errors.slice(0, 10), // Limit errors returned
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { error: 'Failed to import hands', details: String(error) },
            { status: 500 }
        );
    }
}
