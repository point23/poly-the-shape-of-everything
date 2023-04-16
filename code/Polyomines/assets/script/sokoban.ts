import { Quat, Vec3, math } from "cc";
import { Audio_Manager, Random_Audio_Group } from "./Audio_Manager";
import { String_Builder, same_position, Const, Direction, $$ } from "./Const";
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
    DIRECTION_TO_WORLD_VEC3,
    get_rover_info,
    set_rover_info,
} from "./Game_Entity";
import { Transaction_Control_Flags, Transaction_Manager } from "./Transaction_Manager";
import { Hero_Entity_Data } from "./Hero_Entity_Data";
import { Interpolation_Message, Interpolation_Phase, Messgae_Tag, Visual_Interpolation } from "./interpolation";
import { undo_end_frame } from "./undo";

export enum Move_Type {
    CONTROLLER_PROC,
    PUSHED,
    SUPPORT,
    FALLING,
    ROVER,
}

enum Move_Piorities {
    SUPPORT = 1,

    FALLING = 2,

    PUSHED = 3,

    CONTROLLER_PROC = 4,

    ROVER = 8,
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

    get is_deferred(): boolean { return (this.flags & Move_Flags.DEFERRED) != 0; } // @implementMe
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

    enact(transaction: Move_Transaction): boolean { return false; }

    update(transaction: Move_Transaction, ratio: number) { }

    debug_info(): string { return ''; }
}

export class Move_Transaction {
    static serial_idx = 1;
    static get next_id(): number { return Move_Transaction.serial_idx++ };

    id: number;
    moves: Single_Move[] = [];
    entity_manager: Entity_Manager;

    piority: number = 0;

    issue_time: gameplay_time = null;
    commit_time: gameplay_time = null;

    closed: boolean = false;
    duration: number = 0; // How many rounds this transaction ganna take.
    elapsed: number = 0;  // How many rounds this transaction been through.

    constructor(entity_manager: Entity_Manager, duration: number = 1) {
        this.id = Move_Transaction.next_id;
        this.entity_manager = entity_manager;
        this.duration = duration;
        this.elapsed = 0;
        this.issue_time = Gameplay_Timer.get_gameplay_time();
    }

    update_single_moves() {
        this.moves.sort((a, b) => b.piority - a.piority); // @note In case there is some newly added move?
        this.elapsed += 1;
        const ratio = math.clamp01((this.elapsed / this.duration));
        for (let move of this.moves) {
            move.update(this, ratio);
        }

        this.closed = (this.elapsed >= this.duration);
    }

    add_move(move: Single_Move) {
        Transaction_Manager.instance.running_moves.set(move.target_entity_id, move);
        this.moves.push(move);
        this.piority += move.piority;
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('Transaction#').append(this.id);
        builder.append(' issued at ').append(time_to_string(this.issue_time));
        builder.append(' commited at ').append(time_to_string(this.commit_time));
        builder.append('\n');
        for (let move of this.moves) {
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

        return false; // @hack
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
            // @note Face towards target direction first if it's not currently oriented to that direction.
            if (same_direction(d_start, d_end)) return false;
            // @incomplete Need some turn-left, turn-right animation?

            set_dirty(move, Move_Flags.ROTATED);
            if (entity.entity_type != Entity_Type.AVATAR) {
            } else {
                // @implementMe  Avators would only rotate it's indicator

            }

            return true;
        }
        //#SCOPE

        // @note DO NOT COMMENT THIS !!!
        //  Yes we do not want that *blocked* feeling, but things went wrong when we allow multiply controller_proc_move
        //  in a single transaction.
        if (already_exist_one(Transaction_Control_Flags.CONTROLLER_MOVE)) return false;

        const manager = transaction.entity_manager;
        const entity = manager.find(this.info.target_entity_id);

        const d_start = this.start_direction;
        const d_end = this.end_direction;
        const d_delta = d_end - d_start;

        const p_start = this.start_position;
        const p_end = this.end_position;
        const p_delta = new Vec3(this.end_position).subtract(this.start_position);

        entity.interpolation?.destroy(); // @temprory?

        this.start_visual_position = manager.proximity_grid.local2world(p_start);
        this.end_visual_position = manager.proximity_grid.local2world(p_end);

        const at_least_rotated = maybe_rotate(this);
        transaction.add_move(this);

        if (same_position(p_start, p_end)
            || blocked_by_barrier_in_current_squares(manager, entity, d_end)
            || blocked_by_barrier_in_target_squares(manager, entity, d_end)
            || !manager.proximity_grid.verify_pos(p_end)
            || no_supporter(manager, p_end)) {
            // @note Several reasons that we can not move...

            return at_least_rotated;
        }

        const push_res = try_push_others(entity, d_end, transaction);
        if (push_res.pushed && !push_res.push_succeed) return at_least_rotated;

        // @deprecated Maybe we will do the falling check at the end stage of single moves?
        // const fall_res = possible_falling(transaction, entity, d_end);
        // if (fall_res.fell) {
        //     return (fall_res.fall_succeed || at_least_rotated);
        // }

        move_supportees(transaction, entity, p_delta, d_delta);

        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    #executed: boolean = false; // @note Kinda like IEnumerable? ---> State mechine?
    update(transaction: Move_Transaction, ratio: number) { // @note The ratio param should been clamped by caller.'
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (ratio >= 0.5 && !this.#executed) {
            this.#executed = true;
            $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;

            if (is_dirty(this, Move_Flags.MOVED))
                manager.logically_move_entity(entity, this.end_position);
            if (is_dirty(this, Move_Flags.ROTATED)) {
                entity.logically_rotate_to(this.end_direction);
                entity.visually_face_towards(this.end_direction); // @hack We are not good at lerping quats, ignore this for now...?
            }

            const fall_res = possible_falling(transaction, entity);

            if (!fall_res.fell) {
                { // @deprecated
                    const audio = Audio_Manager.instance;
                    audio.play_sfx(audio.footstep);
                }
            }
        }

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this, Move_Flags.ROTATED)) {
                // const r_start = entity.visual_rotation;
                // const r_end = new Quat();
                // Quat.lerp(r_end, this.start_visual_rotation, this.end_visual_rotation, ratio);
                // const p_0 = Interpolation_Phase.rotation(0.2, r_start, r_end); // @implementMe We are not good at lerping quats, ignore this for now...?
                // phases.push(p_0)
            }

            if (is_dirty(this, Move_Flags.MOVED)) {
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
            { // @note Check possible win
                // @incomplete Handle it differently in test run mode?

                // if (manager.pending_win) return;
                // if (!is_dirty(this, Move_Flags.MOVED)) return;

                // let possible_win = false;
                // for (let s of manager.locate_current_supporters(entity)) {
                //     if (s.entity_type == Entity_Type.CHECKPOINT) possible_win = true;
                // }

                // // if (possible_win) {
                // //     audio.play_sfx(audio.possible_win);
                // // }
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
    constructor(supportor: Game_Entity, supportee: Game_Entity, direction_delta: number, position_delta: Vec3 = Vec3.ZERO) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.SUPPORT;
        move_info.source_entity_id = supportor.id;
        move_info.target_entity_id = supportee.id;
        move_info.start_direction = supportee.orientation;
        move_info.end_direction = calcu_target_direction(supportee.orientation, direction_delta);
        move_info.start_position = supportee.position;
        move_info.end_position = new Vec3(move_info.start_position).add(position_delta)
        super(move_info);
        this.piority = Move_Piorities.SUPPORT;
    }

    enact(transaction: Move_Transaction): boolean {
        // // @note Let the func::detect_conlicts handle if target entity hit others!!!
        // const manager = transaction.entity_manager;
        // const supportee = manager.find(this.info.target_entity_id);
        // const direction_delta = this.end_direction - this.start_direction;
        // const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        // move_supportees(transaction, supportee, position_delta, direction_delta, this.piority);

        // if (!same_position(this.start_position, this.end_position))
        //     set_dirty(this, Move_Flags.MOVED);
        // if (this.start_direction != this.end_direction)
        //     set_dirty(this, Move_Flags.ROTATED);

        // transaction.add_move(this);
        return true;
    }

    update(transaction: Move_Transaction) {
        // const manager = transaction.entity_manager;
        // const supporter = manager.find(this.source_entity_id);
        // const entity = manager.find(this.target_entity_id);

        // if (is_dirty(this, Move_Flags.MOVED)) {
        //     const grid = manager.proximity_grid;
        //     const position = this.end_position;

        //     manager.logically_move_entity(entity, position);
        //     {
        //         const i_s = supporter.interpolation;
        //         const start_at = i_s.start_at;
        //         const end_at = i_s.end_at;

        //         const start_point = grid.local2world(this.start_position);
        //         const end_point = grid.local2world(this.end_position);
        //         const p_0 = Interpolation_Phase.movement(1, start_point, end_point);

        //         const m_0 = new Interpolation_Message(Messgae_Tag.LOGICALLY_MOVEMENT);
        //         m_0.do = () => {

        //         };
        //         {
        //             const m_p = i_s.messages.get(Messgae_Tag.LOGICALLY_MOVEMENT);
        //             if (m_p) {
        //                 m_p.chidren.push(m_0);
        //             }
        //         }

        //         const i = new Visual_Interpolation(this, entity, start_at, end_at, [p_0], [m_0], i_s);
        //     }
        // }

        // may_rotate_entity(this, manager, entity);
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

    public constructor(source: Game_Entity, target: Game_Entity, direction: Direction, step: number = 1) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.PUSHED;
        move_info.source_entity_id = source.id;
        move_info.target_entity_id = target.id;
        move_info.start_position = target.position;
        move_info.reaction_direction = direction;
        move_info.end_position = calcu_entity_future_position(target, direction, step);
        super(move_info);

        this.piority = Move_Piorities.PUSHED;
    }

    enact(transaction: Move_Transaction): boolean {
        // const manager = transaction.entity_manager;
        // const e_source = manager.find(this.info.source_entity_id);
        // const e_target = manager.find(this.info.target_entity_id);
        // const direction = this.reaction_direction;
        // const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        // if (!can_push(e_source, e_target)) return false;
        // if (hit_the_barrier(manager, e_target, direction)) return false;
        // if (!can_pass_through(manager, e_target, direction)) return false;

        // const res = possible_falling(transaction, e_target, direction, e_source);
        // if (res.fell) { return res.fall_succeed; }

        // move_supportees(transaction, e_target, position_delta, 0);
        // transaction.add_move(this);

        // set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    update(transaction: Move_Transaction) {
        // const manager = transaction.entity_manager;
        // const pusher = manager.find(this.source_entity_id);
        // const entity = manager.find(this.target_entity_id);
        // const audio = Audio_Manager.instance;

        // if (is_dirty(this, Move_Flags.MOVED)) {
        //     audio.random_play_one_sfx(Random_Audio_Group.PUSH);
        //     const grid = manager.proximity_grid;
        //     const position = this.end_position;

        //     // if (pusher.entity_type == Entity_Type.HERO) {
        //     //     const hero = pusher.getComponent(Hero_Entity_Data);
        //     //     hero.push();
        //     // }

        //     manager.logically_move_entity(entity, position);

        //     {
        //         const i_p = pusher.interpolation;
        //         const start_at = i_p.start_at;
        //         const end_at = i_p.end_at;

        //         const start_point = grid.local2world(this.start_position);
        //         const end_point = grid.local2world(this.end_position);
        //         const p_0 = Interpolation_Phase.movement(1, start_point, end_point);

        //         const m_0 = new Interpolation_Message(Messgae_Tag.LOGICALLY_MOVEMENT);
        //         m_0.do = () => {
        //         };

        //         {
        //             const m_p = i_p.messages.get(Messgae_Tag.LOGICALLY_MOVEMENT);
        //             if (m_p) {
        //                 m_p.chidren.push(m_0);
        //             }
        //         }

        //         const i = new Visual_Interpolation(this, entity, start_at, end_at, [p_0], [m_0], pusher.interpolation);
        //     }
        // }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('PUSHED#').append(this.id);
        log_target_entity(builder, this);
        builder.append('\n-   pusher#').append(this.info.source_entity_id);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

// @note Falling move is a replacement of a Pushed_Move or a Controller_Proc_Move
class Falling_Move extends Single_Move {
    constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.FALLING;
        move_info.target_entity_id = entity.id;
        move_info.start_position = entity.position;
        super(move_info);

        this.piority = Move_Piorities.FALLING;
    }

    enact(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        this.info.end_position = resolve_new_landing_point(manager, entity);

        const p_delta = new Vec3(this.end_position).subtract(this.start_position);
        const supportees = manager.locate_current_supportees(entity);
        for (let supportee of supportees) {
            const support = new Support_Move(entity, supportee, 0, p_delta);
            support.enact(transaction);
        }

        this.start_visual_position = manager.proximity_grid.local2world(this.start_position);
        this.end_visual_position = manager.proximity_grid.local2world(this.end_position);

        set_dirty(this, Move_Flags.MOVED);
        transaction.add_move(this);
        return true;
    }

    #executed: boolean = false; // @note Kinda like IEnumerable? ---> State mechine?
    update(transaction: Move_Transaction, ratio: number) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        // @implementMe Handle if we get a new supporter middle way.

        if (ratio >= 0.5 && !this.#executed) {
            this.#executed = true;

            Audio_Manager.instance.random_play_one_sfx(Random_Audio_Group.DROP); // @deprecated NEW AUDIO API!!!

            if (is_dirty(this, Move_Flags.MOVED))
                manager.logically_move_entity(entity, this.end_position);
            if (is_dirty(this, Move_Flags.ROTATED)) {
                entity.logically_rotate_to(this.end_direction);
                entity.visually_face_towards(this.end_direction); // @hack We are not good at lerping quats, ignore this for now...?
            }
        }

        { // Start visual interpolation stuff
            let phases: Interpolation_Phase[] = [];

            if (is_dirty(this, Move_Flags.MOVED)) {
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
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('FALLING#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

class Rover_Move extends Single_Move {
    public constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.ROVER;
        move_info.target_entity_id = entity.id;
        move_info.start_direction = move_info.end_direction = entity.orientation;
        move_info.start_position = move_info.end_position = entity.position;
        super(move_info);

        this.piority = Move_Piorities.ROVER;
    }

    enact(transaction: Move_Transaction): boolean {
        // function locate_track_ahead(r: Game_Entity, d: Direction): Game_Entity {
        //     const supporters = manager.locate_future_supporters(r, d);
        //     for (let supporter of supporters) {
        //         if (supporter.entity_type == Entity_Type.TRACK) {
        //             if (collinear_direction(supporter.rotation, rover.orientation)) {
        //                 return supporter;
        //             }
        //         }
        //     }
        //     return null;
        // }
        // //#SCOPE

        // const manager = transaction.entity_manager;
        // const rover = manager.find(this.info.target_entity_id);

        // let direction = rover.orientation;
        // let turned_around: boolean = false;
        // let stucked: boolean = false;

        // let track = locate_track_ahead(rover, direction);
        // if (track == null) { // There's no way ahead, we need to turn around
        //     turned_around = true;
        // } else {
        //     if (collinear_direction(track.rotation, rover.orientation)) {
        //         const push_res = try_push_others(rover, direction, transaction);
        //         turned_around = push_res.pushed && !push_res.push_succeed;
        //     } else {
        //         // @implementMe Turning is a problem for now, we don't even have a suitable model...
        //     }
        // }

        // if (turned_around) {
        //     direction = clacu_reversed_direction(rover.orientation);
        //     let track = locate_track_ahead(rover, direction);

        //     if (track == null) {
        //         stucked = true;
        //     } else {
        //         if (collinear_direction(track.rotation, rover.orientation)) {
        //             const push_res = try_push_others(rover, direction, transaction);
        //             stucked = push_res.pushed && !push_res.push_succeed;
        //         } else {
        //             // @implementMe Turning is a problem for now, we don't even have a suitable model...
        //         }
        //     }
        // }

        // if (stucked) {
        //     return false;
        // }

        // this.info.end_direction = direction;
        // this.info.end_position = calcu_entity_future_position(rover, this.end_direction);
        // const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        // move_supportees(transaction, rover, position_delta, 0);

        // if (!same_position(this.start_position, this.end_position))
        //     set_dirty(this, Move_Flags.MOVED);
        // if (this.start_direction != this.end_direction)
        //     set_dirty(this, Move_Flags.ROTATED);

        // transaction.moves.push(this);
        // transaction.piority += this.piority;
        return true;
    }

    update(transaction: Move_Transaction) {
        // const manager = transaction.entity_manager;
        // const entity = manager.find(this.target_entity_id);

        // if (is_dirty(this, Move_Flags.MOVED)) {
        //     const position = this.end_position;
        //     const direction = this.end_direction;
        //     const grid = manager.proximity_grid;

        //     manager.logically_move_entity(entity, position);
        //     {
        //         const begin_at = Gameplay_Timer.get_gameplay_time();
        //         const freq = get_rover_info(entity).freq;
        //         const end_at = Gameplay_Timer.get_gameplay_time(freq);

        //         const start_point = grid.local2world(this.start_position);
        //         const end_point = grid.local2world(this.end_position);
        //         const p_0 = Interpolation_Phase.movement(1, start_point, end_point);

        //         const m_0 = new Interpolation_Message(Messgae_Tag.LOGICALLY_MOVEMENT, 0.5);
        //         m_0.do = () => {
        //         };

        //         const i = new Visual_Interpolation(this, entity, begin_at, end_at, [p_0], [m_0]);
        //     }
        // }

        // if (this.flags & Move_Flags.ROTATED) { // @hack
        //     entity.undoable.orientation = this.end_direction; // @implementMe Extract it to entity manager
        //     entity.logically_rotate_to(this.end_direction);
        // }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('ROVER#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_rotation(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

//#region PUBLIC
export function detect_conflicts(transaction: Move_Transaction, move: Single_Move) {
    function remove_it() {
        const idx = transaction.moves.indexOf(move);
        transaction.moves.splice(idx, 1)
    }

    function taken_by_incoming_entity_from_same_transaction(pos: Vec3): boolean {
        for (let another_move of transaction.moves) {
            if (another_move.target_entity_id == target.id) continue;
            if (another_move.id == move.id) continue;
            if (!is_dirty(another_move, Move_Flags.MOVED)) continue;

            if (same_position(another_move.end_position, pos)) return true;
        }

        return false;
    }

    function exist_in_another_move(another: Game_Entity): boolean {
        for (let another_move of transaction.moves) {
            if (another_move.id == move.id) continue;

            if (another_move.target_entity_id == another.id
                && is_dirty(another_move, Move_Flags.MOVED))
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
        console.log(`SANITY CHECK: NEW SUPPORTER, target: ${target.id}, landed: ${p.toString()}`);
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
        const max_depth = 10; // @hack
        let supporters = [];

        const p = new Vec3(drop_point);
        for (let depth = 1; depth <= max_depth; depth++) {
            p.z -= 1;
            if (taken_by_incoming_entity_from_same_transaction(p)) {
                res.succeed = true;
                p.z += 1;
                res.pos = p;

                console.log(`SANITY CHECK: INCOMING_ENTITY depth: ${depth}, pos: ${p.toString()}`);
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

    if (!is_dirty(move, Move_Flags.MOVED)) return true;
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
        if (!is_dirty(move, Move_Flags.MOVED)) return true;

        if (supporter_no_longer_exist()) {
            console.log(`SANITY CHECK: NO SUPPORTER, target: ${target.id}, move: ${move.info.move_type}`);

            if (move.info.move_type == Move_Type.ROVER) {
                const slap_it = new Rover_Move(target);
                slap_it.enact(transaction);
            } else {
                let direction = 0;
                if (move.info.move_type == Move_Type.PUSHED) {
                    // @fixme Don't pay attention to this kinda of special cases...

                    direction = move.reaction_direction;
                } else {
                    direction = move.end_direction;
                }
                possible_falling(transaction, target); // @hack
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

export function maybe_move_rovers(transaction_manager: Transaction_Manager) {
    const entity_manager = transaction_manager.entity_manager;
    const audio = Audio_Manager.instance;

    if (entity_manager.pending_win) return;
    if (!entity_manager.switch_turned_on) return;

    let at_least_one: boolean = false;
    for (let rover of entity_manager.rovers) {
        const info = get_rover_info(rover);

        let failed_to_move = false;
        if (info.counter == info.freq - 1) {
            const rover_move = new Rover_Move(rover);
            if (transaction_manager.new_transaction(rover_move)) {
                at_least_one = true;
            } else {
                failed_to_move = true;
            }
        }

        if (!failed_to_move) info.counter = (info.counter + 1) % info.freq;
        set_rover_info(rover, info);
    }

    if (at_least_one) {
        audio.play_sfx(audio.rover_move);
    }
}

export function generate_player_move(transaction_manager: Transaction_Manager, entity_manager: Entity_Manager, direction: Direction, step: number = 1) {
    const hero = entity_manager.active_hero;
    if (transaction_manager.new_transaction(new Player_Move(hero, direction, step), $$.PLAYER_MOVE_DURATION)) {
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = true;

        undo_end_frame(entity_manager);

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
function possible_falling(t: Move_Transaction, e: Game_Entity): { fell: boolean, fall_succeed: boolean } {
    const res = {
        fell: false,
        fall_succeed: true,
    };

    const manager = t.entity_manager;
    const drop_point = e.position;
    const supporters = manager.locate_supporters(drop_point, 1);

    if (supporters.length == 0) {
        const falling = new Falling_Move(e);

        if (t.elapsed == t.duration) {
            if (Transaction_Manager.instance.new_transaction(falling)) {
                res.fall_succeed = true;
            } else {
                res.fall_succeed = false;
            }
        } else {
            if (falling.enact(t)) {
                res.fall_succeed = true;
            } else {
                res.fall_succeed = false;
            }
        }
        res.fell = true;
    }

    return res;
}

function can_push(e_source: Game_Entity, e_target: Game_Entity): boolean {
    if (e_target.entity_type == Entity_Type.STATIC
        || e_target.entity_type == Entity_Type.CHECKPOINT
        || e_target.entity_type == Entity_Type.SWITCH
        || e_target.entity_type == Entity_Type.TRACK)
        return false;

    if (e_source.entity_type != Entity_Type.ROVER
        && e_target.entity_type == Entity_Type.ROVER)
        return false;
    return true;
}

function try_push_others(mover: Game_Entity, direction: Direction, transaction: Move_Transaction): { pushed: boolean, push_succeed: boolean } {
    const res = { pushed: false, push_succeed: true };
    const manager = transaction.entity_manager;

    for (let other of locate_entities_in_target_direction(manager, mover, direction)) {
        if (other == null) continue;
        if (other == mover) continue;
        if (other.interpolation) continue;
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
            other.interpolation?.destroy(); // @note Just drop it?
        }
        break;
    }

    return res;
}

function move_supportees(transaction: Move_Transaction, entity: Game_Entity, position_delta: Vec3, rotation_delta: number, parent_piority?: number) {
    function has_other_supporter(e: Game_Entity): boolean {
        const supporters = manager.locate_current_supporters(e);
        for (let s of supporters) {
            if (s.id != entity.id) return true;
        }
        return false;
    }

    const manager = transaction.entity_manager;
    for (let supportee of manager.locate_current_supportees(entity)) {
        if (supportee.id == entity.id) continue;
        if (has_other_supporter(supportee)) continue;

        const support_move = new Support_Move(entity, supportee, rotation_delta, position_delta);
        if (parent_piority) support_move.piority = parent_piority * Const.SUPPORTEE_PIORITY_DOWNGRADE_FACTOR;

        if (!support_move.enact(transaction)) {
            const res = possible_falling(transaction, entity);
            // if (res.fell) { return res.fall_succeed; }
        }
    }
}

function blocked_by_barrier_in_current_squares(m: Entity_Manager, e: Game_Entity, d: Direction) {
    for (let other of m.locate_current_supporters(e)) {
        // @note Ignored it in new version
        // if (other.entity_type == Entity_Type.BRIDGE) {
        //     // @note Can't get off the bridge halfway
        //     // |  ↑  |
        //     // |<-x->| 
        //     // |  ↓  |
        //     const bridge = other;
        //     if (orthogonal_direction(bridge.orientation, d)) {
        //         return true;
        //     }
        // };

        if (other.entity_type == Entity_Type.FENCE) {
            // @note Can't pass through when there's a fence on the future square
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

function blocked_by_barrier_in_target_squares(m: Entity_Manager, e: Game_Entity, d: Direction): boolean {
    for (let supporter of m.locate_future_supporters(e, d)) {
        // @note Ignored it in new version
        // if (supporter.entity_type == Entity_Type.BRIDGE) {
        //     // @note Can't walk on the bridge halfway.
        //     // |  ↑  |
        //     // |     | <-x-
        //     // |  ↓  |
        //     const bridge = supporter;
        //     if (orthogonal_direction(bridge.rotation, d)) {
        //         return true;
        //     }
        // };

        if (supporter.entity_type == Entity_Type.FENCE) {
            // @note Can't pass through when there's a fence on the future square
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

function no_supporter(m: Entity_Manager, p: Vec3): boolean {
    const max_depth = 10; // @incomplete Maybe we should treat plane Z=0 as the ground?
    for (let d = 1; d <= max_depth; d++) {
        if (m.locate_supporters(p, d).length != 0) {
            // console.log(`resolved a supporter at ${d}, from: ${p}`);
            return false;
        }
    }
    return true;
}

function resolve_new_landing_point(m: Entity_Manager, e: Game_Entity): Vec3 {
    const res = {
        succeed: false,
        pos: null,
    };

    const p = new Vec3(e.position);
    const max_depth = p.z; // @note For now we just treat plane Z=0 as GROUND? In order to fix the buge situation. 

    for (let d = 1; d <= max_depth; d++) {
        if (m.locate_supporters(p, d).length != 0) {
            // console.log(`resolved a supporter at ${d}, from: ${p}`);
            return p;
        }
        p.z -= 1;
    }

    // @fixme Sth went wrong here
    return p;
}

function can_pass_through(m: Entity_Manager, e: Game_Entity, d: Direction) {
    for (let other of locate_entities_in_target_direction(m, e, d)) {
        if (other == null) continue;
        if (other == e) continue;
        if (other.entity_type == Entity_Type.BRIDGE) return true;
        if (other.entity_type == Entity_Type.GATE) {
            if (same_position(other.position, e.position)
                && e.polyomino_type == Polyomino_Type.MONOMINO)
                continue;
            else {
                return false;
            }
        }

        return false;
    }

    return true;
}

// === Physically Update Entities === 
function may_rotate_entity(move: Single_Move, manager: Entity_Manager, entity: Game_Entity) {
    if (!is_dirty(move, Move_Flags.ROTATED)) return;
    manager.rotate_entity(entity, move.end_direction);
}

// === LOG STUFF ===
function log_target_entity(builder: String_Builder, move: Single_Move) {
    builder.append('\n-   entity#').append(move.info.target_entity_id);
}

function maybe_log_movement(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move, Move_Flags.MOVED)) return;

    builder.append('\n-   movement: from ')
        .append(move.start_position.toString())
        .append(' to ')
        .append(move.end_position.toString());
}

function maybe_log_rotation(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move, Move_Flags.ROTATED)) return;

    builder.append('\n-   rotation: from ')
        .append(Const.DIRECTION_NAMES[move.start_direction])
        .append(' to ')
        .append(Const.DIRECTION_NAMES[move.end_direction]);
}

// === FLAG STUFF ===
export function is_dirty(move: Single_Move, f: number): boolean {
    return (move.flags & f) != 0;
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