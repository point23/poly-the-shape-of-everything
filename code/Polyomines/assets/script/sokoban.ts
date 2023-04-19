import { Quat, Vec3, math } from "cc";
import { String_Builder, same_position, Const, Direction, $$, vec_add, vec_sub, array_remove } from "./Const";
import { Entity_Manager } from "./Entity_Manager";
import { Gameplay_Timer, gameplay_time, time_to_string } from "./Gameplay_Timer";
import {
    Game_Entity,
    calcu_entity_future_position,
    same_direction,
    Entity_Type,
    calcu_target_direction,
    collinear_direction,
    clacu_reversed_direction,
    locate_entities_in_target_direction,
    Polyomino_Type,
    reversed_direction,
    get_tram_info,
    set_tram_info,
    note_entity_is_falling,
    note_entity_is_not_falling,
} from "./Game_Entity";
import { Transaction_Control_Flags, Transaction_Manager } from "./Transaction_Manager";
import { Interpolation_Phase, Visual_Interpolation } from "./interpolation";
import { undo_end_frame } from "./undo";
import { debug_print_quad_tree } from "./Proximity_Grid";
import { animate } from "./Character_Data";
import { play_sfx, random_sfx } from "./Audio_Manager";

export enum Move_Type {
    CONTROLLER_PROC,
    PUSH,
    SUPPORT,
    FALLING,
    TRAM,
}

enum Move_Piorities {
    SUPPORT = 1,

    FALLING = 2,

    PUSHED = 3,

    CONTROLLER_PROC = 4,

    TRAM = 8,
}

export enum Move_Flags {
    ROTATED = 1 << 0,
    MOVED = 1 << 1,
    DEFERRED = 1 << 2,
}

class Move_Info {
    move_type: Move_Type = 0;

    source_entity_id: number = null;
    target_entity_id: number = null;

    start_position: Vec3 = null;
    end_position: Vec3 = null;

    start_direction: Direction = 0;
    end_direction: Direction = 0;
    reaction_direction: Direction = 0;

    public constructor() { }
}

// @Temporary Naming!!!
enum Move_Completion_Flags {
    FALLING = 1 << 0,
}

export class Single_Move {
    static serial_idx = 1;
    static get next_id(): number { return Single_Move.serial_idx++ };

    id: number;
    info: Move_Info;
    flags: number;
    piority: number = 0;

    start_visual_position?: Vec3;
    end_visual_position?: Vec3;

    get start_visual_rotation(): Quat {
        return Const.DIRECTION2QUAT[this.start_direction];
    }
    get end_visual_rotation(): Quat {
        return Const.DIRECTION2QUAT[this.end_direction];
    }

    get is_deferred(): boolean { return (this.flags & Move_Flags.DEFERRED) != 0; } // @ImplementMe
    get source_entity_id(): number { return this.info.source_entity_id; }
    get target_entity_id(): number { return this.info.target_entity_id; }
    get start_position(): Vec3 { return this.info.start_position; }
    get end_position(): Vec3 { return this.info.end_position; }
    get start_direction(): Direction { return this.info.start_direction; }
    get end_direction(): Direction { return this.info.end_direction; }
    get reaction_direction(): Direction { return this.info.reaction_direction; }

    public constructor(move_info: Move_Info) {
        this.id = Single_Move.next_id;
        this.flags = 0;
        this.info = move_info;
    }

    #executed: boolean = false;
    execute_in_preorder(transaction: Move_Transaction) {
        if (!transaction.moves.has(this.target_entity_id)) return; // @Temporary

        if (this.#executed) return;
        this.#executed = true;

        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        const children = transaction.arcs.get(entity.id);
        children?.forEach((it) => it.execute_in_preorder(transaction));
        this.execute(transaction);
    }

    complete_in_postorder(transaction: Move_Transaction): number {
        if (!transaction.moves.has(this.target_entity_id)) return; // @Temporary
        let flag = 0;

        flag |= this.complete(transaction);

        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        const children = transaction.arcs.get(entity.id);
        children?.forEach((it) => { flag |= it.complete_in_postorder(transaction) });
        return flag;
    }

    enact(transaction: Move_Transaction): boolean { return false; }
    update(transaction: Move_Transaction, ratio: number) { }
    execute(transaction: Move_Transaction) { }
    complete(transaction: Move_Transaction): number { return 0; }

    debug_info(): string { return ''; }
}

export class Move_Transaction {
    static serial_idx = 1;
    static get next_id(): number { return Move_Transaction.serial_idx++ };

    id: number;
    entity_manager: Entity_Manager;

    piority: number = 0;

    issue_time: gameplay_time = null;
    commit_time: gameplay_time = null;

    closed: boolean = false;
    duration: number = 0; // How many rounds this transaction ganna take.
    elapsed: number = 0;  // How many rounds this transaction been through.

    moves: Map<number, Single_Move> = new Map(); // entity_id => running move
    arcs: Map<number, Single_Move[]> = new Map();  // move_id   => child move
    #array_moves: Single_Move[] = [];

    get all_moves(): Single_Move[] {
        if (this.#array_moves.length == 0) {
            for (let m of this.moves.values()) {
                this.#array_moves.push(m);
            }
        }
        return this.#array_moves;
    }

    get sorted_moves(): Single_Move[] {
        return this.all_moves.sort((a, b) => b.piority - a.piority);
    }

    constructor(entity_manager: Entity_Manager, duration: number = 1) {
        this.id = Move_Transaction.next_id;
        this.entity_manager = entity_manager;
        this.duration = duration;
        this.elapsed = 0;
        this.issue_time = Gameplay_Timer.get_gameplay_time();
    }

    update_single_moves() {
        this.elapsed += 1;
        const ratio = math.clamp01((this.elapsed / this.duration));
        for (let move of this.sorted_moves) {
            move.update(this, ratio);
        }

        this.closed = (this.elapsed >= this.duration);
    }

    add_move(move: Single_Move) {
        // @Note There're some side effect inside this function! We add an arc from parent move to child move implicitly. 
        this.moves.set(move.target_entity_id, move);
        this.add_arc(move);
        this.piority += move.piority;
    }

    remove_move(move: Single_Move) {
        const t = this;

        this.moves.delete(move.target_entity_id);
        let arcs = this.arcs.get(move.target_entity_id);
        if (arcs) arcs.forEach((it) => t.remove_move(it));

        this.remove_arc(move);
        this.piority -= move.piority;
    }

    remove_arc(move: Single_Move) {
        if (move.source_entity_id == null) return;

        let arcs = this.arcs.get(move.source_entity_id);
        if (arcs == null) return;

        array_remove(arcs, move);
        this.arcs.set(move.source_entity_id, arcs);
    }

    add_arc(move: Single_Move) {
        if (move.source_entity_id == null) return;

        let arcs = this.arcs.get(move.source_entity_id);
        if (arcs == null) arcs = [];

        arcs.push(move);
        this.arcs.set(move.source_entity_id, arcs);
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('Transaction#').append(this.id);
        builder.append(' issued at ').append(time_to_string(this.issue_time));
        builder.append(' commited at ').append(time_to_string(this.commit_time));
        builder.append('\n');
        for (let move of this.all_moves) {
            builder.append('\t- ').append(move.debug_info()).append('\n');
        }
        return builder.to_string();
    }
}

/*
export class Possess_Move extends Single_Move {
    public constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.source_entity_id = entity.id;
        move_info.start_position = entity.position;
        move_info.start_direction = entity.orientation;
        move_info.end_direction = entity.orientation;
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        // const manager = transaction.entity_manager;

        // let e_source = manager.find(this.move_info.source_entity_id);
        // const direction = this.end_dir;

        // for (let step = 1, succeed = false; !succeed; step += 1) {
        //     const futrue_pos = e_source.calcu_future_pos(direction, step);

        //     if (!Game_Board.instance.verfify_pos(futrue_pos)) {
        //         return false;
        //     }

        //     const other = Entity_Manager.instance.locate_entity(futrue_pos);
        //     if (other != null) {
        //         this.move_info.target_entity_id = other.entity_id;
        //         succeed = true;
        //     }
        // }

        // transaction.add_move(this);
        // return true;

        return false; // @Hack
    }

    update() {
        // Entity_Manager.instance.reclaim(this.source_entity);
        // this.target_entity.entity_type = Entity_Type.AVATAR;
        // Entity_Manager.instance.current_character = this.target_entity;
    }
}
*/

export class Player_Move extends Single_Move {

    public constructor(entity: Game_Entity, direction: Direction, step: number = 1) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.CONTROLLER_PROC;
        move_info.target_entity_id = entity.id;

        move_info.start_direction = entity.orientation;
        move_info.end_direction = direction;

        move_info.start_position = entity.position;
        move_info.end_position = calcu_entity_future_position(entity, direction, step);
        super(move_info);

        this.piority = Move_Piorities.CONTROLLER_PROC;
    }

    enact(transaction: Move_Transaction): boolean {
        function maybe_rotate(move: Single_Move): boolean {
            // @Note Face towards target direction first if it's not currently oriented to that direction.
            if (same_direction(d_start, d_end)) return false;
            // @Incomplete Need some turn-left, turn-right animation?

            set_dirty(move, Move_Flags.ROTATED);
            if (entity.entity_type != Entity_Type.AVATAR) {
            } else {
                // @ImplementMe  Avators would only rotate it's indicator

            }

            return true;
        }
        //#SCOPE

        // @Note DO NOT COMMENT THIS !!!
        //  Yes we do not want that *blocked* feeling, but things went wrong when we allow multiply controller_proc_move
        //  in a single transaction.
        if (already_exist_one(Transaction_Control_Flags.CONTROLLER_MOVE)) return false;

        const manager = transaction.entity_manager;
        const entity = manager.find(this.info.target_entity_id);

        const d_start = this.start_direction;
        const d_end = this.end_direction;

        const p_start = this.start_position;
        const p_end = this.end_position;

        if (entity.is_falling) return false; // @Temporary?
        entity.interpolation?.destroy(); // @Temporary?

        this.start_visual_position = manager.proximity_grid.local2world(p_start);
        this.end_visual_position = manager.proximity_grid.local2world(p_end);

        const at_least_rotated = maybe_rotate(this);
        transaction.add_move(this);

        if (same_position(p_start, p_end)
            || blocked_by_barrier_in_current_squares(manager, entity, d_end)
            || blocked_by_barrier_in_target_squares(manager, entity, d_end)
            || !manager.proximity_grid.verify_pos(p_end)
            || no_supporter(manager, p_end)) {
            // @Note Several reasons that we can not move...

            if (at_least_rotated) {
                this.info.end_position = this.info.start_position; // @Hack Maybe detect this by flags?
                move_supportees(transaction, entity, this);
            }

            return at_least_rotated;
        }

        const push_res = try_push_others(entity, d_end, transaction);
        if (push_res.pushed && !push_res.push_succeed) return at_least_rotated;

        move_supportees(transaction, entity, this);

        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    execute(transaction: Move_Transaction): void {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        if (is_dirty(this.flags, Move_Flags.MOVED))
            manager.logically_move_entity(entity, this.end_position);
        if (is_dirty(this.flags, Move_Flags.ROTATED)) {
            entity.logically_rotate_to(this.end_direction);
            entity.visually_face_towards(this.end_direction); // @Hack We are not good at lerping quats, ignore this for now...?
        }
    }

    complete(transaction: Move_Transaction): number {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        const fall_res = possible_falling(entity);
        animate(entity, "run");

        if (!fall_res.fell) {
            play_sfx("step");
            { // @Note Check possible win
                if (manager.pending_win) return;
                if (!is_dirty(this.flags, Move_Flags.MOVED)) return;

                let possible_win = false;
                for (let s of manager.locate_current_supporters(entity)) {
                    if (s.entity_type == Entity_Type.CHECKPOINT) possible_win = true;
                }

                if (possible_win) {
                    animate(entity, "win");
                    play_sfx("win?");
                }
            }
            return 0;
        }

        return Move_Completion_Flags.FALLING;
    }

    update(transaction: Move_Transaction, ratio: number) { // @Note The ratio param should been clamped by caller.'
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (ratio >= 0.5) {
            this.execute_in_preorder(transaction);
        }

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this.flags, Move_Flags.ROTATED)) {
                // const r_start = entity.visual_rotation;
                // const r_end = new Quat();
                // Quat.lerp(r_end, this.start_visual_rotation, this.end_visual_rotation, ratio);
                // const p_0 = Interpolation_Phase.rotation(0.2, r_start, r_end); // @ImplementMe We are not good at lerping quats, ignore this for now...?
                // phases.push(p_0)
            }

            if (is_dirty(this.flags, Move_Flags.MOVED)) {
                const p_start = entity.visual_position;
                const p_end = new Vec3();
                Vec3.lerp(p_end, this.start_visual_position, this.end_visual_position, ratio);
                const p_1 = Interpolation_Phase.movement(1, p_start, p_end);
                phases.push(p_1);
            }

            const t_start = Gameplay_Timer.get_gameplay_time();
            const t_end = Gameplay_Timer.get_gameplay_time(1);
            const v = new Visual_Interpolation(this, entity, t_start, t_end, phases);
            // Set on_complete event?
        }

        if (ratio == 1) {
            const f = this.complete_in_postorder(transaction);
            if (is_dirty(f, Move_Completion_Flags.FALLING)) {
                $$.SHOULD_DO_UNDO_AT += Const.FALLING_MOVE_DURATION;
            }
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('PLAYER#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_movement(builder, this);
        maybe_log_rotation(builder, this);
        return builder.to_string();
    }
}

class Support_Move extends Single_Move {
    constructor(supportor: Game_Entity, supportee: Game_Entity, direction_delta: number, position_delta: Vec3, direction: Direction) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.SUPPORT;
        move_info.source_entity_id = supportor.id;
        move_info.target_entity_id = supportee.id;

        move_info.start_direction = supportee.orientation;
        move_info.end_direction = calcu_target_direction(supportee.orientation, direction_delta);
        move_info.reaction_direction = direction;

        move_info.start_position = supportee.position;
        move_info.end_position = vec_add(move_info.start_position, position_delta);

        super(move_info);
        this.piority = Move_Piorities.SUPPORT;
    }

    enact(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.info.target_entity_id);

        const p_start = this.start_position;
        const p_end = this.end_position;

        const d = this.reaction_direction;

        if (d != Direction.DOWN && d != Direction.UP)
            if (blocked_by_barrier_in_current_squares(manager, entity, d)
                || blocked_by_barrier_in_target_squares(manager, entity, d)
                || no_supporter(manager, p_end)
                || !can_pass_through(transaction, manager, entity, d)) {

                this.info.end_position = this.start_position; // @Note Stay still?
            }

        if (d == Direction.DOWN) {
            note_entity_is_falling(entity);
        }

        move_supportees(transaction, entity, this);

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);

        if (!same_direction(this.start_direction, this.end_direction))
            set_dirty(this, Move_Flags.ROTATED);

        this.start_visual_position = manager.proximity_grid.local2world(p_start);
        this.end_visual_position = manager.proximity_grid.local2world(p_end);

        transaction.add_move(this);
        return true;
    }

    execute(transaction: Move_Transaction): void {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this.flags, Move_Flags.MOVED)) {
            manager.logically_move_entity(entity, this.end_position);
        }

        if (is_dirty(this.flags, Move_Flags.ROTATED)) {
            entity.logically_rotate_to(this.end_direction);
            entity.visually_face_towards(this.end_direction); // @Hack We are not good at lerping quats, ignore this for now...?
        }
    }

    complete(transaction: Move_Transaction): number {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        const d = this.reaction_direction;
        if (d == Direction.DOWN) {
            note_entity_is_not_falling(entity);
        }

        const fall_res = possible_falling(entity);
        if (fall_res.fell && fall_res.fall_succeed) return Move_Completion_Flags.FALLING;
        return 0;
    }

    update(transaction: Move_Transaction, ratio: number) {
        const manager = transaction.entity_manager;
        const supporter = manager.find(this.source_entity_id);
        const entity = manager.find(this.target_entity_id);

        { // Start visual interpolation stuff
            const phases: Interpolation_Phase[] = [];

            if (is_dirty(this.flags, Move_Flags.ROTATED)) {
                // const r_start = entity.visual_rotation;
                // const r_end = new Quat();
                // Quat.lerp(r_end, this.start_visual_rotation, this.end_visual_rotation, ratio);
                // const p_0 = Interpolation_Phase.rotation(0.2, r_start, r_end); // @ImplementMe We are not good at lerping quats, ignore this for now...?
                // phases.push(p_0)
            }

            if (is_dirty(this.flags, Move_Flags.MOVED)) {
                const p_start = entity.visual_position;
                const p_end = new Vec3();
                Vec3.lerp(p_end, this.start_visual_position, this.end_visual_position, ratio);
                const p_1 = Interpolation_Phase.movement(1, p_start, p_end);
                phases.push(p_1);
            }

            const t_start = supporter.interpolation.start_at;
            const t_end = supporter.interpolation.end_at;
            const v = new Visual_Interpolation(this, entity, t_start, t_end, phases, supporter.interpolation);
            // Set on_complete event?
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('SUPPORT#').append(this.id);
        log_target_entity(builder, this);
        builder.append('\n-   supporter#').append(this.info.source_entity_id);
        maybe_log_rotation(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

class Push_Move extends Single_Move {
    public constructor(mover: Game_Entity, entity: Game_Entity, direction: Direction, step: number = 1) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.PUSH;
        move_info.source_entity_id = mover.id;
        move_info.target_entity_id = entity.id;
        move_info.start_position = entity.position;
        move_info.reaction_direction = direction;
        move_info.end_position = calcu_entity_future_position(entity, direction, step);
        super(move_info);

        this.piority = Move_Piorities.PUSHED;
    }

    enact(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const mover = manager.find(this.info.source_entity_id);
        const entity = manager.find(this.info.target_entity_id); // The entity being pused.
        const direction = this.reaction_direction;

        if (!can_push(mover, entity)
            || blocked_by_barrier_in_target_squares(manager, entity, direction)
            || blocked_by_barrier_in_current_squares(manager, entity, direction)
            || !can_pass_through(transaction, manager, entity, direction)
            || no_supporter(manager, this.end_position)) {
            // @ImplementMe Maybe we should extract this condition checks?

            return false;
        }

        move_supportees(transaction, entity, this);

        this.start_visual_position = manager.proximity_grid.local2world(this.start_position);
        this.end_visual_position = manager.proximity_grid.local2world(this.end_position);

        transaction.add_move(this);
        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    execute(transaction: Move_Transaction): void {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this.flags, Move_Flags.MOVED))
            manager.logically_move_entity(entity, this.end_position);
        if (is_dirty(this.flags, Move_Flags.ROTATED)) {
            entity.logically_rotate_to(this.end_direction);
            entity.visually_face_towards(this.end_direction); // @Hack We are not good at lerping quats, ignore this for now...?
        }

        random_sfx("push");
    }

    complete(transaction: Move_Transaction): number {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        const mover = manager.find(this.source_entity_id);
        animate(mover, "push");

        const fall_res = possible_falling(entity);
        if (fall_res.fell && fall_res.fall_succeed) {
            return Move_Completion_Flags.FALLING;
        }
        return 0;
    }

    update(transaction: Move_Transaction, ratio: number) {
        const manager = transaction.entity_manager;
        const mover = manager.find(this.source_entity_id);
        const entity = manager.find(this.target_entity_id);

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this.flags, Move_Flags.MOVED)) {
                const p_start = entity.visual_position;
                const p_end = new Vec3();
                Vec3.lerp(p_end, this.start_visual_position, this.end_visual_position, ratio);
                const p_0 = Interpolation_Phase.movement(1, p_start, p_end);
                phases.push(p_0);
            }

            const t_start = mover.interpolation.start_at;
            const t_end = mover.interpolation.end_at;
            const v = new Visual_Interpolation(this, entity, t_start, t_end, phases);
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('PUSH#').append(this.id);
        log_target_entity(builder, this);
        builder.append('\n-   mover#').append(this.info.source_entity_id);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

class Falling_Move extends Single_Move {
    constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.FALLING;
        move_info.target_entity_id = entity.id;
        move_info.start_direction = move_info.end_direction = Direction.DOWN;
        move_info.start_position = entity.position;
        super(move_info);

        this.piority = Move_Piorities.FALLING;
    }

    enact(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        this.info.end_position = resolve_new_landing_point(manager, entity);
        // const p_delta = new Vec3(this.end_position).subtract(this.start_position);
        // const supportees = manager.locate_current_supportees(entity);

        move_supportees(transaction, entity, this);

        this.start_visual_position = manager.proximity_grid.local2world(this.start_position);
        this.end_visual_position = manager.proximity_grid.local2world(this.end_position);

        note_entity_is_falling(entity);
        set_dirty(this, Move_Flags.MOVED);
        transaction.add_move(this);
        return true;
    }

    execute(transaction: Move_Transaction): void {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this.flags, Move_Flags.MOVED))
            manager.logically_move_entity(entity, this.end_position);
        if (is_dirty(this.flags, Move_Flags.ROTATED)) {
            entity.logically_rotate_to(this.end_direction);
            entity.visually_face_towards(this.end_direction); // @Hack We are not good at lerping quats, ignore this for now...?
        }

        random_sfx("drop");
        note_entity_is_not_falling(entity);
    }

    complete(transaction: Move_Transaction): number {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        animate(entity, "fall");
        return 0;
    }

    update(transaction: Move_Transaction, ratio: number) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        // @ImplementMe Handle if we get a new supporter middle way.

        if (ratio >= 0.5) {
            this.execute_in_preorder(transaction);
        }

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this.flags, Move_Flags.MOVED)) {
                const p_start = entity.visual_position;
                const p_end = new Vec3();
                Vec3.lerp(p_end, this.start_visual_position, this.end_visual_position, ratio);
                const p_0 = Interpolation_Phase.movement(1, p_start, p_end);
                phases.push(p_0);
            }

            const t_start = Gameplay_Timer.get_gameplay_time();
            const t_end = Gameplay_Timer.get_gameplay_time(1);
            const v = new Visual_Interpolation(this, entity, t_start, t_end, phases);

            // Set on_complete event?
        }

        if (ratio == 1) {
            this.complete_in_postorder(transaction);
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('FALLING#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

// @Fixme Now we decide to name it as TRAM!
class Tram_Move extends Single_Move {
    public constructor(tram: Game_Entity) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.TRAM;
        move_info.target_entity_id = tram.id;
        move_info.start_direction = move_info.end_direction = tram.orientation;
        move_info.start_position = move_info.end_position = tram.position;
        super(move_info);

        this.piority = Move_Piorities.TRAM;
    }

    enact(transaction: Move_Transaction): boolean {
        function locate_track_ahead(r: Game_Entity, d: Direction): Game_Entity {
            const supporters = manager.locate_future_supporters(r, d);
            for (let supporter of supporters) {
                if (supporter.entity_type == Entity_Type.TRACK) {
                    if (collinear_direction(supporter.rotation, tram.orientation)) {
                        return supporter;
                    }
                }
            }
            return null;
        }
        //#SCOPE

        const manager = transaction.entity_manager;
        const tram = manager.find(this.info.target_entity_id);

        let direction = tram.orientation;
        let turned_around: boolean = false;
        let stucked: boolean = false;

        transaction.add_move(this);

        let track = locate_track_ahead(tram, direction); // @Note There might be some conflicts since the track might be moving?
        if (track == null) { // There's no way ahead, we need to turn around
            turned_around = true;
        } else {
            if (collinear_direction(track.rotation, tram.orientation)) {
                const push_res = try_push_others(tram, direction, transaction);
                turned_around = push_res.pushed && !push_res.push_succeed;
            } else {
                // @ImplementMe Turning is a problem for now, we don't even have a suitable model...
            }
        }

        if (turned_around) {
            direction = clacu_reversed_direction(tram.orientation);
            let track = locate_track_ahead(tram, direction);

            if (track == null) {
                stucked = true;
            } else {
                if (collinear_direction(track.rotation, tram.orientation)) {
                    const push_res = try_push_others(tram, direction, transaction);
                    stucked = push_res.pushed && !push_res.push_succeed;
                } else {
                    // @ImplementMe Turning is a problem for now, we don't even have a suitable model...
                }
            }
        }

        if (stucked) {
            transaction.remove_move(this);
            return false;
        }

        this.info.end_direction = direction;
        this.info.end_position = calcu_entity_future_position(tram, this.end_direction);

        this.start_visual_position = manager.proximity_grid.local2world(this.start_position);
        this.end_visual_position = manager.proximity_grid.local2world(this.end_position);

        move_supportees(transaction, tram, this);

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);
        if (this.start_direction != this.end_direction)
            set_dirty(this, Move_Flags.ROTATED);

        return true;
    }

    execute(transaction: Move_Transaction): void {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        if (is_dirty(this.flags, Move_Flags.MOVED))
            manager.logically_move_entity(entity, this.end_position);
        if (is_dirty(this.flags, Move_Flags.ROTATED)) {
            entity.logically_rotate_to(this.end_direction);
            // @Note Rover doesn't visually rotate
        }
    }

    complete(transaction: Move_Transaction): number {
        // const manager = transaction.entity_manager;
        // const entity = manager.find(this.target_entity_id);
        return 0;
    }

    update(transaction: Move_Transaction, ratio: number) { // @Note The ratio param should been clamped by caller.'
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (ratio >= 0.5) {
            this.execute_in_preorder(transaction);
        }

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this.flags, Move_Flags.ROTATED)) {
                // const r_start = entity.visual_rotation;
                // const r_end = new Quat();
                // Quat.lerp(r_end, this.start_visual_rotation, this.end_visual_rotation, ratio);
                // const p_0 = Interpolation_Phase.rotation(0.2, r_start, r_end); // @ImplementMe We are not good at lerping quats, ignore this for now...?
                // phases.push(p_0)
            }

            if (is_dirty(this.flags, Move_Flags.MOVED)) {
                const p_start = entity.visual_position;
                const p_end = new Vec3();
                Vec3.lerp(p_end, this.start_visual_position, this.end_visual_position, ratio);
                const p_1 = Interpolation_Phase.movement(1, p_start, p_end);
                phases.push(p_1);
            }

            const t_start = Gameplay_Timer.get_gameplay_time();
            const t_end = Gameplay_Timer.get_gameplay_time(1);
            const v = new Visual_Interpolation(this, entity, t_start, t_end, phases);
            // Set on_complete event?
        }

        if (ratio == 1) {
            this.complete_in_postorder(transaction);
        }
    }


    debug_info(): string {
        let builder = new String_Builder();
        builder.append('TRAM#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_rotation(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

//#region PUBLIC
export function detect_conflicts(transations: Move_Transaction[]): Set<Move_Transaction> { // @V 1
    // @Fixme We're create some side effects for now...

    const set_rejected = new Set<Move_Transaction>();
    if (transations.length == 0) return set_rejected;

    const manager = transations[0].entity_manager;
    function detect_conflicts_between(t_a: Move_Transaction, t_b: Move_Transaction): Move_Transaction[] {
        for (let m of t_a.all_moves) {
            for (let o of t_b.all_moves) {
                const e_m = manager.find(m.target_entity_id);
                const e_o = manager.find(o.target_entity_id);
                if (same_position(m.end_position, o.end_position)) {
                    console.log(`[Detect Conflicts]: Collide!: ${e_m.id}, ${e_o.id}`);

                    return [t_b];
                }

                if (e_m.entity_type == Entity_Type.TRAM && e_o.entity_type == Entity_Type.TRACK) {
                    if (same_position(m.end_position, new Vec3(o.start_position).add(Vec3.UNIT_Z))) {
                        // { // @Fixme Side effects...
                        //     const info = get_tram_info(e_m);
                        //     info.counter -= 1;
                        //     set_tram_info(e_m, info);
                        // }

                        console.log(`[Detect Conflicts]: Track No Longer Exist!: ${e_m.id}, ${e_o.id}`);
                        return [t_a];
                    }
                }

                if (e_m.id == e_o.id && m.info.move_type == Move_Type.TRAM) {
                    console.log(`[Detect Conflicts]: Moving Tram Can't be Supportee!: ${t_a.id}, ${t_b.id} `);

                    // { // @Fixme Side effects...
                    //     const info = get_tram_info(e_m);
                    //     info.counter -= 1;
                    //     set_tram_info(e_m, info);
                    // }
                    return [t_a];
                    // t_b.remove_move(o); // @Note Since we execute and complete single moves by arcs, we can simply delete that node.
                }
            }
        }

        return [];
    }
    //#SCOPE

    for (let i_checked = 0; i_checked < transations.length; i_checked++) {
        const t = transations[i_checked];
        if (set_rejected.has(t)) continue;

        for (let i_rest = 0; i_rest < transations.length; i_rest++) {
            if (i_rest == i_checked) continue;
            const o = transations[i_rest];
            if (set_rejected.has(o)) continue;

            detect_conflicts_between(t, o).forEach((it) => set_rejected.add(it));

        }
    }
    return set_rejected;
}

/* 
export function detect_conflicts(transaction: Move_Transaction, move: Single_Move) {
    function remove_it() {
        const idx = transaction.all_moves.indexOf(move);
        transaction.all_moves.splice(idx, 1)
    }
 
    function taken_by_incoming_entity_from_same_transaction(pos: Vec3): boolean {
        for (let another_move of transaction.all_moves) {
            if (another_move.target_entity_id == target.id) continue;
            if (another_move.id == move.id) continue;
            if (!is_dirty(another_move.flags, Move_Flags.MOVED)) continue;
 
            if (same_position(another_move.end_position, pos)) return true;
        }
 
        return false;
    }
 
    function exist_in_another_move(another: Game_Entity): boolean {
        for (let another_move of transaction.all_moves) {
            if (another_move.id == move.id) continue;
 
            if (another_move.target_entity_id == another.id
                && is_dirty(another_move.flags, Move_Flags.MOVED))
                return true;
        }
        return false;
    }
 
    function target_square_is_taken_by_entity_from_superior_transaction(): { is_taken: boolean, taken_by: Game_Entity } {
        const res = {
            is_taken: false,
            taken_by: null,
        };
 
        const others = manager.locate_entities(move.end_position);
        for (let other of others) {
            if (other.id == target.id) continue;
            if (exist_in_another_move(other)) continue;
            if (other.entity_type == Entity_Type.GATE || is_a_board_like_entity(other)) continue;
 
            res.is_taken = true;
            res.taken_by = other;
            return res;
        }
 
        return res;
    }
 
    function supporter_no_longer_exist() {
        const possible_supporters = manager.locate_supporters(move.end_position, 1);
        let at_least_one_supporter: boolean = false;
        for (let supporter of possible_supporters) {
            if (exist_in_another_move(supporter)) continue;
 
            at_least_one_supporter = true;
            break;
        }
 
        return !at_least_one_supporter;
    }
 
    function settle_new_landing_point(p: Vec3) {
        console.log(`SANITY CHECK: NEW SUPPORTER, target: ${ target.id }, landed: ${ p.toString() } `);
        move.info.end_position = p;
    }
 
    function resolve_new_landing_point(): { succeed: boolean, pos: Vec3 } {
        const res = {
            succeed: false,
            pos: null,
        };
 
        let drop_point = new Vec3(target.position);
        const direction = move.end_direction;
        if (direction != Direction.DOWN) {
            drop_point = calcu_entity_future_position(target, direction);
        }
        const max_depth = 10; // @Hack
        let supporters = [];
 
        const p = new Vec3(drop_point);
        for (let depth = 1; depth <= max_depth; depth++) {
            p.z -= 1;
            if (taken_by_incoming_entity_from_same_transaction(p)) {
                res.succeed = true;
                p.z += 1;
                res.pos = p;
 
                console.log(`SANITY CHECK: INCOMING_ENTITY depth: ${ depth }, pos: ${ p.toString() } `);
                return res;
            }
 
            supporters = manager.locate_supporters(drop_point, depth);
            for (let supporter of supporters) {
                if (exist_in_another_move(supporter)) continue;
 
                res.succeed = true;
                p.z += 1;
                res.pos = p;
                return res;
            }
        }
 
        return res;
    }
    //#SCOPE
 
    if (!is_dirty(move.flags, Move_Flags.MOVED)) return true;
    const manager = transaction.entity_manager;
    const target = manager.find(move.target_entity_id);
 
    if (move.info.move_type == Move_Type.FALLING) {
        const possible_taken = target_square_is_taken_by_entity_from_superior_transaction()
        if (possible_taken.is_taken || supporter_no_longer_exist()) {
            const resolved = resolve_new_landing_point();
            if (!resolved.succeed) {
                return false;
            }
 
            settle_new_landing_point(resolved.pos);
        }
        return true;
    }
 
    if (move.info.move_type != Move_Type.SUPPORT) {
        // It's only a rotate move
        if (!is_dirty(move.flags, Move_Flags.MOVED)) return true;
 
        if (supporter_no_longer_exist()) {
            console.log(`SANITY CHECK: NO SUPPORTER, target: ${ target.id }, move: ${ move.info.move_type } `);
 
            if (move.info.move_type == Move_Type.ROVER) {
                const slap_it = new Tram_Move(target);
                slap_it.enact(transaction);
            } else {
                let direction = 0;
                if (move.info.move_type == Move_Type.PUSH) {
                    // @Fixme Don't pay attention to this kinda of special cases...
 
                    direction = move.reaction_direction;
                } else {
                    direction = move.end_direction;
                }
 
                possible_falling(target); // @Hack
            }
 
            remove_it();
            return true;
        }
    }
 
    const possible_taken = target_square_is_taken_by_entity_from_superior_transaction();
    if (possible_taken.is_taken) {
        if (move.info.move_type == Move_Type.SUPPORT) {
            if (supporter_no_longer_exist()) {
                move.info.end_direction = Direction.DOWN;
                const resolved = resolve_new_landing_point();
                if (!resolved.succeed) {
                    return false;
                }
 
                settle_new_landing_point(resolved.pos);
                return true;
            }
        }
 
        return false;
    }
    return true;
}
 */
export function maybe_move_trams(transaction_manager: Transaction_Manager) {
    const entity_manager = transaction_manager.entity_manager;

    if (entity_manager.pending_win) return;
    if (!entity_manager.switch_turned_on) return;

    let at_least_one: boolean = false;
    for (let tram of entity_manager.trams) {
        const info = get_tram_info(tram);

        let failed_to_move = false;
        if (info.counter == info.freq - 1) {
            const tram_move = new Tram_Move(tram);
            if (transaction_manager.new_transaction(tram_move, 1)) {
                at_least_one = true;
            } else {
                failed_to_move = true;
            }
        }

        if (!failed_to_move) info.counter = (info.counter + 1) % info.freq;
        set_tram_info(tram, info);
    }

    if (at_least_one) {
        play_sfx("tram");
    }
}

export function generate_player_move(transaction_manager: Transaction_Manager, entity_manager: Entity_Manager, direction: Direction, step: number = 1) {
    const hero = entity_manager.active_hero;
    if (transaction_manager.new_transaction(new Player_Move(hero, direction, step), Const.PLAYER_MOVE_DURATION)) {
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = true;
        $$.SHOULD_DO_UNDO_AT = Gameplay_Timer.get_gameplay_time().round + Const.PLAYER_MOVE_DURATION;
        animate(entity_manager.active_hero, "run");

        // console.log(time_to_string(Gameplay_Timer.get_gameplay_time()));

        // Update transaction control flags
        transaction_manager.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;
    }
}

export function is_a_board_like_entity(e: Game_Entity): boolean {
    switch (e.entity_type) {
        case Entity_Type.TRACK:
        case Entity_Type.BRIDGE:
        case Entity_Type.ENTRANCE:
        case Entity_Type.SWITCH:
            return true;
    }

    return false;
}
//#endregion PUBLIC

//#region PRIVATE
function possible_falling(e: Game_Entity): { fell: boolean, fall_succeed: boolean } {  // @V 0
    const res = {
        fell: false,
        fall_succeed: false,
    };

    const manager = Entity_Manager.current;
    const supporters = manager.locate_current_available_supporters(e);

    if (supporters.length == 0) {
        const falling = new Falling_Move(e);

        if (Transaction_Manager.instance.new_transaction(falling)) {
            res.fall_succeed = true;
        } else {
            res.fall_succeed = false;
        }
    }

    return res;
}

function can_push(e_source: Game_Entity, e_target: Game_Entity): boolean { // @V 0
    if (e_target.entity_type == Entity_Type.STATIC
        || e_target.entity_type == Entity_Type.CHECKPOINT
        || e_target.entity_type == Entity_Type.SWITCH
        || e_target.entity_type == Entity_Type.TRACK)
        return false;

    if (e_source.entity_type != Entity_Type.TRAM
        && e_target.entity_type == Entity_Type.TRAM)
        return false;
    return true;
}

function try_push_others(mover: Game_Entity, direction: Direction, transaction: Move_Transaction): { pushed: boolean, push_succeed: boolean } {  // @V 0
    const res = { pushed: false, push_succeed: true };
    const manager = transaction.entity_manager;

    for (let other of locate_entities_in_target_direction(manager, mover, direction)) {
        if (other == null) continue;
        if (other.id == mover.id) continue;
        // if (other.interpolation) continue; // @Note That's an important bug!!!
        if (is_a_board_like_entity(other)) continue;

        if (other.entity_type == Entity_Type.GATE) {
            const gate = other;
            const p = calcu_entity_future_position(mover, direction);

            if (!same_position(gate.position, p)
                || mover.polyomino_type != Polyomino_Type.MONOMINO) {
                res.pushed = true;
                res.push_succeed = false;
            }

            continue;
        }

        res.pushed = true;
        const push = new Push_Move(mover, other, direction);
        if (!push.enact(transaction)) {
            res.push_succeed = false;
        } else {
            other.interpolation?.destroy(); // @Note Just drop it?
        }
        break;
    }

    return res;
}

function move_supportees(transaction: Move_Transaction, supporter: Game_Entity, parent_move: Single_Move) { // @V 0
    function has_other_supporter(e: Game_Entity): boolean {
        const supporters = manager.locate_current_available_supporters(e);
        for (let s of supporters) {
            if (s.id != supporter.id) return true;
        }
        return false;
    }

    const manager = transaction.entity_manager;
    for (let supportee of manager.locate_current_supportees(supporter)) {
        if (supportee.id == supporter.id) continue;
        if (has_other_supporter(supportee)) continue;
        /*  if (Transaction_Manager.instance.unenacted_moves.has(supportee.id)) {
             // @Note Do not move those that're already moving.
             continue;
         } */

        let d = parent_move.end_direction;
        { // @Hack
            if (parent_move.info.move_type == Move_Type.SUPPORT
                || parent_move.info.move_type == Move_Type.PUSH) {
                d = parent_move.reaction_direction;
            }
        }

        let d_delta = parent_move.end_direction - parent_move.start_direction;
        if (supporter.entity_type == Entity_Type.TRAM) d_delta = 0;
        const p_delta = vec_sub(parent_move.end_position, parent_move.start_position);

        const support = new Support_Move(supporter, supportee, d_delta, p_delta, d);
        support.piority = downgrade_piority(parent_move);

        support.enact(transaction);
    }
}

function blocked_by_barrier_in_current_squares(m: Entity_Manager, e: Game_Entity, d: Direction) {  // @V 0
    for (let other of m.locate_current_supporters(e)) {
        // if (other.entity_type == Entity_Type.BRIDGE) {
        //     // @Note Can't get off the bridge halfway
        //     // |  ↑  |
        //     // |<-x->| 
        //     // |  ↓  |
        //     const bridge = other;
        //     if (orthogonal_direction(bridge.orientation, d)) {
        //         return true;
        //     }
        // };

        if (other.entity_type == Entity_Type.FENCE) {
            // @Note Can't pass through when there's a fence on the future square
            // _______
            // |      ||
            // | -x-> ||
            // |______||
            const fence = other;
            if (same_direction(fence.rotation, d)) {
                return true;
            }
        }
    }
    return false;
}

function blocked_by_barrier_in_target_squares(m: Entity_Manager, e: Game_Entity, d: Direction): boolean {  // @V 0
    for (let supporter of m.locate_future_supporters(e, d)) {
        // @Note Ignored it in new version
        // if (supporter.entity_type == Entity_Type.BRIDGE) {
        //     // @Note Can't walk on the bridge halfway.
        //     // |  ↑  |
        //     // |     | <-x-
        //     // |  ↓  |
        //     const bridge = supporter;
        //     if (orthogonal_direction(bridge.rotation, d)) {
        //         return true;
        //     }
        // };

        if (supporter.entity_type == Entity_Type.FENCE) {
            // @Note Can't pass through when there's a fence on the future square
            // _______
            // |      ||
            // |      || <-x-
            // |______||
            //       Hit the fence.
            const fence = supporter;
            if (reversed_direction(fence.rotation, d)) {
                return true;
            }
        }
    }
    return false;
}

function no_supporter(m: Entity_Manager, p: Vec3): boolean {  // @V 1.1
    const max_depth = 10; // @Incomplete Maybe we should treat plane Z=0 as the ground?
    for (let d = 1; d <= max_depth; d++) {
        if (m.locate_availble_supporters(p, d).length != 0) {
            // console.log(`resolved a supporter at ${ d }, from: ${ p } `);
            return false;
        }
    }
    return true;
}

function resolve_new_landing_point(m: Entity_Manager, e: Game_Entity): Vec3 { // @V 1.1
    const p = new Vec3(e.position);
    const max_depth = p.z; // @Note For now we just treat plane Z=0 as GROUND? In order to fix the buge situation. 

    for (let d = 1; d <= max_depth; d++) {
        if (m.locate_availble_supporters(e.position, d).length != 0) {
            // console.log(`resolved a supporter at ${ d }, from: ${ p } `);
            return p;
        }
        p.z -= 1;
    }

    // @Fixme Sth went wrong here
    return p;
}

function can_pass_through(t: Move_Transaction, m: Entity_Manager, e: Game_Entity, d: Direction) { // @V 1
    for (let other of locate_entities_in_target_direction(m, e, d)) {
        if (other == null) continue;
        if (other.id == e.id) continue;
        if (t.moves.has(other.id)) {
            if (is_dirty(t.moves.get(other.id).flags, Move_Flags.MOVED)) {
                continue;
            }
        }

        if (other.entity_type == Entity_Type.BRIDGE) continue;
        if (other.entity_type == Entity_Type.GATE) {
            if (same_position(other.position, e.position)
                && e.polyomino_type == Polyomino_Type.MONOMINO)
                continue;
            else {
                return false;
            }
        }

        // ^ 
        if (is_a_board_like_entity(e) && !is_a_board_like_entity(other)) continue;
        if (!is_a_board_like_entity(e) && is_a_board_like_entity(other)) continue;

        return false;
    }

    return true;
}

function downgrade_piority(p: Single_Move): number {
    return p.piority * Const.SUPPORTEE_PIORITY_DOWNGRADE_FACTOR;
}

// === LOG STUFF ===
function log_target_entity(builder: String_Builder, move: Single_Move) {
    builder.append('\n-   entity#').append(move.info.target_entity_id);
}

function maybe_log_movement(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move.flags, Move_Flags.MOVED)) return;

    builder.append('\n-   movement: from ')
        .append(move.start_position.toString())
        .append(' to ')
        .append(move.end_position.toString());
}

function maybe_log_rotation(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move.flags, Move_Flags.ROTATED)) return;

    builder.append('\n-   rotation: from ')
        .append(Const.DIRECTION_NAMES[move.start_direction])
        .append(' to ')
        .append(Const.DIRECTION_NAMES[move.end_direction]);
}

// === FLAG STUFF ===
export function is_dirty(v: number, f: number): boolean {
    return (v & f) != 0;
}

function set_dirty(move: Single_Move, f: number) {
    move.flags |= f;
}

function already_exist_one(f: number): boolean {
    if (Transaction_Manager.instance.control_flags & f) {
        return true;
    }
    return false;
}
//#endregion PRIVATE