import {
    type Card,
    type Rank,
    type Suit,
    type Position,
    type Street,
    type ActionType,
    type ParsedAction,
    type ParsedPlayer,
    type ParsedHand,
    parseCardString,
    POSITIONS_6MAX,
    POSITIONS_9MAX,
} from '@poker-lab/shared';

// Regular expressions for parsing PokerStars hand history
const HAND_HEADER_REGEX = /PokerStars (?:Zoom )?Hand #(\d+):\s+(?:Hold'em No Limit|NLHE)\s+\(([^)]+)\)/;
const TIMESTAMP_REGEX = /(\d{4}\/\d{2}\/\d{2})\s+(\d+:\d+:\d+)\s+(\w+)/;
const TABLE_REGEX = /Table '([^']+)'\s+(\d+)-max\s+Seat #(\d+) is the button/;
const SEAT_REGEX = /Seat (\d+): ([^\(]+) \(\$?([\d.]+)/;
const BLIND_POST_REGEX = /([^:]+): posts (?:small|big) blind \$?([\d.]+)/;
const ANTE_REGEX = /([^:]+): posts the ante \$?([\d.]+)/;
const HERO_CARDS_REGEX = /Dealt to ([^\[]+)\[([^\]]+)\]/;
const ACTION_REGEX = /^([^:]+): (folds|checks|calls|bets|raises)(?: \$?([\d.]+))?(?: to \$?([\d.]+))?(?: and is all-in)?/;
const BOARD_REGEX = /\[([^\]]+)\]/;
const SHOWDOWN_REGEX = /([^:]+): shows \[([^\]]+)\]/;
const COLLECTED_REGEX = /([^\s]+) collected \$?([\d.]+)/;
const SUMMARY_TOTAL_POT_REGEX = /Total pot \$?([\d.]+)/;
const SUMMARY_RAKE_REGEX = /Rake \$?([\d.]+)/;

export class PokerStarsParser {
    /**
     * Parse multiple hands from a hand history file content
     */
    parseMultipleHands(content: string): ParsedHand[] {
        const hands: ParsedHand[] = [];
        const handTexts = this.splitHands(content);

        for (const handText of handTexts) {
            try {
                const parsed = this.parseHand(handText);
                if (parsed) {
                    hands.push(parsed);
                }
            } catch (error) {
                console.error('Failed to parse hand:', error);
                // Continue parsing other hands
            }
        }

        return hands;
    }

    /**
     * Split a file into individual hand histories
     */
    private splitHands(content: string): string[] {
        // PokerStars hands are separated by blank lines
        const hands = content.split(/\n\n\n+|\r\n\r\n\r\n+/);
        return hands.filter(h => h.trim().length > 0 && h.includes('PokerStars'));
    }

    /**
     * Parse a single hand history
     */
    parseHand(handText: string): ParsedHand | null {
        const lines = handText.split(/\r?\n/).filter(l => l.trim().length > 0);

        // Parse header
        const headerMatch = lines[0]?.match(HAND_HEADER_REGEX);
        if (!headerMatch) {
            return null;
        }

        const siteHandId = headerMatch[1];
        const stakes = headerMatch[2];

        // Parse timestamp
        const timestampMatch = lines[0]?.match(TIMESTAMP_REGEX);
        let timestamp = new Date();
        if (timestampMatch) {
            const [, date, time, tz] = timestampMatch;
            timestamp = new Date(`${date.replace(/\//g, '-')}T${time}`);
        }

        // Parse stakes values
        const stakesMatch = stakes.match(/\$?([\d.]+)\/\$?([\d.]+)/);
        const smallBlind = stakesMatch ? parseFloat(stakesMatch[1]) : 0;
        const bigBlind = stakesMatch ? parseFloat(stakesMatch[2]) : 0;

        // Parse table info
        let tableName = 'Unknown';
        let maxSeats = 6;
        let buttonSeat = 1;

        for (const line of lines) {
            const tableMatch = line.match(TABLE_REGEX);
            if (tableMatch) {
                tableName = tableMatch[1];
                maxSeats = parseInt(tableMatch[2]);
                buttonSeat = parseInt(tableMatch[3]);
                break;
            }
        }

        // Parse seats and players
        const players: ParsedPlayer[] = [];
        const seatMap = new Map<number, ParsedPlayer>();

        for (const line of lines) {
            const seatMatch = line.match(SEAT_REGEX);
            if (seatMatch) {
                const seatNumber = parseInt(seatMatch[1]);
                const name = seatMatch[2].trim();
                const stack = parseFloat(seatMatch[3]);

                const player: ParsedPlayer = {
                    seatNumber,
                    name,
                    position: 'UTG', // Will be computed later
                    startingStack: stack,
                    finalResult: 0,
                    isHero: false,
                };
                players.push(player);
                seatMap.set(seatNumber, player);
            }
        }

        // Compute positions
        this.assignPositions(players, buttonSeat, maxSeats);

        // Parse blinds posted
        let pot = 0;
        const actions: ParsedAction[] = [];
        let sequence = 0;

        for (const line of lines) {
            const blindMatch = line.match(BLIND_POST_REGEX);
            if (blindMatch) {
                const actor = blindMatch[1].trim();
                const amount = parseFloat(blindMatch[2]);
                pot += amount;

                actions.push({
                    street: 'PREFLOP',
                    sequence: sequence++,
                    actor,
                    actionType: 'post',
                    amount,
                    potAfterAction: pot,
                    isAllIn: false,
                });
            }

            const anteMatch = line.match(ANTE_REGEX);
            if (anteMatch) {
                const actor = anteMatch[1].trim();
                const amount = parseFloat(anteMatch[2]);
                pot += amount;

                actions.push({
                    street: 'PREFLOP',
                    sequence: sequence++,
                    actor,
                    actionType: 'post',
                    amount,
                    potAfterAction: pot,
                    isAllIn: false,
                });
            }
        }

        // Parse hero cards
        for (const line of lines) {
            const heroMatch = line.match(HERO_CARDS_REGEX);
            if (heroMatch) {
                const heroName = heroMatch[1].trim();
                const cardsStr = heroMatch[2];
                const player = players.find(p => p.name === heroName);
                if (player) {
                    player.isHero = true;
                    player.holeCards = this.parseCards(cardsStr) as [Card, Card] | undefined;
                }
            }
        }

        // Parse actions by street
        let currentStreet: Street = 'PREFLOP';
        const board: Card[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for street transitions
            if (line.includes('*** FLOP ***')) {
                currentStreet = 'FLOP';
                const boardMatch = line.match(BOARD_REGEX);
                if (boardMatch) {
                    const flopCards = this.parseCards(boardMatch[1]);
                    board.push(...flopCards);
                }
                continue;
            }
            if (line.includes('*** TURN ***')) {
                currentStreet = 'TURN';
                // Turn card is in brackets after existing board
                const turnMatch = line.match(/\] \[([^\]]+)\]/);
                if (turnMatch) {
                    const turnCards = this.parseCards(turnMatch[1]);
                    board.push(...turnCards);
                }
                continue;
            }
            if (line.includes('*** RIVER ***')) {
                currentStreet = 'RIVER';
                const riverMatch = line.match(/\] \[([^\]]+)\]/);
                if (riverMatch) {
                    const riverCards = this.parseCards(riverMatch[1]);
                    board.push(...riverCards);
                }
                continue;
            }
            if (line.includes('*** SHOWDOWN ***') || line.includes('*** SUMMARY ***')) {
                break;
            }

            // Parse actions
            const actionMatch = line.match(ACTION_REGEX);
            if (actionMatch && !line.includes('posts')) {
                const actor = actionMatch[1].trim();
                const actionStr = actionMatch[2];
                const isAllIn = line.includes('all-in');

                let actionType: ActionType;
                let amount = 0;

                switch (actionStr) {
                    case 'folds':
                        actionType = 'fold';
                        break;
                    case 'checks':
                        actionType = 'check';
                        break;
                    case 'calls':
                        actionType = 'call';
                        amount = parseFloat(actionMatch[3] || '0');
                        pot += amount;
                        break;
                    case 'bets':
                        actionType = 'bet';
                        amount = parseFloat(actionMatch[3] || '0');
                        pot += amount;
                        break;
                    case 'raises':
                        actionType = 'raise';
                        // For raises, the "to" amount is the total bet
                        // We need to compute the actual raise amount
                        const toAmount = parseFloat(actionMatch[4] || actionMatch[3] || '0');
                        amount = toAmount; // Store total bet size
                        pot += toAmount; // Simplified - in reality need to track previous bet
                        break;
                    default:
                        continue;
                }

                actions.push({
                    street: currentStreet,
                    sequence: sequence++,
                    actor,
                    actionType: isAllIn ? 'all-in' : actionType,
                    amount,
                    potAfterAction: pot,
                    isAllIn,
                });
            }
        }

        // Parse showdown results
        const winners: { name: string; amount: number }[] = [];
        let inSummary = false;

        for (const line of lines) {
            if (line.includes('*** SUMMARY ***')) {
                inSummary = true;
            }

            const collectedMatch = line.match(COLLECTED_REGEX);
            if (collectedMatch) {
                winners.push({
                    name: collectedMatch[1].trim(),
                    amount: parseFloat(collectedMatch[2]),
                });
            }

            // Parse shown cards at showdown
            const showdownMatch = line.match(SHOWDOWN_REGEX);
            if (showdownMatch) {
                const playerName = showdownMatch[1].trim();
                const cardsStr = showdownMatch[2];
                const player = players.find(p => p.name === playerName);
                if (player && !player.holeCards) {
                    player.holeCards = this.parseCards(cardsStr) as [Card, Card] | undefined;
                }
            }
        }

        // Calculate final results for players
        for (const winner of winners) {
            const player = players.find(p => p.name === winner.name);
            if (player) {
                player.finalResult += winner.amount;
            }
        }

        // Parse total pot and rake from summary
        let potTotal = pot;
        let rake = 0;

        for (const line of lines) {
            const potMatch = line.match(SUMMARY_TOTAL_POT_REGEX);
            if (potMatch) {
                potTotal = parseFloat(potMatch[1]);
            }
            const rakeMatch = line.match(SUMMARY_RAKE_REGEX);
            if (rakeMatch) {
                rake = parseFloat(rakeMatch[1]);
            }
        }

        return {
            siteHandId,
            timestamp,
            stakes,
            currency: 'USD',
            tableName,
            maxSeats,
            buttonSeat,
            smallBlind,
            bigBlind,
            ante: 0,
            players,
            actions,
            board,
            potTotal,
            rake,
            winners,
        };
    }

    /**
     * Assign positions to players based on button seat
     */
    private assignPositions(players: ParsedPlayer[], buttonSeat: number, maxSeats: number): void {
        // Sort players by seat number
        const sortedPlayers = [...players].sort((a, b) => a.seatNumber - b.seatNumber);
        const numPlayers = sortedPlayers.length;

        // Find button player index
        let buttonIdx = sortedPlayers.findIndex(p => p.seatNumber === buttonSeat);
        if (buttonIdx === -1) {
            // Button is at empty seat, find next player
            for (let i = 0; i < sortedPlayers.length; i++) {
                if (sortedPlayers[i].seatNumber >= buttonSeat) {
                    buttonIdx = i > 0 ? i - 1 : sortedPlayers.length - 1;
                    break;
                }
            }
            if (buttonIdx === -1) buttonIdx = sortedPlayers.length - 1;
        }

        const positions = maxSeats <= 6 ? POSITIONS_6MAX : POSITIONS_9MAX;

        // Map based on number of players
        const positionMap = this.getPositionMapping(numPlayers, positions);

        // Assign positions starting from button
        for (let i = 0; i < numPlayers; i++) {
            const playerIdx = (buttonIdx + i) % numPlayers;
            sortedPlayers[playerIdx].position = positionMap[i] || 'UTG';
        }
    }

    /**
     * Get position mapping based on number of players
     */
    private getPositionMapping(numPlayers: number, positions: Position[]): Position[] {
        // For different table sizes, map positions
        switch (numPlayers) {
            case 2:
                return ['BTN', 'BB']; // Heads up: BTN is SB
            case 3:
                return ['BTN', 'SB', 'BB'];
            case 4:
                return ['BTN', 'SB', 'BB', 'UTG'];
            case 5:
                return ['BTN', 'SB', 'BB', 'UTG', 'CO'];
            case 6:
                return ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO'];
            case 7:
                return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'CO'];
            case 8:
                return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
            case 9:
                return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO'];
            default:
                return positions.slice(0, numPlayers);
        }
    }

    /**
     * Parse card strings like "Ah Kd" into Card objects
     */
    private parseCards(cardsStr: string): Card[] {
        const cards: Card[] = [];
        const cardStrs = cardsStr.trim().split(/\s+/);

        for (const cardStr of cardStrs) {
            const card = parseCardString(cardStr);
            if (card) {
                cards.push(card);
            }
        }

        return cards;
    }
}

export { parseCardString };
export * from '@poker-lab/shared';
