import { Card, Suit, Rank, EquityResult, RANK_VALUES } from '@poker-lab/shared';
import { Range, WeightedHand } from './range';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

// Hand rankings
const HAND_RANK = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
} as const;

interface HandStrength {
    rank: number;
    kickers: number[];
}

/**
 * Create a full 52-card deck
 */
function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const rank of RANKS) {
        for (const suit of SUITS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

/**
 * Check if two cards are the same
 */
function cardsEqual(a: Card, b: Card): boolean {
    return a.rank === b.rank && a.suit === b.suit;
}

/**
 * Get a card's unique index (0-51)
 */
function cardIndex(card: Card): number {
    const rankIdx = RANKS.indexOf(card.rank);
    const suitIdx = SUITS.indexOf(card.suit);
    return rankIdx * 4 + suitIdx;
}

/**
 * Shuffle an array in place (Fisher-Yates)
 */
function shuffle<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Evaluate a 5-7 card hand and return its strength
 */
function evaluateHand(cards: Card[]): HandStrength {
    if (cards.length < 5) {
        throw new Error('Need at least 5 cards to evaluate');
    }

    // Get all 5-card combinations if more than 5 cards
    const combinations = cards.length === 5
        ? [cards]
        : getCombinations(cards, 5);

    let bestHand: HandStrength = { rank: -1, kickers: [] };

    for (const combo of combinations) {
        const strength = evaluate5Cards(combo);
        if (compareHands(strength, bestHand) > 0) {
            bestHand = strength;
        }
    }

    return bestHand;
}

/**
 * Get all k-combinations of an array
 */
function getCombinations<T>(arr: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (arr.length === 0) return [];

    const [first, ...rest] = arr;
    const withFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo]);
    const withoutFirst = getCombinations(rest, k);

    return [...withFirst, ...withoutFirst];
}

/**
 * Evaluate exactly 5 cards
 */
function evaluate5Cards(cards: Card[]): HandStrength {
    const rankCounts = new Map<Rank, number>();
    const suitCounts = new Map<Suit, number>();

    const values: number[] = [];

    for (const card of cards) {
        rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
        suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
        values.push(RANK_VALUES[card.rank]);
    }

    values.sort((a, b) => b - a);

    const isFlush = [...suitCounts.values()].some(count => count === 5);
    const isStraight = checkStraight(values);

    // Check for wheel (A-2-3-4-5)
    const isWheel = values[0] === 14 && values[1] === 5 &&
        values[2] === 4 && values[3] === 3 && values[4] === 2;

    const counts = [...rankCounts.entries()].sort((a, b) => {
        // Sort by count first, then by rank
        if (b[1] !== a[1]) return b[1] - a[1];
        return RANK_VALUES[b[0]] - RANK_VALUES[a[0]];
    });

    // Straight flush
    if (isFlush && (isStraight || isWheel)) {
        if (isWheel) {
            return { rank: HAND_RANK.STRAIGHT_FLUSH, kickers: [5] };
        }
        return { rank: HAND_RANK.STRAIGHT_FLUSH, kickers: [values[0]] };
    }

    // Four of a kind
    if (counts[0][1] === 4) {
        return {
            rank: HAND_RANK.FOUR_OF_A_KIND,
            kickers: [RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]]]
        };
    }

    // Full house
    if (counts[0][1] === 3 && counts[1][1] === 2) {
        return {
            rank: HAND_RANK.FULL_HOUSE,
            kickers: [RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]]]
        };
    }

    // Flush
    if (isFlush) {
        return { rank: HAND_RANK.FLUSH, kickers: values };
    }

    // Straight
    if (isStraight) {
        return { rank: HAND_RANK.STRAIGHT, kickers: [values[0]] };
    }
    if (isWheel) {
        return { rank: HAND_RANK.STRAIGHT, kickers: [5] };
    }

    // Three of a kind
    if (counts[0][1] === 3) {
        const otherKickers = counts.slice(1).map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
        return {
            rank: HAND_RANK.THREE_OF_A_KIND,
            kickers: [RANK_VALUES[counts[0][0]], ...otherKickers]
        };
    }

    // Two pair
    if (counts[0][1] === 2 && counts[1][1] === 2) {
        const pairRanks = [RANK_VALUES[counts[0][0]], RANK_VALUES[counts[1][0]]].sort((a, b) => b - a);
        return {
            rank: HAND_RANK.TWO_PAIR,
            kickers: [...pairRanks, RANK_VALUES[counts[2][0]]]
        };
    }

    // Pair
    if (counts[0][1] === 2) {
        const otherKickers = counts.slice(1).map(c => RANK_VALUES[c[0]]).sort((a, b) => b - a);
        return {
            rank: HAND_RANK.PAIR,
            kickers: [RANK_VALUES[counts[0][0]], ...otherKickers]
        };
    }

    // High card
    return { rank: HAND_RANK.HIGH_CARD, kickers: values };
}

function checkStraight(sortedValues: number[]): boolean {
    for (let i = 0; i < sortedValues.length - 1; i++) {
        if (sortedValues[i] - sortedValues[i + 1] !== 1) {
            return false;
        }
    }
    return true;
}

/**
 * Compare two hand strengths
 * Returns positive if a > b, negative if a < b, 0 if equal
 */
function compareHands(a: HandStrength, b: HandStrength): number {
    if (a.rank !== b.rank) {
        return a.rank - b.rank;
    }

    for (let i = 0; i < Math.min(a.kickers.length, b.kickers.length); i++) {
        if (a.kickers[i] !== b.kickers[i]) {
            return a.kickers[i] - b.kickers[i];
        }
    }

    return 0;
}

// Simple cache for equity results
const equityCache = new Map<string, EquityResult>();

function getCacheKey(heroCards: [Card, Card], board: Card[], range: Range, samples: number): string {
    const heroStr = heroCards.map(c => `${c.rank}${c.suit}`).join('');
    const boardStr = board.map(c => `${c.rank}${c.suit}`).join('');
    const rangeStr = range.hands.length.toString();
    return `${heroStr}:${boardStr}:${rangeStr}:${samples}`;
}

/**
 * Calculate equity of hero's hand against a villain range
 */
export function calculateEquity(
    heroCards: [Card, Card],
    board: Card[],
    villainRange: Range,
    samples: number = 10000
): EquityResult {
    const cacheKey = getCacheKey(heroCards, board, villainRange, samples);
    const cached = equityCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Build set of dead cards
    const deadCards = new Set<number>();
    for (const card of [...heroCards, ...board]) {
        deadCards.add(cardIndex(card));
    }

    // Filter villain range to remove hands with dead cards
    const validVillainHands = villainRange.hands.filter(hand => {
        return !deadCards.has(cardIndex(hand.cards[0])) &&
            !deadCards.has(cardIndex(hand.cards[1]));
    });

    if (validVillainHands.length === 0) {
        return { winPercent: 0, tiePercent: 0, losePercent: 0, samples: 0 };
    }

    let wins = 0;
    let ties = 0;
    let losses = 0;
    let totalWeight = 0;

    const cardsToRun = 5 - board.length;

    for (let i = 0; i < samples; i++) {
        // Pick a random villain hand weighted by frequency
        const villainHand = pickWeightedHand(validVillainHands);

        // Skip if villain cards conflict with dead cards
        if (deadCards.has(cardIndex(villainHand.cards[0])) ||
            deadCards.has(cardIndex(villainHand.cards[1]))) {
            continue;
        }

        // Build remaining deck
        const remainingDeck = createDeck().filter(c => {
            const idx = cardIndex(c);
            return !deadCards.has(idx) &&
                !cardsEqual(c, villainHand.cards[0]) &&
                !cardsEqual(c, villainHand.cards[1]);
        });

        // Run out the board
        shuffle(remainingDeck);
        const runout = [...board, ...remainingDeck.slice(0, cardsToRun)];

        // Evaluate both hands
        const heroStrength = evaluateHand([...heroCards, ...runout]);
        const villainStrength = evaluateHand([...villainHand.cards, ...runout]);

        const comparison = compareHands(heroStrength, villainStrength);
        const weight = villainHand.weight;
        totalWeight += weight;

        if (comparison > 0) {
            wins += weight;
        } else if (comparison < 0) {
            losses += weight;
        } else {
            ties += weight;
        }
    }

    if (totalWeight === 0) {
        return { winPercent: 0, tiePercent: 0, losePercent: 0, samples: 0 };
    }

    const result: EquityResult = {
        winPercent: (wins / totalWeight) * 100,
        tiePercent: (ties / totalWeight) * 100,
        losePercent: (losses / totalWeight) * 100,
        samples,
    };

    // Cache the result
    equityCache.set(cacheKey, result);

    return result;
}

function pickWeightedHand(hands: WeightedHand[]): WeightedHand {
    // For simplicity, use uniform random for now
    // A proper implementation would weight by frequency
    const totalWeight = hands.reduce((sum, h) => sum + h.weight, 0);
    let random = Math.random() * totalWeight;

    for (const hand of hands) {
        random -= hand.weight;
        if (random <= 0) {
            return hand;
        }
    }

    return hands[hands.length - 1];
}

/**
 * Clear the equity cache
 */
export function clearEquityCache(): void {
    equityCache.clear();
}
