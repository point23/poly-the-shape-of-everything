import { _decorator, Component } from 'cc';
import { $$, Const, get_gameplay_time } from '../Const';
const { ccclass, property } = _decorator;

export type button_state = {
    ended_down: boolean,
    counter: number,
    pressed_at: number,
}

export function ended_down(map: Map<number, button_state>, idx: number): boolean {
    return map.get(idx).ended_down;
}

export function pressed_long_enough(map: Map<number, button_state>, idx: number): boolean {
    if (ended_down(map, idx)) {
        const state = map.get(idx);
        const t = state.counter;
        const duration = get_gameplay_time() - state.pressed_at;
        if (duration >= t * Const.VALID_PRESSING_INTERVAL) {
            return true;
        }
    }
    return false;
}

export enum Game_Button {
    NULL,

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

export enum Dpad_Button {
    UP,
    DOWN,
    LEFT,
    RIGHT,
}

export enum Action_Button {
    X,
    Y,
    A,
    B,
}

export enum Keyboard_Command_Button {
    SHIFT,
    CTRL,
    ALT,
}

export enum Stick {
    // @incomplete There might be more states than this, so for now we give up that mapping stuff in Joystick class
    UP,
    DOWN,
    LEFT,
    RIGHT,
}

export class Game_Input {
    availble: boolean = false;
    moved: boolean = false;
    rotated: boolean = false;
    current_button: Game_Button = 0;

    pending_record: Game_Button[] = [];
    button_states: Map<number, button_state> = new Map();

    constructor() {
        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.SWITCH_HERO; i++) {
            this.button_states.set(i, {
                ended_down: false,
                counter: 0,
                pressed_at: 0,
            });
        }
    }

    reset() {
        this.availble = false;
        this.moved = false;
        this.rotated = false;
    }

    press(b: Game_Button) {
        this.button_states.set(b, {
            ended_down: true,
            counter: 0,
            pressed_at: get_gameplay_time(),
        })
    }

    increase_count(b: Game_Button) {
        const state = this.button_states.get(b);
        this.button_states.set(b, {
            ended_down: true,
            counter: state.counter + 1,
            pressed_at: state.pressed_at,
        })
    }

    release(b: Game_Button) {
        const state = this.button_states.get(b);
        this.button_states.set(b, {
            ended_down: false,
            counter: 0,
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