import { _decorator, Component, instantiate, math, Node, Prefab, Vec3 } from 'cc';
import { $$, array_remove, Const, same_position, vec_add, vec_sub } from './Const';
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
            this.beam_item.destroy();
            destroy(this);
        }
    }
}

class Halo implements Efx_Mechanism {
    start_at: gameplay_time = null;
    end_at: gameplay_time = null;
    current_ratio: number = 0;
    halo_item: Node = null;

    update(): void {
        if (Gameplay_Timer.compare(this.start_at) == 1) return;
        this.halo_item.active = true;

        let ratio = 0;
        const duration = Gameplay_Timer.calcu_delta_ticks(this.start_at, this.end_at); // @Optimize
        const passed = Gameplay_Timer.calcu_delta_ticks(this.start_at);                // @Optimize
        ratio = math.clamp01(passed / duration);
        if (ratio < this.current_ratio) { // @Note Incase duration changed.
            ratio = this.current_ratio;
        }
        this.current_ratio = ratio;

        if (ratio == 1 || Gameplay_Timer.compare(Gameplay_Timer.get_gameplay_time(), this.end_at) >= 0) {
            this.halo_item.destroy();
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
    efx.beam_item = manager.beam_item;

    manager.running_mechanisms.push(efx);
}

export function halo(pos: Vec3, duration: number = 1, delay: number = 0) {
    const manager = Efx_Manager.instance;
    const efx = new Halo();
    efx.start_at = Gameplay_Timer.get_gameplay_time(delay);
    efx.end_at = Gameplay_Timer.get_gameplay_time(delay + duration);
    efx.halo_item = manager.halo_item;
    efx.halo_item.setWorldPosition(pos);

    manager.running_mechanisms.push(efx);
}

@ccclass('Efx_Manager')
export class Efx_Manager extends Component {
    public static instance: Efx_Manager = null;
    public static Settle(instance: Efx_Manager) {
        Efx_Manager.instance = instance;
    }

    @property(Node) parent_node: Node = null;
    running_mechanisms: Efx_Mechanism[] = [];

    @property(Prefab) pfb_halo: Prefab = null;
    @property(Prefab) pfb_beam: Prefab = null;

    get halo_item(): Node {
        const n = instantiate(this.pfb_halo);
        n.setParent(this.parent_node);
        return n;
    }

    get beam_item(): Node {
        const n = instantiate(this.pfb_beam);
        n.setParent(this.parent_node);
        return n;
    }
}
