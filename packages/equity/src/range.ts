import { Card, Rank, Suit, RANK_VALUES } from '@poker-lab/shared';

// WeightedHand represents a specific hand with a probability weight
export interface WeightedHand {
    cards: [Card, Card];
    weight: number;
}

// Range represents a collection of possible hands with weights
export interface Range {
    hands: WeightedHand[];
}

const RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS: Suit[] = ['h', 'd', 'c', 's'];

/**
 * Parse a range notation string into a Range object
 * Supports: QQ+, 22-66, AKs, AQo, AK, A5s-A2s, AKs:0.5
 */
export function parseRange(notation: string): Range {
    const hands: WeightedHand[] = [];
    const tokens = notation.split(',').map(t => t.trim()).filter(t => t.length > 0);

    for (const token of tokens) {
        try {
            const parsedHands = parseRangeToken(token);
            hands.push(...parsedHands);
        } catch (error) {
            throw new Error(`Invalid range notation: "${token}" - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    return { hands };
}

function parseRangeToken(token: string): WeightedHand[] {
    const hands: WeightedHand[] = [];

    // Check for weight suffix (e.g., "AKs:0.5")
    let weight = 1.0;
    let notation = token;

    if (token.includes(':')) {
        const parts = token.split(':');
        notation = parts[0];
        weight = parseFloat(parts[1]);
        if (isNaN(weight) || weight < 0 || weight > 1) {
            throw new Error(`Invalid weight: ${parts[1]}`);
        }
    }

    // Pair range: QQ+, 77-TT, JJ
    const pairRangeMatch = notation.match(/^([2-9TJQKA])([2-9TJQKA])\+$/);
    if (pairRangeMatch && pairRangeMatch[1] === pairRangeMatch[2]) {
        const minRank = pairRangeMatch[1] as Rank;
        hands.push(...generatePairRange(minRank, 'A', weight));
        return hands;
    }

    const pairDashMatch = notation.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/);
    if (pairDashMatch) {
        const rank1 = pairDashMatch[1] as Rank;
        const rank2 = pairDashMatch[2] as Rank;
        const minRank = RANK_VALUES[rank1] < RANK_VALUES[rank2] ? rank1 : rank2;
        const maxRank = RANK_VALUES[rank1] > RANK_VALUES[rank2] ? rank1 : rank2;
        hands.push(...generatePairRange(minRank, maxRank, weight));
        return hands;
    }

    // Single pair: QQ
    const singlePairMatch = notation.match(/^([2-9TJQKA])\1$/);
    if (singlePairMatch) {
        const rank = singlePairMatch[1] as Rank;
        hands.push(...generatePairs(rank, weight));
        return hands;
    }

    // Suited/offsuit range: AKs-ATs, A5s-A2s
    const suitedRangeMatch = notation.match(/^([2-9TJQKA])([2-9TJQKA])([so])-([2-9TJQKA])([2-9TJQKA])([so])$/);
    if (suitedRangeMatch) {
        const [, r1h, r1l, s1, r2h, r2l, s2] = suitedRangeMatch;
        if (s1 !== s2 || r1h !== r2h) {
            throw new Error('Range notation mismatch');
        }
        const highRank = r1h as Rank;
        const lowRank1 = r1l as Rank;
        const lowRank2 = r2l as Rank;
        const suited = s1 === 's';

        const minKicker = RANK_VALUES[lowRank1] < RANK_VALUES[lowRank2] ? lowRank1 : lowRank2;
        const maxKicker = RANK_VALUES[lowRank1] > RANK_VALUES[lowRank2] ? lowRank1 : lowRank2;

        for (const rank of RANKS) {
            if (RANK_VALUES[rank as Rank] >= RANK_VALUES[minKicker as Rank] &&
                RANK_VALUES[rank as Rank] <= RANK_VALUES[maxKicker as Rank]) {
                hands.push(...generateCombos(highRank as Rank, rank as Rank, suited, weight));
            }
        }
        return hands;
    }

    // Single combo: AKs, AQo, AK
    const singleComboMatch = notation.match(/^([2-9TJQKA])([2-9TJQKA])([so])?$/);
    if (singleComboMatch && singleComboMatch[1] !== singleComboMatch[2]) {
        const rank1 = singleComboMatch[1] as Rank;
        const rank2 = singleComboMatch[2] as Rank;
        const modifier = singleComboMatch[3];

        const highRank = RANK_VALUES[rank1] > RANK_VALUES[rank2] ? rank1 : rank2;
        const lowRank = RANK_VALUES[rank1] < RANK_VALUES[rank2] ? rank1 : rank2;

        if (modifier === 's') {
            hands.push(...generateCombos(highRank, lowRank, true, weight));
        } else if (modifier === 'o') {
            hands.push(...generateCombos(highRank, lowRank, false, weight));
        } else {
            // Both suited and offsuit
            hands.push(...generateCombos(highRank, lowRank, true, weight));
            hands.push(...generateCombos(highRank, lowRank, false, weight));
        }
        return hands;
    }

    // Broadway+ style: AK+, QJ+ (higher combos with same gap)
    const plusMatch = notation.match(/^([2-9TJQKA])([2-9TJQKA])([so])?\+$/);
    if (plusMatch && plusMatch[1] !== plusMatch[2]) {
        const rank1 = plusMatch[1] as Rank;
        const rank2 = plusMatch[2] as Rank;
        const modifier = plusMatch[3];

        const highRank = RANK_VALUES[rank1] > RANK_VALUES[rank2] ? rank1 : rank2;
        const lowRankStart = RANK_VALUES[rank1] < RANK_VALUES[rank2] ? rank1 : rank2;

        // Generate from lowRankStart up to one below highRank
        for (const rank of RANKS) {
            if (RANK_VALUES[rank as Rank] >= RANK_VALUES[lowRankStart as Rank] &&
                RANK_VALUES[rank as Rank] < RANK_VALUES[highRank as Rank]) {
                if (modifier === 's') {
                    hands.push(...generateCombos(highRank, rank as Rank, true, weight));
                } else if (modifier === 'o') {
                    hands.push(...generateCombos(highRank, rank as Rank, false, weight));
                } else {
                    hands.push(...generateCombos(highRank, rank as Rank, true, weight));
                    hands.push(...generateCombos(highRank, rank as Rank, false, weight));
                }
            }
        }
        return hands;
    }

    throw new Error(`Unrecognized notation: ${notation}`);
}

function generatePairRange(minRank: Rank, maxRank: Rank, weight: number): WeightedHand[] {
    const hands: WeightedHand[] = [];
    for (const rank of RANKS) {
        if (RANK_VALUES[rank] >= RANK_VALUES[minRank] && RANK_VALUES[rank] <= RANK_VALUES[maxRank]) {
            hands.push(...generatePairs(rank, weight));
        }
    }
    return hands;
}

function generatePairs(rank: Rank, weight: number): WeightedHand[] {
    const hands: WeightedHand[] = [];
    for (let i = 0; i < SUITS.length; i++) {
        for (let j = i + 1; j < SUITS.length; j++) {
            hands.push({
                cards: [{ rank, suit: SUITS[i] }, { rank, suit: SUITS[j] }],
                weight,
            });
        }
    }
    return hands;
}

function generateCombos(highRank: Rank, lowRank: Rank, suited: boolean, weight: number): WeightedHand[] {
    const hands: WeightedHand[] = [];

    if (suited) {
        for (const suit of SUITS) {
            hands.push({
                cards: [{ rank: highRank, suit }, { rank: lowRank, suit }],
                weight,
            });
        }
    } else {
        for (const suit1 of SUITS) {
            for (const suit2 of SUITS) {
                if (suit1 !== suit2) {
                    hands.push({
                        cards: [{ rank: highRank, suit: suit1 }, { rank: lowRank, suit: suit2 }],
                        weight,
                    });
                }
            }
        }
    }

    return hands;
}

/**
 * Get the number of combos in a range
 */
export function countCombos(range: Range): number {
    return range.hands.reduce((sum, h) => sum + h.weight, 0);
}

/**
 * Get a string representation of a range
 */
export function rangeToString(range: Range): string {
    return `${range.hands.length} combos (${countCombos(range).toFixed(1)} weighted)`;
}
