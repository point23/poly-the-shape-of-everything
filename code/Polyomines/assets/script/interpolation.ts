import { _decorator, Quat, Vec3 } from 'cc';
import { Game_Entity } from './Game_Entity';
import { gameplay_time, Gameplay_Timer } from './Gameplay_Timer';

export class Interpolation_Message {
    tag: string = "";
    at: number = -1; // @todo We might need a threshold or sth???
    chidren: Interpolation_Message[] = [];
    do: (() => void);

    send() {
        this.do();
        this.chidren.forEach((it) => it.do());
    }

    constructor(tag: string, at: number) {
        this.tag = tag;
        this.at = at;
    }
}

export class Interpolation_Phase {
    moving: boolean = false;
    rotating: boolean = false;

    end_at: number; // @note Ratio

    start_point: Vec3 = null;
    end_point: Vec3 = null;

    start_ratation: Quat = null;
    end_rotation: Quat = null;

    static movement(end_at: number, start_point: Vec3, end_point: Vec3): Interpolation_Phase {
        const p = new Interpolation_Phase();
        p.moving = true;
        p.end_at = end_at;
        p.start_point = start_point;
        p.end_point = end_point;
        return p;
    }

    on_complete: (() => void);
};

export class Visual_Interpolation {
    static running_interpolations: Map<number, Visual_Interpolation> = new Map();

    current_ratio: number = 0;
    entity: Game_Entity = null;
    children: Visual_Interpolation[] = [];

    start_at: gameplay_time = null;
    end_at: gameplay_time = null;

    current_phase_idx = 0;
    phases: Interpolation_Phase[] = [];
    messages: Map<String, Interpolation_Message> = new Map();

    // @note Let those static messages to handle contructions with limited params for us.
    constructor(
        entity: Game_Entity,
        start_at: gameplay_time,
        end_at: gameplay_time,
        phases: Interpolation_Phase[],
        messages?: Interpolation_Message[],
        parent?: Visual_Interpolation) {

        const i = this;
        // Target
        i.entity = entity;

        // Time-Range
        i.start_at = start_at;
        i.end_at = end_at;

        i.phases = phases;

        if (messages) {
            for (let m of messages) {
                i.messages.set(m.tag, m);
            }
        }

        if (entity.interpolation != null) { // @hack
            console.log('===== CATCHED UP AN INTERPOLATION =====')
            entity.interpolation.on_complete();
        }
        entity.interpolation = i;

        if (!parent) {
            Visual_Interpolation.running_interpolations.set(entity.id, i);
        } else {
            i.start_at = parent.start_at;
            i.end_at = parent.end_at;
            parent.children.push(i);
        }
    }

    process(ratio_?: number) {
        const entity = this.entity;

        let ratio = 0;
        if (ratio_) {
            ratio = ratio_; // @note Sync with the parent.
        } else {
            const duration = Gameplay_Timer.calcu_delta_ticks(this.start_at, this.end_at); // @optimize
            const passed = Gameplay_Timer.calcu_delta_ticks(this.start_at);                // @optimize
            ratio = passed / duration;

            if (ratio < this.current_ratio) { // @note Duration changed.
                ratio = this.current_ratio;
            }
            this.current_ratio = ratio;
        }

        if (ratio > 1) {
            console.log("===== MISS A TICK ====="); // @fixme 
            this.current_ratio = ratio = 1;
        }

        { // Mapping to current phase and lerp it.
            let current_phase = this.phases[this.current_phase_idx];
            if (ratio < 1 && current_phase.end_at < ratio) { // @fixme The end.at might not be exactly that tick???
                current_phase = this.phases[this.current_phase_idx++];
            }

            let phase_duration = current_phase.end_at;
            let last_phase_end_at = 0;
            if (this.current_phase_idx != 0) {
                last_phase_end_at = this.phases[this.current_phase_idx - 1].end_at;
                phase_duration -= last_phase_end_at;
            }

            let mapped_ratio = (ratio - last_phase_end_at) * (1 / phase_duration);
            if (mapped_ratio > 1) {
                mapped_ratio = 1;
            }

            if (current_phase.moving) {
                const temp = new Vec3(); // @optimize
                Vec3.lerp(temp, current_phase.start_point, current_phase.end_point, mapped_ratio);
                entity.visually_move_to(temp);
            }
        }

        { // Process it's children
            if (this.children) {
                this.children.forEach((it) => { it.process(ratio); });
            }
        }

        { // Send it's messages
            for (let m of this.messages.values()) {
                if (ratio >= m.at) {
                    m.send();
                    this.messages.delete(m.tag);
                }
            }
        }

        if (this.current_ratio >= 1
            || Gameplay_Timer.compare(Gameplay_Timer.get_gameplay_time(), this.end_at) >= 0) {
            Visual_Interpolation.running_interpolations.delete(this.entity.id); // Remove itself.
            this.on_complete();
        }
    }

    on_complete() { }
}
