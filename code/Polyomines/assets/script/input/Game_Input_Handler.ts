import { _decorator, Component } from 'cc';
import { $$, clone_all_slots, Const } from '../Const';
import { Gameplay_Timer } from '../Gameplay_Timer';
const { ccclass } = _decorator;

export class Button_State {
    button: Game_Button;
    ended_down: boolean;    // Whether this button is currently ended down when current logic frame is processed
    counter: number;        // How many times this button state has been processed
    pressed_at: number;     // Gameplay time (round idx)
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
    pending_records: Button_State[] = [];
    button_states: Map<number, Button_State> = new Map();

    constructor() {
        for (let button = Game_Button.NULL; button <= Game_Button.SWITCH_HERO; button++) {
            const state = new Button_State();
            state.button = button;
            state.ended_down = false;
            state.counter = 0;
            state.pressed_at = 0;

            this.button_states.set(button, state);
        }
    }

    reset() {
        for (let key of this.button_states.keys()) {
            this.release(key);
        }
    }

    press(b: Game_Button) {
        if (!$$.IS_RUNNING) return;

        const state = this.button_states.get(b);

        state.ended_down = true;
        state.counter = 1;
        state.pressed_at = Gameplay_Timer.now();

        this.pending_records.push(state);
    }

    release(b: Game_Button) {
        const state = this.button_states.get(b);
        state.ended_down = false;
        state.counter = 0;
        state.pressed_at = -1;
    }

    pressed_long_enough(button: number): boolean {
        const state = this.button_states.get(button);

        if (state.ended_down) {
            const t = state.counter;
            const duration = Gameplay_Timer.calcu_delta_time(state.pressed_at, Gameplay_Timer.now());
            if (duration >= t * Const.VALID_PRESSING_INTERVAL) {
                return true;
            }
        }

        return false;
    }
}

@ccclass('Game_Input_Handler')
export class Game_Input_Handler extends Component {
    input: Game_Input = null;

    get active(): boolean {
        return this.node.active;
    }
    set active(active: boolean) {
        this.node.active = active;
    }

    get name(): string { return ""; }

    init(i: Game_Input) { }

    clear() { }

    update_input() {
        if (!this.active) return;
        const input = this.input;
        for (let button of input.button_states.keys()) {
            if (input.pressed_long_enough(button)) {
                const state = input.button_states.get(button)
                const clone = new Button_State();
                clone_all_slots(state, clone);

                state.counter += 1;
                input.pending_records.push(clone);
            }
        }
    }
}