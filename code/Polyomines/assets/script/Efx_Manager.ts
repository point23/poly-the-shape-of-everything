import { _decorator, Component, math, MeshRenderer, Node, Vec3 } from 'cc';
import { $$, array_remove, Const, vec_add, vec_sub } from './Const';
import { Game_Entity } from './Game_Entity';
import { gameplay_time, Gameplay_Timer } from './Gameplay_Timer';
const { ccclass, property } = _decorator;

export interface Efx_Mechanism {
    start_at: gameplay_time;
    end_at: gameplay_time;
    current_ratio: number;
    update(): void;
}

function destroy(efx: Efx_Mechanism) {
    array_remove(Efx_Manager.instance.running_mechanisms, efx);
}

class Beam implements Efx_Mechanism {
    start_at: gameplay_time = null;
    end_at: gameplay_time = null;
    current_ratio: number = 0;
    start_position: Vec3 = null; // @Note There' can be Diagonals!!!
    end_position: Vec3 = null;
    beam_item: Node = null;

    update(): void {
        if (Gameplay_Timer.compare(this.start_at) == 1) return;
        this.beam_item.active = true;

        let ratio = 0;
        const duration = Gameplay_Timer.calcu_delta_ticks(this.start_at, this.end_at); // @Optimize
        const passed = Gameplay_Timer.calcu_delta_ticks(this.start_at);                // @Optimize
        ratio = math.clamp01(passed / duration);
        if (ratio < this.current_ratio) { // @Note Incase duration changed.
            ratio = this.current_ratio;
        }
        this.current_ratio = ratio;

        const offset: Vec3 = vec_sub(this.end_position, this.start_position); // @Note Calcu in world coordinates, which means it happend in XoZ plane.
        const length = (Vec3.len(offset) + 1);
        const current_length = math.lerp(0, length, ratio);

        { // Scale
            if (offset.x != 0) {
                this.beam_item.setScale(current_length, 1, 1);
            } else {
                this.beam_item.setScale(1, 1, current_length);
            }
        }

        { // Translation
            offset.normalize();
            const delta = new Vec3(offset).multiplyScalar(current_length * 0.5);
            const displacement = new Vec3(offset).multiplyScalar(0.5);
            const beam_position: Vec3 = vec_sub(vec_add(this.start_position, delta), displacement);
            this.beam_item.setPosition(beam_position);
        }

        // @Todo Enforce the color strength...

        if (ratio == 1 || Gameplay_Timer.compare(Gameplay_Timer.get_gameplay_time(), this.end_at) >= 0) {
            this.beam_item.active = false;
            destroy(this);
        }
    }
}

export function beam(from: Vec3, to: Vec3, duration: number = 1, delay: number = 0) {
    const manager = Efx_Manager.instance;
    const efx = new Beam();
    efx.start_at = Gameplay_Timer.get_gameplay_time(delay);
    efx.end_at = Gameplay_Timer.get_gameplay_time(delay + duration);
    efx.start_position = from;
    efx.end_position = to;
    efx.beam_item = manager.efx_beam;
    manager.running_mechanisms.push(efx);
}

@ccclass('Efx_Manager')
export class Efx_Manager extends Component {
    public static instance: Efx_Manager = null;
    public static Settle(instance: Efx_Manager) {
        Efx_Manager.instance = instance;
    }

    running_mechanisms: Efx_Mechanism[] = [];

    @property(Node) efx_switch_hero: Node = null;
    @property(Node) efx_beam: Node = null;

    protected onLoad(): void {
        this.efx_switch_hero.active = false;
        this.efx_beam.active = false;
    }

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
