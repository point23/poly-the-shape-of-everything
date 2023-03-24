import { _decorator, Component, Node, EventTouch, Vec2, Sprite, UITransform, math, Vec3, EventHandler } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Joystick')
export class Joystick extends Component {
    @property(Node) stick: Node = null;
    @property(Node) backdrop: Node = null;
    @property(Node) touch_panel: Node = null;

    controller_events: EventHandler[] = [];

    #center: Vec2 = null;
    #radius: number = 0;
    #z: number = 0;

    start() {
        this.#radius = this.backdrop.getComponent(UITransform).contentSize.x >> 1;
        const v = this.stick.getWorldPosition();
        this.#center = new Vec2(v.x, v.y);
        this.#z = v.z;

        this.touch_panel.on(Node.EventType.TOUCH_START, this.touch_start, this);
        this.touch_panel.on(Node.EventType.TOUCH_MOVE, this.touch_move, this);
        this.touch_panel.on(Node.EventType.TOUCH_END, this.touch_end, this);
        this.touch_panel.on(Node.EventType.TOUCH_CANCEL, this.touch_cancel, this);
    }

    touch_start(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.clamp_touch_pos(pos);

        this.stick.setWorldPosition(pos.x, pos.y, this.#z);
        const controller_pos = pos.subtract(this.#center);
        this.controller_events.forEach(e => e.emit([controller_pos, this.#radius]));
    }

    clamp_touch_pos(pos: Vec2) {
        const delta = pos.subtract(this.#center);
        delta.x = math.clamp(delta.x, -this.#radius, this.#radius);
        delta.y = math.clamp(delta.y, -this.#radius, this.#radius);
        pos.x = this.#center.x + delta.x;
        pos.y = this.#center.y + delta.y;
    }

    touch_move(e: EventTouch) {
        let pos: Vec2 = new Vec2();
        e.getUILocation(pos);
        this.clamp_touch_pos(pos);

        this.stick.setWorldPosition(pos.x, pos.y, this.#z);
        const controller_pos = pos.subtract(this.#center);
        this.controller_events.forEach(e => e.emit([controller_pos, this.#radius]));
    }

    touch_end(e: EventTouch) {
        this.stick.setWorldPosition(this.#center.x, this.#center.y, this.#z);
    }

    touch_cancel(e: EventTouch) {
        this.stick.setWorldPosition(this.#center.x, this.#center.y, this.#z);
    }
}


