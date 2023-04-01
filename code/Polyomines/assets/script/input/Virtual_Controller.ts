import { _decorator, } from 'cc';
import { Action_Button_Group } from './Action_Button_Group';
import { Game_Button, Game_Input, Game_Input_Handler, pressed_long_enough } from './Game_Input_Handler';
import { Joystick } from './Joystick';
import { Dpad } from './Dpad';
const { ccclass, property } = _decorator;

@ccclass('Virtual_Controller')
export class Virtual_Controller extends Game_Input_Handler {
    @property(Joystick) joystick: Joystick = null;
    @property(Dpad) dpad: Dpad = null;
    @property(Action_Button_Group) action_buttons: Action_Button_Group = null;

    #input: Game_Input = null;
    get input(): Game_Input {
        return this.#input;
    }

    get name(): string {
        return "V Controller"
    }

    init() {
        this.#input = new Game_Input();
        this.node.active = true;

        this.dpad.init(this.#input);
        this.joystick.init(this.#input);
        this.action_buttons.init(this.#input);
    }

    clear() {
        this.#input = null;

        this.node.active = false;
        this.joystick.clear();
        this.dpad.clear();
        this.action_buttons.clear();
    }

    update_input() {
        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.SWITCH_HERO; i++) {
            if (pressed_long_enough(this.#input.button_states, i)) {
                this.input.availble = true;
                this.input.pending_record.push(i);
                this.input.increase_count(i);
            }
        }
    }
}