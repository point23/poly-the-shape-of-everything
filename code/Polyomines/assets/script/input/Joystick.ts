import { _decorator, Component, Node, EventTouch, Vec2, Sprite, UITransform, math, Vec3, EventHandler, misc, systemEvent } from 'cc';
import { Const } from '../Const';
const { ccclass, property } = _decorator;

// @incomplete There're suppose to have an interface -> Game_Input_Handler, with subclasses like Vitrual_Controller, Controller, Keyboard, Touch_Panel  
export class Joystick_Input {
    available: boolean = false;
    degree: number = 0;
    pos: Vec2 = new Vec2();
}

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node) stick: Node = null;
    @property(Node) backdrop: Node = null;
    @property(Node) touch_area: Node = null;

    state: Joystick_Input = new Joystick_Input();

    #position: Vec2 = new Vec2();
    #radius: number = 0;

    #center: Vec2 = null;
    #z: number = 0;

    init() {
        this.#radius = this.backdrop.getComponent(UITransform).contentSize.x >> 1;
        const v = this.stick.getWorldPosition();
        this.#center = new Vec2(v.x, v.y);
        this.#z = v.z;

        this.state.available = false;

        this.touch_area.on(Node.EventType.TOUCH_START, this.#touch_start, this);
        this.touch_area.on(Node.EventType.TOUCH_MOVE, this.#touch_move, this);
        this.touch_area.on(Node.EventType.TOUCH_END, this.#touch_end, this);
        this.touch_area.on(Node.EventType.TOUCH_CANCEL, this.#touch_cancel, this);
    }

    clear() {
        this.touch_area.off(Node.EventType.TOUCH_START, this.#touch_start, this);
        this.touch_area.off(Node.EventType.TOUCH_MOVE, this.#touch_move, this);
        this.touch_area.off(Node.EventType.TOUCH_END, this.#touch_end, this);
        this.touch_area.off(Node.EventType.TOUCH_CANCEL, this.#touch_cancel, this);
    }

    #touch_start(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.#update_input_state(pos);
    }

    #touch_move(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.#update_input_state(pos);
    }

    #touch_end(e: EventTouch) {
        this.#update_input_state(new Vec2(this.#center));
    }

    #touch_cancel(e: EventTouch) {
        this.#update_input_state(new Vec2(this.#center));
    }

    #clamp_touch_pos(pos: Vec2) {
        const delta = pos.subtract(this.#center);
        delta.x = math.clamp(delta.x, -this.#radius, this.#radius);
        delta.y = math.clamp(delta.y, -this.#radius, this.#radius);
        pos.x = this.#center.x + delta.x;
        pos.y = this.#center.y + delta.y;
    }

    #update_input_state(pos: Vec2) {
        this.#clamp_touch_pos(pos);
        this.stick.setWorldPosition(pos.x, pos.y, this.#z);
        this.#position = pos.subtract(this.#center);

        const rad = Math.atan2(pos.y, pos.x);
        const deg: number = misc.radiansToDegrees(rad);

        const delta = this.#position.length();
        const p = (delta / this.#radius);

        if (p < Const.JOYSTICK_DEADZONE) {
            this.state.available = false;
            return;
        }

        this.state.available = true;
        this.state.degree = deg;
        this.state.pos.set(this.#position);
    }
}


