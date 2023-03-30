import { _decorator, } from 'cc';
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

    #input: Game_Input = new Game_Input();
    get input(): Game_Input {
        return this.#input;
    }

    get name(): string {
        return "V Controller"
    }

    init() {
        this.#input = new Game_Input();
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
        const input = this.#input;
        if (!state.available) return;

        input.availble = true;
        input.rotated = true;

        const deg = state.degree;
        if (deg >= 45 && deg <= 135) { // BACKWARD
            input.press(Game_Button.FACE_BACKWARD);
        } else if (deg <= -45 && deg >= -135) { // FORWARD
            input.press(Game_Button.FACE_FORWARD);
        } else if (deg >= 135 || deg <= -135) { // LEFT
            input.press(Game_Button.FACE_LEFT);
        } else if (deg <= 45 && deg >= -45) { // RIGHT
            input.press(Game_Button.FACE_RIGHT);
        }
    }

    #handle_dpad_input() {
        const state: Dpad_Input = this.dpad.state;
        const input = this.#input;
        if (!state.available) return;

        input.availble = true;
        input.press(state.btn_idx);
        input.moved = true;
    }

    #handle_action_buttons_input() {
        const action_button_input: Action_Button_Input = this.action_buttons.state;
        const input = this.#input;
        if (!action_button_input.available) return;

        this.#input.availble = true;
        if ((action_button_input.btn_idx == Action_Button.Y)) {
            input.press(Game_Button.RESET);
        }

        if ((action_button_input.btn_idx == Action_Button.B)) {
            input.press(Game_Button.UNDO);
        }

        if ((action_button_input.btn_idx == Action_Button.X)) {
            input.press(Game_Button.SWITCH_HERO);
        }
    }
}


