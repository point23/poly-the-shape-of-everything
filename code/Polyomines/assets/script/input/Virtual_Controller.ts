import { _decorator, Button } from 'cc';
import { Action_Button, Action_Button_Group, Action_Button_Input } from './Action_Button_Group';
import { Dpad, Dpad_Input } from './Dpad';
import { Game_Button, Game_Input, Game_Input_Handler } from './Game_Input_Handler';
import { Joystick, Joystick_Input } from './Joystick';
const { ccclass, property } = _decorator;

@ccclass('Virtual_Controller')
export class Virtual_Controller extends Game_Input_Handler {
    @property(Joystick) joystick: Joystick = null;
    @property(Dpad) dpad: Dpad = null;
    @property(Action_Button_Group) action_buttons: Action_Button_Group = null;
    @property(Button) btn_back: Button = null;
    @property(Button) btn_start: Button = null;

    #input: Game_Input = new Game_Input();
    get input(): Game_Input {
        return this.#input;
    }
    get name(): string {
        return "V Controller"
    }

    init() {
        this.node.active = true;
        this.joystick.init();
        this.dpad.init();
        this.action_buttons.init();
    }

    clear() {
        this.node.active = false;
        this.joystick.clear();
        this.dpad.clear();
        this.action_buttons.clear();
    }

    update_input() {
        if (this.#input.availble) return;

        this.#input.reset();
        this.#handle_joystick_input();
        this.#handle_dpad_input();
        this.#handle_action_buttons_input();
    }

    #handle_joystick_input() {
        const state: Joystick_Input = this.joystick.state;
        if (!state.available) return;

        this.#input.availble = true;
        this.#input.rotated = true;

        const deg = state.degree;
        if (deg >= 45 && deg <= 135) { // BACKWARD
            this.#input.button_states[Game_Button.FACE_BACKWARD] = 1;
        } else if (deg <= -45 && deg >= -135) { // FORWARD
            this.#input.button_states[Game_Button.FACE_FORWARD] = 1;
        } else if (deg >= 135 || deg <= -135) { // LEFT
            this.#input.button_states[Game_Button.FACE_LEFT] = 1;
        } else if (deg <= 45 && deg >= -45) { // RIGHT
            this.#input.button_states[Game_Button.FACE_RIGHT] = 1;
        }
    }

    #handle_dpad_input() {
        const state: Dpad_Input = this.dpad.state;
        if (!state.available) return;

        this.#input.availble = true;
        this.#input.button_states[state.btn_idx] = 1;
        this.#input.moved = true;
    }

    #handle_action_buttons_input() {
        const action_button_input: Action_Button_Input = this.action_buttons.state;
        if (!action_button_input.available) return;

        this.#input.availble = true;
        if ((action_button_input.btn_idx == Action_Button.Y)) {
            this.#input.button_states[Game_Button.RESET] = 1;
        }

        if ((action_button_input.btn_idx == Action_Button.B)) {
            this.#input.button_states[Game_Button.UNDO] = 1;
        }

        if ((action_button_input.btn_idx == Action_Button.X)) {
            this.#input.button_states[Game_Button.SWITCH_HERO] = 1;
        }
    }
}


