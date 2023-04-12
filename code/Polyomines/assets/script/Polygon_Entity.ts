import { _decorator, Component, Node, tween } from 'cc';

import { Const } from './Const';
import { Direction } from './Game_Entity';

const { ccclass, property } = _decorator;

@ccclass('Polygon_Entity')
export class Polygon_Entity extends Component {
    async rotate_to_async(dir: Direction) {
        tween()
            .target(this.node)
            .to(0.1, { rotation: Const.DIRECTION2QUAT[dir] })
            .start();
    }

    rotate_to(dir: Direction) {
        this.node.setRotation(Const.DIRECTION2QUAT[dir]);
    }
}
