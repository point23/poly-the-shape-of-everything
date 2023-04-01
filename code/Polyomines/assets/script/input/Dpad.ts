import { _decorator, Component, Node, Vec3 } from 'cc';
import { Dpad_Button, Game_Input } from './Game_Input_Handler';
import { Input_Manager } from './Input_Manager';
const { ccclass, property } = _decorator;

@ccclass('Dpad')
export class Dpad extends Component {
    static PRESSED_SCALE = new Vec3(0.5, 0.5, 1);

    @property(Node) btn_left: Node = null;
    @property(Node) btn_right: Node = null;
    @property(Node) btn_up: Node = null;
    @property(Node) btn_down: Node = null;

    input: Game_Input = null;

    init(i: Game_Input) {
        this.input = i;

        this.btn_left.on(Node.EventType.TOUCH_START, this.#press_btn_left, this);
        this.btn_right.on(Node.EventType.TOUCH_START, this.#press_btn_right, this);
        this.btn_up.on(Node.EventType.TOUCH_START, this.#press_btn_up, this);
        this.btn_down.on(Node.EventType.TOUCH_START, this.#press_btn_down, this);

        this.btn_left.on(Node.EventType.TOUCH_END, this.#release_btn_left, this);
        this.btn_right.on(Node.EventType.TOUCH_END, this.#release_btn_right, this);
        this.btn_up.on(Node.EventType.TOUCH_END, this.#release_btn_up, this);
        this.btn_down.on(Node.EventType.TOUCH_END, this.#release_btn_down, this);

        this.btn_left.on(Node.EventType.TOUCH_CANCEL, this.#release_btn_left, this);
        this.btn_right.on(Node.EventType.TOUCH_CANCEL, this.#release_btn_right, this);
        this.btn_up.on(Node.EventType.TOUCH_CANCEL, this.#release_btn_up, this);
        this.btn_down.on(Node.EventType.TOUCH_CANCEL, this.#release_btn_down, this);
    }

    clear() {
        this.input = null;

        this.btn_left.off(Node.EventType.TOUCH_START, this.#press_btn_left, this);
        this.btn_right.off(Node.EventType.TOUCH_START, this.#press_btn_right, this);
        this.btn_up.off(Node.EventType.TOUCH_START, this.#press_btn_up, this);
        this.btn_down.off(Node.EventType.TOUCH_START, this.#press_btn_down, this);

        this.btn_left.off(Node.EventType.TOUCH_END, this.#release_btn_left, this);
        this.btn_right.off(Node.EventType.TOUCH_END, this.#release_btn_right, this);
        this.btn_up.off(Node.EventType.TOUCH_END, this.#release_btn_up, this);
        this.btn_down.off(Node.EventType.TOUCH_END, this.#release_btn_down, this);

        this.btn_left.off(Node.EventType.TOUCH_CANCEL, this.#release_btn_left, this);
        this.btn_right.off(Node.EventType.TOUCH_CANCEL, this.#release_btn_right, this);
        this.btn_up.off(Node.EventType.TOUCH_CANCEL, this.#release_btn_up, this);
        this.btn_down.off(Node.EventType.TOUCH_CANCEL, this.#release_btn_down, this);
    }

    #press_btn_left() {
        this.btn_left.scale = Dpad.PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.LEFT);
        input.press(button);
    }

    #press_btn_right() {
        this.btn_right.scale = Dpad.PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.RIGHT);
        input.press(button);
    }

    #press_btn_up() {
        this.btn_up.scale = Dpad.PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.UP);
        input.press(button);
    }

    #press_btn_down() {
        this.btn_down.scale = Dpad.PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.DOWN);
        input.press(button);
    }

    #release_btn_left() {
        this.btn_left.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.LEFT);
        input.release(button);
    }

    #release_btn_right() {
        this.btn_right.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.RIGHT);
        input.release(button);
    }

    #release_btn_up() {
        this.btn_up.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.UP);
        input.release(button);
    }

    #release_btn_down() {
        this.btn_down.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Dpad_Button_To_Game_Button.get(Dpad_Button.DOWN);
        input.release(button);
    }
}