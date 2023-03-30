import { _decorator, Component, Node, Button, Game } from 'cc';
import { $$, Const } from '../Const';
const { ccclass, property } = _decorator;

export type button_state = {
    ended_down: boolean,
    counter: number,
    pressed_at: number,
}

export function ended_down(map: Map<number, button_state>, idx: number): boolean {
    if (!map.has(idx)) {
        map.set(idx, {
            ended_down: false,
            counter: 0,
            pressed_at: new Date().getTime(),
        });
    }
    return map.get(idx).ended_down;
}

export function pressed_long_enough(map: Map<number, button_state>, idx: number): boolean {
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

export function handle_button_down(map: Map<number, button_state>, idx: number) {
    if ($$.IS_RUNNING == false) return;
    map.set(idx, {
        ended_down: true,
        counter: 0,
        pressed_at: new Date().getTime(),
    });
}

export function handle_button_up(map: Map<number, button_state>, idx: number) {
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
}

export class Game_Input {
    availble: boolean = false;
    moved: boolean = false;
    rotated: boolean = false;
    current_button: Game_Button = 0;
    button_states: Map<number, button_state> = new Map();

    constructor() {
        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.SWITCH_HERO; i++) {
            this.button_states.set(i, {
                ended_down: false,
                counter: 0,
                pressed_at: -1,
            });
        }
    }

    reset() {
        this.availble = false;
        this.moved = false;
        this.rotated = false;
        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.SWITCH_HERO; i++) {
            this.release(i);
        }
    }

    press(b: Game_Button) {
        this.current_button = b;
        const state = this.button_states.get(b);
        this.button_states.set(b, {
            ended_down: true,
            counter: state.counter + 1,
            pressed_at: new Date().getTime(),
        })
    }

    release(b: Game_Button) {
        const state = this.button_states.get(b);
        this.button_states.set(b, {
            ended_down: false,
            counter: state.counter,
            pressed_at: state.pressed_at,
        })
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