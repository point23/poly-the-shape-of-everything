import { _decorator, Component } from 'cc';
import { $$, Const } from './Const';

export class Gameplay_Timer {
    static tick = 0;
    static round_idx = 0;
    static running_idx = 0;

    static ROUND_BOUNDS: number = 1 << 8;
    static TICK_BOUNDS: number = 1 << 16;

    static reset() {
        Gameplay_Timer.set_gameplay_time(0);
    }

    static now() {
        return Gameplay_Timer.running_idx;
    }

    static set_gameplay_time(t: number) {
        Gameplay_Timer.round_idx = t;
    }

    static get_gameplay_time(): number {
        return Gameplay_Timer.round_idx;
    }

    static calcu_delta_time(start: number, end: number) {
        if (start > end) {
            return (Gameplay_Timer.ROUND_BOUNDS - start) + end;
        }

        return end - start;
    }

    static run(caller: Component, loop: () => void) {
        caller.schedule(() => {
            const ticks_per_round = Const.Ticks_Per_Loop[$$.DURATION_IDX];
            if ((Gameplay_Timer.tick % ticks_per_round) == 0) {
                if ($$.IS_RUNNING) {
                    loop();

                    Gameplay_Timer.running_idx = (Gameplay_Timer.running_idx + 1) % Gameplay_Timer.ROUND_BOUNDS;
                    if (!$$.DOING_UNDO)
                        Gameplay_Timer.round_idx = (Gameplay_Timer.round_idx + 1) % Gameplay_Timer.ROUND_BOUNDS;
                }
            }

            Gameplay_Timer.tick = (Gameplay_Timer.tick + 1) % Gameplay_Timer.TICK_BOUNDS;
        }, Const.Tick_Interval);
    }

    static stop(caller: Component) {
        caller.unscheduleAllCallbacks();
    }
}