import { _decorator, Component, Node, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum Action_Button {
    X = 1 << 0,
    Y = 1 << 1,
    A = 1 << 2,
    B = 1 << 3,
}

export type Action_Button_Input = {
    available: boolean,
    state: number,
}

@ccclass('Action_Button_Group')
export class Action_Button_Group extends Component {
    static PRESSED_SCALE = new Vec3(0.9, 0.9, 1);

    @property(Node) btn_x: Node = null;
    @property(Node) btn_y: Node = null;
    @property(Node) btn_a: Node = null;
    @property(Node) btn_b: Node = null;

    btns: Map<number, Node> = new Map();
    onLoad() {
        this.btns.set(Action_Button.X, this.btn_x);
        this.btns.set(Action_Button.Y, this.btn_y);
        this.btns.set(Action_Button.A, this.btn_a);
        this.btns.set(Action_Button.B, this.btn_b);
    }

    get state(): Action_Button_Input {
        return {
            available: this.#state != 0,
            state: this.#state
        }
    }

    #state: number = 0;

    init() {
        this.#state = 0;
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
    }

    #press(f: number) {
        this.#state |= f;
        this.btns.get(f).scale = Action_Button_Group.PRESSED_SCALE;
    }

    #release(f: number) {
        if ((this.#state & f) == 0) return;
        this.#state -= f;
        this.btns.get(f).scale = Vec3.ONE;
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


