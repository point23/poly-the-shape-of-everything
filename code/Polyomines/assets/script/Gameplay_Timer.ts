import { _decorator, Component, Game, Vec2 } from 'cc';
import { $$, Const } from './Const';
import { Visual_Interpolation } from './interpolation';

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

        Visual_Interpolation.running_interpolations = []; // @fixme Move it to somewhere else.
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

    static get_gameplay_time(): gameplay_time {
        return {
            round: Gameplay_Timer.round_idx,
            tick: Gameplay_Timer.tick_idx,
        };
    }

    static calcu_delta_rounds(start: gameplay_time, end: gameplay_time = this.get_gameplay_time()): number {
        if (start.round > end.round) {
            return (Gameplay_Timer.ROUND_BOUNDS - start.round) + end.round;
        }
        return end.round - start.round;
    }

    static calcu_delta_ticks(start: gameplay_time, end: gameplay_time = this.get_gameplay_time()): number {
        const ticks_per_round = Const.Ticks_Per_Loop[$$.DURATION_IDX];

        if (start.round > end.round) {
            return 0; // @incomplete We need to compare them.
        }

        return (end.round - start.round - 1) * ticks_per_round + (ticks_per_round - start.tick) + end.tick;
    }

    static run(caller: Component, loop_callback: (() => void), tick_callbacks: (() => void)[] = []) {
        caller.schedule(() => {
            const ticks_per_round = Const.Ticks_Per_Loop[$$.DURATION_IDX];

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
                Visual_Interpolation.running_interpolations.forEach((it) => it.process());
            }

            Gameplay_Timer.tick_idx = (Gameplay_Timer.tick_idx + 1) % ticks_per_round;
        }, Const.Tick_Interval);
    }

    static stop(caller: Component) {
        caller.unscheduleAllCallbacks();
    }
}