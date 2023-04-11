import { _decorator, Component, Node, EventTouch, math, misc, UITransform, Vec2 } from 'cc';
import { Const } from '../Const';
import { Game_Input, Game_Button } from './Game_Input_Handler';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node) stick: Node = null;
    @property(Node) backdrop: Node = null;
    @property(Node) touch_area: Node = null;

    #position: Vec2 = new Vec2();
    #radius: number = 0;

    #center: Vec2 = null;
    #z: number = 0;

    input: Game_Input = null;

    init(i: Game_Input) {
        this.input = i;

        this.#radius = this.backdrop.getComponent(UITransform).contentSize.x >> 1;
        const v = this.stick.getWorldPosition();
        this.#center = new Vec2(v.x, v.y);
        this.#z = v.z;

        this.touch_area.on(Node.EventType.TOUCH_START, this.#touch_start, this);
        this.touch_area.on(Node.EventType.TOUCH_MOVE, this.#touch_move, this);
        this.touch_area.on(Node.EventType.TOUCH_END, this.#touch_end, this);
        this.touch_area.on(Node.EventType.TOUCH_CANCEL, this.#touch_cancel, this);
    }

    clear() {
        this.input = null;

        this.touch_area.off(Node.EventType.TOUCH_START, this.#touch_start, this);
        this.touch_area.off(Node.EventType.TOUCH_MOVE, this.#touch_move, this);
        this.touch_area.off(Node.EventType.TOUCH_END, this.#touch_end, this);
        this.touch_area.off(Node.EventType.TOUCH_CANCEL, this.#touch_cancel, this);
    }

    #touch_start(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.#update_state(pos);

        const rad = Math.atan2(this.#position.y, this.#position.x);
        const deg: number = misc.radiansToDegrees(rad);
        const delta = this.#position.length();

        if ((delta / this.#radius) < Const.JOYSTICK_DEADZONE) {
            return;
        }

        const input = this.input;
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

    #touch_move(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.#update_state(pos);

        const input = this.input;
        const rad = Math.atan2(this.#position.y, this.#position.x);
        const deg: number = misc.radiansToDegrees(rad);
        const delta = this.#position.length();

        if ((delta / this.#radius) < Const.JOYSTICK_DEADZONE) {
            input.release(Game_Button.FACE_BACKWARD);
            input.release(Game_Button.FACE_FORWARD);
            input.release(Game_Button.FACE_LEFT);
            input.release(Game_Button.FACE_RIGHT);
            return;
        }

        if (deg >= 45 && deg <= 135) { // BACKWARD
            if (input.button_states.get(Game_Button.FACE_BACKWARD).ended_down) {
                input.release(Game_Button.FACE_FORWARD);
                input.release(Game_Button.FACE_LEFT);
                input.release(Game_Button.FACE_RIGHT);
                input.press(Game_Button.FACE_BACKWARD);
            }
        } else if (deg <= -45 && deg >= -135) { // FORWARD
            if (input.button_states.get(Game_Button.FACE_FORWARD).ended_down) {
                input.release(Game_Button.FACE_BACKWARD);
                input.release(Game_Button.FACE_LEFT);
                input.release(Game_Button.FACE_RIGHT);

                input.press(Game_Button.FACE_FORWARD);
            }
        } else if (deg >= 135 || deg <= -135) { // LEFT
            if (input.button_states.get(Game_Button.FACE_LEFT).ended_down) {
                input.release(Game_Button.FACE_BACKWARD);
                input.release(Game_Button.FACE_FORWARD);
                input.release(Game_Button.FACE_RIGHT);
                input.press(Game_Button.FACE_LEFT);
            }
        } else if (deg <= 45 && deg >= -45) { // RIGHT
            if (input.button_states.get(Game_Button.FACE_RIGHT).ended_down) {
                input.release(Game_Button.FACE_BACKWARD);
                input.release(Game_Button.FACE_FORWARD);
                input.release(Game_Button.FACE_LEFT);
                input.press(Game_Button.FACE_RIGHT);
            }
        }
    }

    #touch_end(e: EventTouch) {
        this.#update_state(new Vec2().set(this.#center));

        const input = this.input;

        input.release(Game_Button.FACE_BACKWARD);
        input.release(Game_Button.FACE_FORWARD);
        input.release(Game_Button.FACE_LEFT);
        input.release(Game_Button.FACE_RIGHT);
    }

    #touch_cancel(e: EventTouch) {
        this.#update_state(new Vec2().set(this.#center));

        const input = this.input;

        input.release(Game_Button.FACE_BACKWARD);
        input.release(Game_Button.FACE_FORWARD);
        input.release(Game_Button.FACE_LEFT);
        input.release(Game_Button.FACE_RIGHT);
    }

    #clamp_touch_pos(pos: Vec2) {
        const delta = pos.subtract(this.#center);
        delta.x = math.clamp(delta.x, -this.#radius, this.#radius);
        delta.y = math.clamp(delta.y, -this.#radius, this.#radius);
        pos.x = this.#center.x + delta.x;
        pos.y = this.#center.y + delta.y;
    }

    #update_state(pos: Vec2) {
        this.#clamp_touch_pos(pos);
        this.stick.setWorldPosition(pos.x, pos.y, this.#z);
        this.#position = pos.subtract(this.#center);
    }
}