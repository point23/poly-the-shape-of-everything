import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const } from './Const';
import { Game_Entity } from './Game_Entity';
import { Resource_Manager } from './Resource_Manager';
const { ccclass, property } = _decorator;

@ccclass('Efx_Manager')
export class Efx_Manager extends Component {
    public static instance: Efx_Manager = null;
    public static Settle(instance: Efx_Manager) {
        Efx_Manager.instance = instance;
    }
    @property(Node) efx_switch_hero: Node = null;

    public show_hide_efx(effect: Node, entity: Game_Entity) {
        effect.setWorldPosition(entity.node.getWorldPosition());
        effect.setParent(entity.node);
        effect.setPosition(Vec3.ZERO);
        effect.active = true;

        this.scheduleOnce(() => {
            effect.setParent(Resource_Manager.instance.entities_parent);
            effect.active = false;
        }, Const.SWITCH_HERO_DURATION)
    }
}


