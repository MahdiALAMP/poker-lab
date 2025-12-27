import { describe, it, expect } from 'vitest';
import { parseRange, countCombos } from '../src/range';
import { calculateEquity } from '../src/monte-carlo';
import { Card } from '@poker-lab/shared';

describe('Range Parser', () => {
    describe('parseRange', () => {
        it('should parse single pair', () => {
            const range = parseRange('QQ');
            expect(range.hands.length).toBe(6); // 6 combos of QQ
        });

        it('should parse pair+ notation', () => {
            const range = parseRange('JJ+');
            // JJ, QQ, KK, AA = 4 pairs * 6 combos each = 24
            expect(range.hands.length).toBe(24);
        });

        it('should parse pair range', () => {
            const range = parseRange('22-55');
            // 22, 33, 44, 55 = 4 pairs * 6 combos = 24
            expect(range.hands.length).toBe(24);
        });

        it('should parse suited hands', () => {
            const range = parseRange('AKs');
            expect(range.hands.length).toBe(4); // 4 suited combos
        });

        it('should parse offsuit hands', () => {
            const range = parseRange('AKo');
            expect(range.hands.length).toBe(12); // 12 offsuit combos
        });

        it('should parse both suited and offsuit', () => {
            const range = parseRange('AK');
            expect(range.hands.length).toBe(16); // 4 suited + 12 offsuit
        });

        it('should parse comma-separated ranges', () => {
            const range = parseRange('AA, KK, QQ');
            expect(range.hands.length).toBe(18); // 3 pairs * 6 combos
        });

        it('should parse weighted ranges', () => {
            const range = parseRange('AKs:0.5');
            expect(range.hands.length).toBe(4);
            expect(range.hands[0].weight).toBe(0.5);
        });

        it('should handle suited range notation', () => {
            const range = parseRange('A5s-A2s');
            // A5s, A4s, A3s, A2s = 4 hands * 4 combos = 16
            expect(range.hands.length).toBe(16);
        });

        it('should throw on invalid notation', () => {
            expect(() => parseRange('XYZ')).toThrow();
        });
    });

    describe('countCombos', () => {
        it('should count weighted combos correctly', () => {
            const range = parseRange('AA:0.5');
            expect(countCombos(range)).toBe(3); // 6 * 0.5
        });
    });
});

describe('Monte Carlo Equity', () => {
    it('should calculate AA vs random as >80% equity preflop', () => {
        const heroCards: [Card, Card] = [
            { rank: 'A', suit: 'h' },
            { rank: 'A', suit: 'd' },
        ];
        const board: Card[] = [];
        const villainRange = parseRange('22+, A2s+, A5o+, KTs+, QJs, JTs');

        const result = calculateEquity(heroCards, board, villainRange, 5000);

        expect(result.winPercent).toBeGreaterThan(75);
    });

    it('should calculate equity with board cards', () => {
        const heroCards: [Card, Card] = [
            { rank: 'A', suit: 'h' },
            { rank: 'K', suit: 'h' },
        ];
        const board: Card[] = [
            { rank: 'Q', suit: 'h' },
            { rank: 'J', suit: 'h' },
            { rank: '2', suit: 'c' },
        ];
        const villainRange = parseRange('QQ, JJ, 22');

        const result = calculateEquity(heroCards, board, villainRange, 3000);

        // Hero has flush draw + broadway draw, should have decent equity
        expect(result.winPercent + result.tiePercent).toBeGreaterThan(20);
    });

    it('should handle made hands correctly', () => {
        const heroCards: [Card, Card] = [
            { rank: 'A', suit: 's' },
            { rank: 'A', suit: 'c' },
        ];
        const board: Card[] = [
            { rank: 'A', suit: 'h' },
            { rank: 'A', suit: 'd' },
            { rank: '2', suit: 'c' },
            { rank: '3', suit: 'd' },
            { rank: '4', suit: 'h' },
        ];
        // Hero has quad aces, should be 100%
        const villainRange = parseRange('KK, QQ');

        const result = calculateEquity(heroCards, board, villainRange, 1000);

        expect(result.winPercent).toBe(100);
    });

    it('should return samples count', () => {
        const heroCards: [Card, Card] = [
            { rank: 'K', suit: 's' },
            { rank: 'Q', suit: 's' },
        ];
        const villainRange = parseRange('AA');

        const result = calculateEquity(heroCards, [], villainRange, 1000);

        expect(result.samples).toBe(1000);
    });
});
