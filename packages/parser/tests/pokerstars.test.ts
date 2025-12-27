import { describe, it, expect } from 'vitest';
import { PokerStarsParser } from '../src/pokerstars';
import * as fs from 'fs';
import * as path from 'path';

const parser = new PokerStarsParser();

describe('PokerStarsParser', () => {
    describe('parseMultipleHands', () => {
        it('should parse multiple hands from sample file', () => {
            const fixturesPath = path.join(__dirname, '../../../fixtures/sample-hands.txt');
            const content = fs.readFileSync(fixturesPath, 'utf-8');
            const hands = parser.parseMultipleHands(content);

            expect(hands.length).toBe(5);
        });
    });

    describe('parseHand - basic info', () => {
        const sampleHand = `PokerStars Hand #123456789:  Hold'em No Limit ($0.25/$0.50 USD) - 2024/01/15 14:30:00 ET
Table 'Pegasus III' 6-max Seat #4 is the button
Seat 1: Player1 ($50.00 in chips)
Seat 2: Player2 ($48.75 in chips)
Seat 3: Hero ($52.50 in chips)
Seat 4: Player4 ($47.25 in chips)
Seat 5: Player5 ($51.00 in chips)
Seat 6: Player6 ($49.50 in chips)
Player5: posts small blind $0.25
Player6: posts big blind $0.50
*** HOLE CARDS ***
Dealt to Hero [Ah Kd]
Player1: folds
Player2: raises $1 to $1.50
Hero: raises $3.50 to $5
Player4: folds
Player5: folds
Player6: folds
Player2: calls $3.50
*** FLOP *** [Ks 7h 2c]
Player2: checks
Hero: bets $4.50
Player2: calls $4.50
*** TURN *** [Ks 7h 2c] [4d]
Player2: checks
Hero: bets $10
Player2: folds
Uncalled bet ($10) returned to Hero
Hero collected $19.50 from pot
*** SUMMARY ***
Total pot $20.25 | Rake $0.75
Board [Ks 7h 2c 4d]`;

        it('should parse hand ID correctly', () => {
            const hand = parser.parseHand(sampleHand);
            expect(hand?.siteHandId).toBe('123456789');
        });

        it('should parse stakes correctly', () => {
            const hand = parser.parseHand(sampleHand);
            expect(hand?.stakes).toBe('$0.25/$0.50 USD');
            expect(hand?.smallBlind).toBe(0.25);
            expect(hand?.bigBlind).toBe(0.50);
        });

        it('should parse table info correctly', () => {
            const hand = parser.parseHand(sampleHand);
            expect(hand?.tableName).toBe('Pegasus III');
            expect(hand?.maxSeats).toBe(6);
            expect(hand?.buttonSeat).toBe(4);
        });

        it('should parse 6 players', () => {
            const hand = parser.parseHand(sampleHand);
            expect(hand?.players.length).toBe(6);
        });

        it('should identify hero and parse hole cards', () => {
            const hand = parser.parseHand(sampleHand);
            const hero = hand?.players.find(p => p.isHero);
            expect(hero?.name).toBe('Hero');
            expect(hero?.holeCards).toHaveLength(2);
            expect(hero?.holeCards?.[0].rank).toBe('A');
            expect(hero?.holeCards?.[0].suit).toBe('h');
            expect(hero?.holeCards?.[1].rank).toBe('K');
            expect(hero?.holeCards?.[1].suit).toBe('d');
        });

        it('should assign positions correctly', () => {
            const hand = parser.parseHand(sampleHand);
            const positions = hand?.players.map(p => ({ name: p.name, pos: p.position }));

            // Button is seat 4 (Player4), so:
            // Player4 = BTN, Player5 = SB, Player6 = BB, Player1 = UTG, etc.
            expect(hand?.players.find(p => p.name === 'Player4')?.position).toBe('BTN');
            expect(hand?.players.find(p => p.name === 'Player5')?.position).toBe('SB');
            expect(hand?.players.find(p => p.name === 'Player6')?.position).toBe('BB');
        });
    });

    describe('parseHand - actions', () => {
        const sampleHand = `PokerStars Hand #123456789:  Hold'em No Limit ($0.25/$0.50 USD) - 2024/01/15 14:30:00 ET
Table 'Pegasus III' 6-max Seat #4 is the button
Seat 1: Player1 ($50.00 in chips)
Seat 2: Player2 ($48.75 in chips)
Seat 3: Hero ($52.50 in chips)
Player1: posts small blind $0.25
Player2: posts big blind $0.50
*** HOLE CARDS ***
Dealt to Hero [Ah Kd]
Hero: raises $1 to $1.50
Player1: folds
Player2: calls $1
*** FLOP *** [Ks 7h 2c]
Player2: checks
Hero: bets $2
Player2: calls $2
*** TURN *** [Ks 7h 2c] [4d]
Player2: checks
Hero: checks
*** RIVER *** [Ks 7h 2c 4d] [Jc]
Player2: checks
Hero: bets $5
Player2: folds
Hero collected $7 from pot
*** SUMMARY ***
Total pot $7 | Rake $0`;

        it('should parse actions by street', () => {
            const hand = parser.parseHand(sampleHand);

            const preflopActions = hand?.actions.filter(a => a.street === 'PREFLOP');
            const flopActions = hand?.actions.filter(a => a.street === 'FLOP');
            const turnActions = hand?.actions.filter(a => a.street === 'TURN');
            const riverActions = hand?.actions.filter(a => a.street === 'RIVER');

            // Preflop: 2 blinds + 3 actions
            expect(preflopActions?.some(a => a.actionType === 'post')).toBe(true);
            expect(preflopActions?.some(a => a.actionType === 'raise')).toBe(true);
            expect(preflopActions?.some(a => a.actionType === 'fold')).toBe(true);
            expect(preflopActions?.some(a => a.actionType === 'call')).toBe(true);

            // Flop: check, bet, call
            expect(flopActions?.length).toBeGreaterThan(0);
            expect(flopActions?.some(a => a.actionType === 'check')).toBe(true);
            expect(flopActions?.some(a => a.actionType === 'bet')).toBe(true);

            // Turn: check, check
            expect(turnActions?.filter(a => a.actionType === 'check').length).toBe(2);

            // River: check, bet, fold
            expect(riverActions?.length).toBe(3);
        });

        it('should track pot progression', () => {
            const hand = parser.parseHand(sampleHand);

            // Last action should have final pot
            const lastAction = hand?.actions[hand.actions.length - 1];
            expect(lastAction?.potAfterAction).toBeGreaterThan(0);
        });

        it('should parse board cards', () => {
            const hand = parser.parseHand(sampleHand);
            expect(hand?.board.length).toBe(5);
            expect(hand?.board[0]).toEqual({ rank: 'K', suit: 's' });
            expect(hand?.board[1]).toEqual({ rank: '7', suit: 'h' });
            expect(hand?.board[2]).toEqual({ rank: '2', suit: 'c' });
            expect(hand?.board[3]).toEqual({ rank: '4', suit: 'd' });
            expect(hand?.board[4]).toEqual({ rank: 'J', suit: 'c' });
        });
    });

    describe('parseHand - all-in scenario', () => {
        const allInHand = `PokerStars Hand #999:  Hold'em No Limit ($0.25/$0.50 USD) - 2024/01/15 14:40:00 ET
Table 'Test' 6-max Seat #1 is the button
Seat 1: Player1 ($50.00 in chips)
Seat 2: Player2 ($25.00 in chips)
Player1: posts small blind $0.25
Player2: posts big blind $0.50
*** HOLE CARDS ***
Dealt to Player1 [As Ad]
Player1: raises $1.50 to $2
Player2: raises $23 to $25 and is all-in
Player1: calls $23
*** FLOP *** [Kc 7h 2d]
*** TURN *** [Kc 7h 2d] [3s]
*** RIVER *** [Kc 7h 2d 3s] [9c]
*** SHOWDOWN ***
Player2: shows [Kh Kd] (three of a kind, Kings)
Player1: shows [As Ad] (a pair of Aces)
Player2 collected $50 from pot
*** SUMMARY ***
Total pot $50 | Rake $0`;

        it('should detect all-in actions', () => {
            const hand = parser.parseHand(allInHand);
            const allInAction = hand?.actions.find(a => a.isAllIn);

            expect(allInAction).toBeDefined();
            expect(allInAction?.actor).toBe('Player2');
        });

        it('should parse showdown hole cards', () => {
            const hand = parser.parseHand(allInHand);
            const player2 = hand?.players.find(p => p.name === 'Player2');

            expect(player2?.holeCards).toBeDefined();
            expect(player2?.holeCards?.[0]).toEqual({ rank: 'K', suit: 'h' });
            expect(player2?.holeCards?.[1]).toEqual({ rank: 'K', suit: 'd' });
        });
    });
});
