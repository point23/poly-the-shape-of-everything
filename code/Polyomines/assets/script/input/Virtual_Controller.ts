import { _decorator, } from 'cc';
import { Action_Button_Group } from './Action_Button_Group';
import { Game_Input, Game_Input_Handler } from './Game_Input_Handler';
import { Joystick } from './Joystick';
import { Dpad } from './Dpad';
const { ccclass, property } = _decorator;

@ccclass('Virtual_Controller')
export class Virtual_Controller extends Game_Input_Handler {
    @property(Joystick) joystick: Joystick = null;
    @property(Dpad) dpad: Dpad = null;
    @property(Action_Button_Group) action_buttons: Action_Button_Group = null;

    get name(): string {
        return "V Controller"
    }

    init(i: Game_Input) {
        this.input = i;
        this.node.active = true;

        this.dpad.init(this.input);
        this.joystick.init(this.input);
        this.action_buttons.init(this.input);
    }

    clear() {
        this.input = null;

        this.node.active = false;
        // this.joystick.clear();
        this.dpad.clear();
        this.action_buttons.clear();
    }
}