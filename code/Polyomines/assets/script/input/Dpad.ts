import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const } from '../Const';
import { Direction } from '../Game_Entity';
const { ccclass, property } = _decorator;

export enum Dpad_Button {
    DPAD_LEFT = Direction.LEFT,
    DPAD_RIGHT = Direction.RIGHT,
    DPAD_DOWN = Direction.FORWARD,
    DPAD_UP = Direction.BACKWORD,
}

export type Dpad_Input = {
    available: boolean,
    btn_idx: number,
};

@ccclass('Dpad')
export class Dpad extends Component {
    static PRESSED_SCALE = new Vec3(1.1, 1.1, 1);

    @property(Node) btn_left: Node = null;
    @property(Node) btn_right: Node = null;
    @property(Node) btn_up: Node = null;
    @property(Node) btn_down: Node = null;


    get state(): Dpad_Input {
        let press_long_enough: boolean = false;
        if (this.#btn_ended_down) {
            const pressing_interval = new Date().getTime() - this.#press_counter;
            if (pressing_interval >= this.#processed_count * Const.DPAD_PRESSING_INTERVAL) {
                press_long_enough = true;
                this.#processed_count += 1;
            }
        }

        return {
            available: this.#btn_ended_down && press_long_enough,
            btn_idx: this.#button_idx,
        };
    }

    #buttons: [Node, Node, Node, Node] = [null, null, null, null];
    #btn_ended_down: boolean = false;
    #button_idx: number = 0;
    #processed_count: number = 0;
    #press_counter: number = 0;

    start() {
        this.#buttons[Dpad_Button.DPAD_LEFT] = this.btn_left;
        this.#buttons[Dpad_Button.DPAD_RIGHT] = this.btn_right;
        this.#buttons[Dpad_Button.DPAD_DOWN] = this.btn_down;
        this.#buttons[Dpad_Button.DPAD_UP] = this.btn_up;
    }

    init() {
        this.register();
    }

    clear() {
        this.unregister();
    }

    register() {
        this.btn_left.on(Node.EventType.TOUCH_START, this.#press_btn_left, this);
        this.btn_right.on(Node.EventType.TOUCH_START, this.#press_btn_right, this);
        this.btn_up.on(Node.EventType.TOUCH_START, this.#press_btn_up, this);
        this.btn_down.on(Node.EventType.TOUCH_START, this.#press_btn_down, this);

        this.btn_left.on(Node.EventType.TOUCH_END, this.#release_btn_left, this);
        this.btn_right.on(Node.EventType.TOUCH_END, this.#release_btn_right, this);
        this.btn_up.on(Node.EventType.TOUCH_END, this.#release_btn_up, this);
        this.btn_down.on(Node.EventType.TOUCH_END, this.#release_btn_down, this);
    }

    unregister() {
        this.btn_left.off(Node.EventType.TOUCH_START, this.#press_btn_left, this);
        this.btn_right.off(Node.EventType.TOUCH_START, this.#press_btn_right, this);
        this.btn_up.off(Node.EventType.TOUCH_START, this.#press_btn_up, this);
        this.btn_down.off(Node.EventType.TOUCH_START, this.#press_btn_down, this);

        this.btn_left.off(Node.EventType.TOUCH_END, this.#release_btn_left, this);
        this.btn_right.off(Node.EventType.TOUCH_END, this.#release_btn_right, this);
        this.btn_up.off(Node.EventType.TOUCH_END, this.#release_btn_up, this);
        this.btn_down.off(Node.EventType.TOUCH_END, this.#release_btn_down, this);
    }

    #press(idx: number) {
        this.#buttons[idx].scale = Dpad.PRESSED_SCALE;
        this.#press_counter = new Date().getTime();
        this.#btn_ended_down = true;
        this.#processed_count = 0;
        this.#button_idx = idx;
    }

    #release(idx: number) {
        this.#buttons[idx].scale = Vec3.ONE;
        this.#btn_ended_down = false;
    }

    #press_btn_left() {
        this.#press(Dpad_Button.DPAD_LEFT);
    }

    #press_btn_right() {
        this.#press(Dpad_Button.DPAD_RIGHT);
    }

    #press_btn_up() {
        this.#press(Dpad_Button.DPAD_UP);
    }

    #press_btn_down() {
        this.#press(Dpad_Button.DPAD_DOWN);
    }

    #release_btn_left() {
        this.#release(Dpad_Button.DPAD_LEFT);
    }

    #release_btn_right() {
        this.#release(Dpad_Button.DPAD_RIGHT);
    }

    #release_btn_up() {
        this.#release(Dpad_Button.DPAD_UP);
    }

    #release_btn_down() {
        this.#release(Dpad_Button.DPAD_DOWN);
    }
}


