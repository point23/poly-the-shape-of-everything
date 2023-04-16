import { _decorator, math, Quat, Vec3 } from 'cc';
import { calcu_entity_future_position, Game_Entity } from './Game_Entity';
import { gameplay_time, Gameplay_Timer, time_to_string } from './Gameplay_Timer';
import { Single_Move } from './sokoban';
import { Stack, String_Builder } from './Const';

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

    send_message() {
        this.chidren.forEach((it) => {
            if (!it.interpolation.scheduled_for_destruction) {
                it.send_message()
            }
        }); // @note Now children has to do it first.

        this.process(this);
    }

    process(m: Interpolation_Message) { }

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

    static rotation(end_at: number, start_rotation: Quat, end_rotation: Quat): Interpolation_Phase {
        const p = new Interpolation_Phase();
        p.rotating = true;
        p.end_at = end_at;
        p.start_ratation = start_rotation;
        p.end_rotation = end_rotation;
        return p;
    }

    static movement(end_at: number, start_point: Vec3, end_point: Vec3): Interpolation_Phase {
        const p = new Interpolation_Phase();
        p.moving = true;
        p.end_at = end_at;
        p.start_point = start_point;
        p.end_point = end_point;
        return p;
    }

    on_complete: (() => void);

    debug_log(): string {
        const builder = new String_Builder();
        builder.append("[end at: ").append(this.end_at).append(", ");
        if (this.moving) {
            builder.append("position ( start: ").append(this.start_point).append(", end: ").append(this.end_point).append('), ');
        }
        if (this.rotating) {
            builder.append("rotation ( start: ").append(this.start_ratation).append(", end: ").append(this.end_rotation).append('), ');
        }
        builder.append("]");
        return builder.to_string();
    }
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
    phases: Stack<Interpolation_Phase> = new Stack();
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

        phases.sort((a, b) => b.end_at - a.end_at);
        for (let p of phases) {
            this.phases.push(p);
        }

        for (let m of messages) {
            i.messages.set(m.tag, m);
            m.interpolation = i;
        }

        this.parent = parent;
        entity.interpolation?.destroy();
        entity.interpolation = i;

        // console.log(i.debug_log()); 

        Visual_Interpolation.running_interpolations.set(entity.id, i);
    }

    debug_log(): string {
        const builder = new String_Builder();
        builder.append("start at: ").append(time_to_string(this.start_at)).append(", ");
        builder.append("end at: ").append(time_to_string(this.end_at)).append(", {");
        this.phases.storage.forEach((it, it_idx) => {
            builder.append(`phase#${it_idx}`).append(it.debug_log()).append(", ");
        });
        builder.append("}")
        return builder.to_string();
    }

    last_phase_end_at = 0;
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
            // Not sure if it's ok.

            let available: boolean = false;
            if (!this.phases.empty()) {
                let current_phase = this.phases.peek();
                if (ratio <= current_phase.end_at) {
                    available = true;
                } else {
                    this.last_phase_end_at = current_phase.end_at;
                    this.phases.pop();
                    if (!this.phases.empty()) {
                        available = true;
                    }
                }
            }

            if (available) {
                const current_phase = this.phases.peek();
                let phase_duration = current_phase.end_at - this.last_phase_end_at;
                let mapped_ratio = (ratio - this.last_phase_end_at) * (1 / phase_duration);
                mapped_ratio = math.clamp(mapped_ratio, 0, 1);

                if (current_phase.moving) {
                    const temp = new Vec3(); // @optimize
                    Vec3.lerp(temp, current_phase.start_point, current_phase.end_point, mapped_ratio);
                    entity.visually_move_to(temp);
                }

                if (current_phase.rotating) {
                    const temp = new Quat(); // @optimize
                    Quat.lerp(temp, current_phase.start_ratation, current_phase.end_rotation, mapped_ratio);
                    entity.visually_rotate_to(temp);
                }
            }

        }

        { // Send it's messages
            for (let m of this.messages.values()) {
                if (ratio >= m.at) {
                    m.send_message();
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
