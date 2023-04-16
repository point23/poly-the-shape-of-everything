import { _decorator, Component, Game, Vec2 } from 'cc';
import { $$, Const } from './Const';
import { Visual_Interpolation } from './interpolation';

export function time_to_string(t: gameplay_time) {
    return `${t.round}-${t.tick}`
}

export type gameplay_time = {
    round: number,
    tick: number,
};

export class Gameplay_Timer {
    static tick_idx = 0;
    static round_idx = 0;
    static running_idx = 0;

    static ROUND_BOUNDS: number = 1 << 16;

    static reset() {
        Gameplay_Timer.set_gameplay_time({
            round: 0,
            tick: 0,
        });

        Visual_Interpolation.running_interpolations.clear(); // @fixme Move it to somewhere else, maybe Entity_Manager?
    }

    static now(): number {
        return Gameplay_Timer.running_idx;
    }

    static compare(a: gameplay_time, b: gameplay_time): number {
        if (a.round > b.round) return 1;
        if (a.round < b.round) return -1;
        if (a.tick > b.tick) return 1;
        if (a.tick < b.tick) return -1;

        return 0;
    }

    static set_gameplay_time(t: gameplay_time) {
        Gameplay_Timer.tick_idx = t.tick;
        Gameplay_Timer.round_idx = t.round;
    }

    static get_gameplay_time(delta: number = 0): gameplay_time {
        return {
            round: Gameplay_Timer.round_idx + delta,
            tick: Gameplay_Timer.tick_idx,
        };
    }

    static calcu_delta_rounds(start: gameplay_time, end: gameplay_time = this.get_gameplay_time()): number {
        if (start.round > end.round) { // @incomplete We need to compare them.
            return (Gameplay_Timer.ROUND_BOUNDS - start.round) + end.round;
        }

        return end.round - start.round;
    }

    static calcu_delta_ticks(start: gameplay_time, end: gameplay_time = this.get_gameplay_time()): number {
        const ticks_per_round = Const.TICKS_PER_ROUND[$$.DURATION_IDX];

        if (start.round > end.round) { // @incomplete We need to compare them.
            return 0;
        }

        return (end.round - start.round - 1) * ticks_per_round + (ticks_per_round - start.tick) + end.tick;
    }

    static last_ms: number = -1;
    static dts: number[] = [];

    static run(caller: Component, loop_callback: (() => void), tick_callbacks: (() => void)[] = []) {
        caller.schedule(() => {
            /* // @note Debug stuff
             if (Gameplay_Timer.last_ms == -1) {
                 this.last_ms = new Date().getTime();
             } else {
                 const current_ms = new Date().getTime();
                 const dt = current_ms - Gameplay_Timer.last_ms;
                 Gameplay_Timer.dts.push(dt);
                 if (Gameplay_Timer.dts.length == (1 << 4)) {
                     let sum = 0;
                     Gameplay_Timer.dts.forEach((it) => sum += it);
                     const avg = sum >> 4;
                     console.log(`=== avg dt: ${avg} ===`);
                     Gameplay_Timer.dts = [];
                 }
                 this.last_ms = current_ms;
             } */

            const ticks_per_round = Const.TICKS_PER_ROUND[$$.DURATION_IDX];

            if ((Gameplay_Timer.tick_idx == 0)) {
                if ($$.IS_RUNNING) {
                    Gameplay_Timer.running_idx = (Gameplay_Timer.running_idx + 1) % Gameplay_Timer.ROUND_BOUNDS;
                    if (!$$.DOING_UNDO)
                        Gameplay_Timer.round_idx = (Gameplay_Timer.round_idx + 1) % Gameplay_Timer.ROUND_BOUNDS;

                    loop_callback();
                }
            }

            if ($$.IS_RUNNING) {
                tick_callbacks.forEach((it) => { it(); })
                for (let i of Visual_Interpolation.running_interpolations.values()) {
                    i.process();
                }
            }

            Gameplay_Timer.tick_idx = (Gameplay_Timer.tick_idx + 1) % ticks_per_round;
        }, Const.DEBUG_TICK_INTERVAL);
    }

    static stop(caller: Component) {
        caller.unscheduleAllCallbacks();
        Gameplay_Timer.reset();
    }
}