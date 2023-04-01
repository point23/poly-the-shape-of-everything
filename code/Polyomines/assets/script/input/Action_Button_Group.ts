import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const } from '../Const';
import { Game_Input } from './Game_Input_Handler';
import { Input_Manager } from './Input_Manager';
const { ccclass, property } = _decorator;

export enum Action_Button {
    X,
    Y,
    A,
    B
}

export type Action_Button_Input = {
    available: boolean,
    btn_idx: number,
}

@ccclass('Action_Button_Group')
export class Action_Button_Group extends Component {
    static PRESSED_SCALE = new Vec3(0.5, 0.5, 1);

    @property(Node) btn_x: Node = null;
    @property(Node) btn_y: Node = null;
    @property(Node) btn_a: Node = null;
    @property(Node) btn_b: Node = null;

    #buttons: [Node, Node, Node, Node] = [null, null, null, null];

    start() {
        this.#buttons[Action_Button.X] = this.btn_x;
        this.#buttons[Action_Button.Y] = this.btn_y;
        this.#buttons[Action_Button.A] = this.btn_a;
        this.#buttons[Action_Button.B] = this.btn_b;
    }

    input: Game_Input = null;
    init(i: Game_Input) {
        this.input = i;

        this.btn_x.on(Node.EventType.TOUCH_START, this.#press_x, this);
        this.btn_y.on(Node.EventType.TOUCH_START, this.#press_y, this);
        this.btn_a.on(Node.EventType.TOUCH_START, this.#press_a, this);
        this.btn_b.on(Node.EventType.TOUCH_START, this.#press_b, this);

        this.btn_x.on(Node.EventType.TOUCH_END, this.#release_x, this);
        this.btn_y.on(Node.EventType.TOUCH_END, this.#release_y, this);
        this.btn_a.on(Node.EventType.TOUCH_END, this.#release_a, this);
        this.btn_b.on(Node.EventType.TOUCH_END, this.#release_b, this);

        this.btn_x.on(Node.EventType.TOUCH_CANCEL, this.#release_x, this);
        this.btn_y.on(Node.EventType.TOUCH_CANCEL, this.#release_y, this);
        this.btn_a.on(Node.EventType.TOUCH_CANCEL, this.#release_a, this);
        this.btn_b.on(Node.EventType.TOUCH_CANCEL, this.#release_b, this);
    }

    clear() {
        this.input = null;

        this.btn_x.off(Node.EventType.TOUCH_START, this.#press_x, this);
        this.btn_y.off(Node.EventType.TOUCH_START, this.#press_y, this);
        this.btn_a.off(Node.EventType.TOUCH_START, this.#press_a, this);
        this.btn_b.off(Node.EventType.TOUCH_START, this.#press_b, this);

        this.btn_x.off(Node.EventType.TOUCH_END, this.#release_x, this);
        this.btn_y.off(Node.EventType.TOUCH_END, this.#release_y, this);
        this.btn_a.off(Node.EventType.TOUCH_END, this.#release_a, this);
        this.btn_b.off(Node.EventType.TOUCH_END, this.#release_b, this);

        this.btn_x.off(Node.EventType.TOUCH_CANCEL, this.#release_x, this);
        this.btn_y.off(Node.EventType.TOUCH_CANCEL, this.#release_y, this);
        this.btn_a.off(Node.EventType.TOUCH_CANCEL, this.#release_a, this);
        this.btn_b.off(Node.EventType.TOUCH_CANCEL, this.#release_b, this);
    }

    #press_x() {
        this.btn_x.scale = Const.ACTION_BUTTON_PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.X)
        input.press(button);
    }

    #press_y() {
        this.btn_y.scale = Const.ACTION_BUTTON_PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.Y)
        input.press(button);
    }

    #press_a() {
        this.btn_a.scale = Const.ACTION_BUTTON_PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.A)
        input.press(button);
    }

    #press_b() {
        this.btn_b.scale = Const.ACTION_BUTTON_PRESSED_SCALE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.B)
        input.press(button);
    }

    #release_x() {
        this.btn_x.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.X)
        input.release(button);
    }

    #release_y() {
        this.btn_y.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.Y)
        input.release(button);
    }

    #release_a() {
        this.btn_a.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.A)
        input.release(button);
    }

    #release_b() {
        this.btn_b.scale = Vec3.ONE;
        const input = this.input;
        const button = Input_Manager.Action_Button_To_Game_Button.get(Action_Button.B)
        input.release(button);
    }
}
