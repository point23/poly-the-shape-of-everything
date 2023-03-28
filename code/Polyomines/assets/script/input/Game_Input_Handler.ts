import { _decorator, Component, Node } from 'cc';
import { $$, Const } from '../Const';
const { ccclass, property } = _decorator;

export type Button_State = {
    ended_down: boolean,
    counter: number,
    pressed_at: number,
}

export function ended_down(map: Map<number, Button_State>, idx: number): boolean {
    if (!map.has(idx)) {
        map.set(idx, {
            ended_down: false,
            counter: 0,
            pressed_at: new Date().getTime(),
        });
    }
    return map.get(idx).ended_down;
}

export function pressed_long_enough(map: Map<number, Button_State>, idx: number): boolean {
    if (ended_down(map, idx)) {
        const state = map.get(idx);
        let duration = new Date().getTime() - state.pressed_at;
        if (duration >= state.counter * Const.VALID_PRESSING_INTERVAL) {
            state.counter += 1;
            return true;
        }
    }
    return false;
}

export function handle_button_down(map: Map<number, Button_State>, idx: number) {
    if ($$.IS_RUNNING == false) return;
    map.set(idx, {
        ended_down: true,
        counter: 0,
        pressed_at: new Date().getTime(),
    });
}

export function handle_button_up(map: Map<number, Button_State>, idx: number) {
    if ($$.IS_RUNNING == false) return;
    map.set(idx, {
        ended_down: false,
        counter: 0,
        pressed_at: new Date().getTime(),
    });
}

export enum Game_Button {
    // @fixme There're hard coded stuff, for now don not change its order!
    MOVE_LEFT,
    MOVE_RIGHT,
    MOVE_FORWARD,
    MOVE_BACKWARD,

    FACE_LEFT,
    FACE_RIGHT,
    FACE_FORWARD,
    FACE_BACKWARD,

    UNDO,
    RESET,

    SWITCH_HERO,

    HINTS,
}

export class Game_Input {
    availble: boolean = false;
    moved: boolean = false;
    rotated: boolean = false;
    button_states: Uint8Array = new Uint8Array(12); // @temprory

    reset() {
        this.availble = false;
        this.moved = false;
        this.rotated = false;

        this.button_states.forEach((it, it_idx) => {
            this.button_states[it_idx] = 0;
        });
    }
}

@ccclass('Game_Input_Handler')
export class Game_Input_Handler extends Component {
    init() { }
    clear() { }
    update_input() { }
    get input(): Game_Input { return null; }
    get name(): string { return ""; }
}