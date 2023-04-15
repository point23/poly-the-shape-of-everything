import { _decorator, Component, Node, Quat, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Polygon_Entity')
export class Polygon_Entity extends Component {
    rotate_to(r: Quat) {
        this.node.setRotation(r);
    }
}
