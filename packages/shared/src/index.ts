// Card representations
export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    rank: Rank;
    suit: Suit;
}

// Position definitions
export type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'HJ' | 'CO';

// Street definitions
export type Street = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER';

// Action types
export type ActionType = 'post' | 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

// Parsed action
export interface ParsedAction {
    street: Street;
    sequence: number;
    actor: string;
    actionType: ActionType;
    amount: number;
    potAfterAction: number;
    isAllIn: boolean;
}

// Player in hand
export interface ParsedPlayer {
    seatNumber: number;
    name: string;
    position: Position;
    startingStack: number;
    holeCards?: [Card, Card];
    finalResult: number; // + for won, - for lost
    isHero: boolean;
}

// Full parsed hand
export interface ParsedHand {
    siteHandId: string;
    timestamp: Date;
    stakes: string; // e.g., "$0.25/$0.50"
    currency: string;
    tableName: string;
    maxSeats: number;
    buttonSeat: number;
    smallBlind: number;
    bigBlind: number;
    ante: number;
    players: ParsedPlayer[];
    actions: ParsedAction[];
    board: Card[];
    potTotal: number;
    rake: number;
    winners: { name: string; amount: number }[];
}

// Stats for dashboard
export interface PlayerStats {
    playerName: string;
    handsPlayed: number;
    vpip: number; // Voluntarily Put in Pot %
    pfr: number; // Preflop Raise %
    threeBet: number; // 3bet %
    foldToThreeBet: number; // Fold to 3bet %
    cbet: number; // Continuation bet %
    foldToCbet: number; // Fold to c-bet %
    wtsd: number; // Went to Showdown %
    wssd: number; // Won at Showdown %
    wwsf: number; // Won When Saw Flop %
    netWon: number; // Net $ won
    bbPer100: number; // BB/100 hands
}

// Position stats
export interface PositionStats {
    position: Position;
    handsPlayed: number;
    vpip: number;
    pfr: number;
    netWon: number;
}

// Equity result
export interface EquityResult {
    winPercent: number;
    tiePercent: number;
    losePercent: number;
    samples: number;
}

// Trainer types
export interface TrainerQuestion {
    id: string;
    handId: string;
    heroName: string;
    heroPosition: Position;
    villainPosition: Position;
    effectiveStack: number;
    preflopLine: string;
    board: Card[];
    potSize: number;
    betSizeFaced: number;
    heroCards?: [Card, Card];
    street: Street;
}

export interface TrainerAnswer {
    questionId: string;
    selectedAction: 'fold' | 'call' | 'raise';
    raiseSize?: number;
}

export type TrainerGrade = 'green' | 'yellow' | 'red';

export interface TrainerFeedback {
    grade: TrainerGrade;
    explanation: string;
    potOdds: number;
    mdf: number;
    equityVsRange?: number;
    assumptions: string[];
}

// Board texture classification
export type BoardTexture = 'dry' | 'wet' | 'paired' | 'monotone' | 'connected';

export function cardToString(card: Card): string {
    return `${card.rank}${card.suit}`;
}

export function parseCardString(str: string): Card | null {
    if (str.length !== 2) return null;
    const rank = str[0].toUpperCase() as Rank;
    const suit = str[1].toLowerCase() as Suit;
    const validRanks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const validSuits: Suit[] = ['h', 'd', 'c', 's'];
    if (!validRanks.includes(rank) || !validSuits.includes(suit)) return null;
    return { rank, suit };
}

export const RANK_VALUES: Record<Rank, number> = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export const POSITIONS_6MAX: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
export const POSITIONS_9MAX: Position[] = ['UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
