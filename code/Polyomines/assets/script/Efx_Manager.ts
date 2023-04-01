import { _decorator, Component, Node, Vec3 } from 'cc';
import { $$, Const } from './Const';
import { Game_Entity } from './Game_Entity';
const { ccclass, property } = _decorator;

@ccclass('Efx_Manager')
export class Efx_Manager extends Component {
    public static instance: Efx_Manager = null;
    public static Settle(instance: Efx_Manager) {
        Efx_Manager.instance = instance;
    }
    @property(Node) efx_switch_hero: Node = null;

    public switch_hero_efx(entity: Game_Entity) {
        const effect = this.efx_switch_hero;
        effect.setWorldPosition(entity.node.getWorldPosition());
        effect.setParent(entity.node);
        effect.setPosition(Vec3.ZERO);
        effect.active = true;
        $$.IS_RUNNING = false;

        this.scheduleOnce(() => {
            effect.setParent(this.node);
            effect.active = false;
            $$.IS_RUNNING = true;
        }, Const.SWITCH_HERO_DURATION)
    }
}
