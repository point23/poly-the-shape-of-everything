import { _decorator, Quat, Vec3 } from 'cc';
import { Game_Entity } from './Game_Entity';
import { gameplay_time, Gameplay_Timer } from './Gameplay_Timer';
import { Single_Move } from './sokoban';

/// @note 1-N relationship
//  - You can express this kinda of relationship by:
/*
    1.
        parent {
            children: node[];
        }
    2. 
        chlid {
            parent: node;
        }
*/

export enum Messgae_Tag {
    LOGICALLY_MOVEMENT,
    ROVER_DETECTION,
}

export class Interpolation_Message {
    interpolation: Visual_Interpolation = null;

    tag: Messgae_Tag;
    at: number = -1; // @todo We might need a threshold or sth???
    chidren: Interpolation_Message[] = [];

    send() {
        this.chidren.forEach((it) => {
            if (!it.interpolation.scheduled_for_destruction) {
                it.send()
            }
        }); // @note Now children has to do it first.
        this.do();
    }

    do() { }

    constructor(tag: Messgae_Tag, at: number = 10) {
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

    caused_by: Single_Move = null;
    entity: Game_Entity = null;

    parent: Visual_Interpolation = null;

    start_at: gameplay_time = null;
    end_at: gameplay_time = null;

    current_phase_idx = 0;
    phases: Interpolation_Phase[] = [];
    messages: Map<Messgae_Tag, Interpolation_Message> = new Map();

    scheduled_for_destruction: boolean = false;

    // @note Let those static messages to handle contructions with limited params for us.
    constructor(
        single: Single_Move,
        entity: Game_Entity,
        start_at: gameplay_time,
        end_at: gameplay_time,
        phases: Interpolation_Phase[],
        messages: Interpolation_Message[] = [],
        parent?: Visual_Interpolation) {

        const i = this;

        // Target
        i.caused_by = single;
        i.entity = entity;

        // Time-Range
        i.start_at = start_at;
        i.end_at = end_at;

        i.phases = phases;

        for (let m of messages) {
            i.messages.set(m.tag, m);
            m.interpolation = i;
        }

        if (entity.interpolation != null) { // @hack
            console.log('===== CATCHED UP AN INTERPOLATION =====')
            entity.interpolation.on_complete();
        }

        this.parent = parent;
        entity.interpolation = i;
        Visual_Interpolation.running_interpolations.set(entity.id, i);
    }

    process() {
        const entity = this.entity;

        let ratio = 0;
        if (this.parent) {
            ratio = this.parent.current_ratio; // @note Sync with the parent.
        } else {
            const duration = Gameplay_Timer.calcu_delta_ticks(this.start_at, this.end_at); // @optimize
            const passed = Gameplay_Timer.calcu_delta_ticks(this.start_at);                // @optimize
            ratio = passed / duration;

            if (ratio < this.current_ratio) { // @note Duration changed.
                ratio = this.current_ratio;
            }
        }
        this.current_ratio = ratio;

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

            this.on_complete();
            this.destroy();
        }
    }

    destroy() {
        // Remove it.
        this.entity.interpolation = null;
        this.scheduled_for_destruction = true;
        Visual_Interpolation.running_interpolations.delete(this.entity.id); // Remove itself.
    }

    on_start() { }
    on_complete() { }
}
