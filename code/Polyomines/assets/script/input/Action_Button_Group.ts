import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const } from '../Const';
import { Button_State, handle_button_down, handle_button_up, pressed_long_enough } from './Game_Input_Handler';
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
    static PRESSED_SCALE = new Vec3(0.9, 0.9, 1);

    @property(Node) btn_x: Node = null;
    @property(Node) btn_y: Node = null;
    @property(Node) btn_a: Node = null;
    @property(Node) btn_b: Node = null;

    #buttons: [Node, Node, Node, Node] = [null, null, null, null];
    #btn_ended_down: boolean = false;
    #button_idx: number = 0;
    #processed_count: number = 0;
    #pressed_at: number = 0;

    start() {
        this.#buttons[Action_Button.X] = this.btn_x;
        this.#buttons[Action_Button.Y] = this.btn_y;
        this.#buttons[Action_Button.A] = this.btn_a;
        this.#buttons[Action_Button.B] = this.btn_b;
    }

    get state(): Action_Button_Input {
        let press_long_enough: boolean = false;
        if (this.#btn_ended_down) {
            const pressing_duration = new Date().getTime() - this.#pressed_at;
            if (pressing_duration >= this.#processed_count * Const.VALID_PRESSING_INTERVAL) {
                press_long_enough = true;
                this.#processed_count += 1;
            }
        }

        return {
            available: this.#btn_ended_down && press_long_enough,
            btn_idx: this.#button_idx,
        };
    }

    init() {
        this.btn_x.on(Node.EventType.TOUCH_START, this.#press_x, this);
        this.btn_y.on(Node.EventType.TOUCH_START, this.#press_y, this);
        this.btn_a.on(Node.EventType.TOUCH_START, this.#press_a, this);
        this.btn_b.on(Node.EventType.TOUCH_START, this.#press_b, this);

        this.btn_x.on(Node.EventType.TOUCH_END, this.#release_x, this);
        this.btn_y.on(Node.EventType.TOUCH_END, this.#release_y, this);
        this.btn_a.on(Node.EventType.TOUCH_END, this.#release_a, this);
        this.btn_b.on(Node.EventType.TOUCH_END, this.#release_b, this);
    }

    clear() {
        this.btn_x.off(Node.EventType.TOUCH_START, this.#press_x, this);
        this.btn_y.off(Node.EventType.TOUCH_START, this.#press_y, this);
        this.btn_a.off(Node.EventType.TOUCH_START, this.#press_a, this);
        this.btn_b.off(Node.EventType.TOUCH_START, this.#press_b, this);

        this.btn_x.off(Node.EventType.TOUCH_END, this.#release_x, this);
        this.btn_y.off(Node.EventType.TOUCH_END, this.#release_y, this);
        this.btn_a.off(Node.EventType.TOUCH_END, this.#release_a, this);
        this.btn_b.off(Node.EventType.TOUCH_END, this.#release_b, this);

        this.#btn_ended_down = false;
    }

    #press(idx: number) {
        this.#buttons[idx].scale = Action_Button_Group.PRESSED_SCALE;
        this.#pressed_at = new Date().getTime();
        this.#btn_ended_down = true;
        this.#processed_count = 0;
        this.#button_idx = idx;
    }

    #release(idx: number) {
        this.#buttons[idx].scale = Vec3.ONE;
        this.#btn_ended_down = false;
    }

    #press_x() { this.#press(Action_Button.X); }
    #press_y() { this.#press(Action_Button.Y); }
    #press_a() { this.#press(Action_Button.A); }
    #press_b() { this.#press(Action_Button.B); }

    #release_x() { this.#release(Action_Button.X); }
    #release_y() { this.#release(Action_Button.Y); }
    #release_a() { this.#release(Action_Button.A); }
    #release_b() { this.#release(Action_Button.B); }
}


