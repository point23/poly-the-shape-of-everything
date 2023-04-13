import { Vec3 } from "cc";
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
import { Interpolation_Message, Interpolation_Phase, Visual_Interpolation } from "./interpolation";

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

    try_add_itself(transaction: Move_Transaction): boolean { return false; }

    execute(transaction: Move_Transaction) { }

    debug_info(): string { return ''; }
}

export class Move_Transaction {
    static serial_idx = 1;
    static get next_id(): number { return Move_Transaction.serial_idx++ };

    id: number;
    // duration: number;
    moves: Single_Move[];
    entity_manager: Entity_Manager;
    piority: number = 0;
    issue_time: gameplay_time;
    commit_time: gameplay_time;

    public constructor(entity_manager: Entity_Manager) {
        this.issue_time = Gameplay_Timer.get_gameplay_time();
        this.id = Move_Transaction.next_id;
        // this.duration = Transaction_Manager.instance.duration;
        this.moves = [];
        this.entity_manager = entity_manager;
    }

    public add_move(move: Single_Move) {
        this.moves.push(move);
        this.piority += move.piority;
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('Transaction#').append(this.id);
        builder.append(' commited at ').append(time_to_string(this.commit_time));
        builder.append('\n');
        for (let move of this.moves) {
            builder.append('\t- ').append(move.debug_info()).append('\n');
        }
        return builder.to_string();
    }
}


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

    async execute() {
        // Entity_Manager.instance.reclaim(this.source_entity);
        // this.target_entity.entity_type = Entity_Type.AVATAR;
        // Entity_Manager.instance.current_character = this.target_entity;
    }
}

export class Controller_Proc_Move extends Single_Move {

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

    try_add_itself(transaction: Move_Transaction): boolean {
        function possible_rotate(move: Single_Move): boolean {
            if (!same_direction(start_direction, end_direction)) {
                // Face to target direction if it's not currently oriented to that direction.
                let delta = end_direction - start_direction;
                const rotate_move = new Controller_Proc_Move(e_target, end_direction, 0)
                set_dirty(rotate_move, Move_Flags.ROTATED);
                transaction.add_move(rotate_move);
                if (e_target.entity_type != Entity_Type.AVATAR) {
                    // Avators would only rotate it's indicator
                    move_supportees(transaction, e_target, Vec3.ZERO, delta);
                }
                return true;
            }
            return false;
        }
        //#SCOPE

        // @note DO NOT COMMENT THIS !!!
        //  Yes we do not want that *blocked* feeling, but things went wrong when we allow multiply controller_proc_move
        //  in a single transaction.
        if (already_exist_one(Transaction_Control_Flags.CONTROLLER_MOVE)) return false;

        const manager = transaction.entity_manager;
        const e_target = manager.find(this.info.target_entity_id);
        const start_direction = this.start_direction;
        const end_direction = this.end_direction;
        const start_position = this.start_position;
        const end_position = this.end_position;

        const at_least_rotated = possible_rotate(this);

        if (same_position(start_position, end_position)) return at_least_rotated;
        if (hit_the_barrier(manager, e_target, end_direction)) return at_least_rotated;
        if (blocked_by_barrier(manager, e_target, end_direction)) return at_least_rotated;

        const push_res = try_push_others(transaction, e_target, end_direction);
        if (push_res.pushed && !push_res.push_succeed) return at_least_rotated;

        const fall_res = possible_falling(transaction, e_target, end_direction);
        if (fall_res.fell) return (fall_res.fall_succeed || at_least_rotated);

        transaction.add_move(this);

        // Update entities that are supported by target entity
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        move_supportees(transaction, e_target, position_delta, 0);

        // Update transaction control flags
        Transaction_Manager.instance.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;

        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    async execute(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);
        const audio = Audio_Manager.instance;

        if (is_dirty(this, Move_Flags.MOVED)) {
            audio.play_sfx(audio.footstep);
            const position = this.end_position;
            const grid = manager.proximity_grid;

            manager.logically_move_entity(entity, position); // @hack

            const start_point = grid.local2world(this.start_position);
            const end_point = grid.local2world(this.end_position);

            const hero = entity.getComponent(Hero_Entity_Data);

            $$.TAKING_USER_INPUT = false;
            $$.HERO_VISUALLY_MOVING = true;
            hero.run();

            {
                const begin_at = Gameplay_Timer.get_gameplay_time();
                const end_at = Gameplay_Timer.get_gameplay_time(1);
                const p_0 = Interpolation_Phase.movement(1, start_point, end_point);
                const i = new Visual_Interpolation(entity, begin_at, end_at, [p_0]);
                i.on_complete = () => {
                    $$.TAKING_USER_INPUT = true;
                    $$.HERO_VISUALLY_MOVING = false;
                    grid.move_entity(entity, position); // correct it
                };
                entity.interpolation = i;
            }
        }

        may_rotate_entity(this, manager, entity);

        { // @note Check possible win
            if (manager.pending_win) return;
            if (!is_dirty(this, Move_Flags.MOVED)) return;

            let possible_win = false;
            for (let s of manager.locate_current_supporters(entity)) {
                if (s.entity_type == Entity_Type.CHECKPOINT) possible_win = true;
            }

            if (possible_win) {
                audio.play_sfx(audio.possible_win);
            }
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('CONTROLLER_PROC#').append(this.id);
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

    try_add_itself(transaction: Move_Transaction): boolean {
        // @note Let the func::detect_conlicts handle if target entity hit others!!!

        const manager = transaction.entity_manager;
        const supportee = manager.find(this.info.target_entity_id);
        const direction_delta = this.end_direction - this.start_direction;
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        move_supportees(transaction, supportee, position_delta, direction_delta, this.piority);

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);
        if (this.start_direction != this.end_direction)
            set_dirty(this, Move_Flags.ROTATED);

        transaction.add_move(this);
        return true;
    }

    async execute(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const supporter = manager.find(this.source_entity_id);
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this, Move_Flags.MOVED)) {
            const grid = manager.proximity_grid;
            const position = this.end_position;

            manager.logically_move_entity(entity, position); // @hack

            const start_point = grid.local2world(this.start_position);
            const end_point = grid.local2world(this.end_position);

            {
                const begin_at = Gameplay_Timer.get_gameplay_time();
                const end_at = Gameplay_Timer.get_gameplay_time(1);
                const p_0 = Interpolation_Phase.movement(1, start_point, end_point);
                const i = new Visual_Interpolation(entity, begin_at, end_at, [p_0], null, supporter.interpolation);
                i.on_complete = () => {
                    entity.interpolation = null;
                    grid.move_entity(entity, position); // correct it
                };
                entity.interpolation = i;
            }
        }

        may_rotate_entity(this, manager, entity);
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('SUPPORT#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_rotation(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }

}

class Pushed_Move extends Single_Move {

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

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const e_source = manager.find(this.info.source_entity_id);
        const e_target = manager.find(this.info.target_entity_id);
        const direction = this.reaction_direction;
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        if (!can_push(e_source, e_target)) return false;
        if (hit_the_barrier(manager, e_target, direction)) return false;
        if (!can_pass_through(manager, e_target, direction)) return false;

        const res = possible_falling(transaction, e_target, direction, e_source);
        if (res.fell) { return res.fall_succeed; }

        move_supportees(transaction, e_target, position_delta, 0);
        transaction.add_move(this);

        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    async execute(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const pusher = manager.find(this.source_entity_id);
        const entity = manager.find(this.target_entity_id);
        const audio = Audio_Manager.instance;

        if (is_dirty(this, Move_Flags.MOVED)) {
            audio.random_play_one_sfx(Random_Audio_Group.PUSH);
            const grid = manager.proximity_grid;
            const position = this.end_position;

            const start_point = grid.local2world(this.start_position);
            const end_point = grid.local2world(this.end_position);

            if (pusher.entity_type == Entity_Type.HERO) {
                const hero = pusher.getComponent(Hero_Entity_Data);
                hero.push();
            }

            {
                const begin_at = pusher.interpolation.start_at;
                const end_at = pusher.interpolation.end_at;
                const p_0 = Interpolation_Phase.movement(1, start_point, end_point);

                const m_0 = new Interpolation_Message(0.5);
                m_0.send = () => {
                    manager.logically_move_entity(entity, position);
                };

                const i = new Visual_Interpolation(entity, begin_at, end_at, [p_0], [m_0], pusher.interpolation);
                i.on_complete = () => {
                    entity.interpolation = null;
                    grid.move_entity(entity, position); // correct it
                };
                entity.interpolation = i;
            }
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('PUSHED#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }

}

// @note Falling move is a replacement of a Pushed_Move or a Controller_Proc_Move
class Falling_Move extends Single_Move {
    constructor(entity: Game_Entity, direction: Direction, pusher?: Game_Entity) {
        const move_info = new Move_Info();
        move_info.move_type = Move_Type.FALLING;

        if (pusher) move_info.source_entity_id = pusher.id;

        move_info.target_entity_id = entity.id;
        move_info.start_position = entity.position;
        move_info.start_direction = move_info.end_direction = direction;
        super(move_info);

        this.piority = Move_Piorities.FALLING;
    }

    static support_falling(entity: Game_Entity, direction: Direction, position_delta: Vec3, parent: Falling_Move, transaction: Move_Transaction) {
        const move = new Falling_Move(entity, direction);
        move.info.end_position = new Vec3(move.start_position).add(position_delta);
        move.piority = parent.piority * Const.SUPPORTEE_PIORITY_DOWNGRADE_FACTOR;
        move.try_add_itself(transaction);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;

        const entity = manager.find(this.target_entity_id);
        const direction = this.end_direction;

        if (this.end_position == null) { // @note If it is a falling move caused by it's supporter.

            let drop_point = entity.position;
            if (direction != Direction.DOWN) {
                drop_point = calcu_entity_future_position(entity, direction);
            }

            const max_depth = 10; // @hack
            let supporters = [];
            for (let depth = 1; depth <= max_depth; depth++) {
                supporters = manager.locate_supporters(drop_point, depth);
                if (supporters.length != 0) break;
            }

            if (supporters.length == 0) return false;

            const futrue_pos = supporters[0].position; // @hack
            futrue_pos.z += 1;
            this.info.end_position = futrue_pos;
        }

        set_dirty(this, Move_Flags.MOVED);
        transaction.add_move(this);

        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        const supportees = manager.locate_current_supportees(entity);
        for (let supportee of supportees) {
            Falling_Move.support_falling(supportee, direction, position_delta, this, transaction);
        }

        return true;
    }

    async execute(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this, Move_Flags.MOVED)) {
            Audio_Manager.instance.random_play_one_sfx(Random_Audio_Group.DROP);
        }

        if (is_dirty(this, Move_Flags.MOVED)) {
            const position = this.end_position;
            const grid = manager.proximity_grid;

            // const duration = (Const.Ticks_Per_Loop[$$.DURATION_IDX] * Const.Tick_Interval) * 0.9;

            const start_point = grid.local2world(this.start_position);
            const end_point = grid.local2world(this.end_position);
            const drop_point = new Vec3()
                .set(start_point)
                .add(DIRECTION_TO_WORLD_VEC3[this.end_direction]);
            const hero_jump_down = entity.entity_type == Entity_Type.HERO;

            manager.logically_move_entity(entity, position); // @hack

            if (this.source_entity_id) {
                const possible_pusher = manager.find(this.source_entity_id);
                if (possible_pusher.entity_type == Entity_Type.HERO) {
                    const hero = possible_pusher.getComponent(Hero_Entity_Data);
                    hero.push();
                }
            }

            {
                const begin_at = Gameplay_Timer.get_gameplay_time();
                const end_at = Gameplay_Timer.get_gameplay_time(1);
                const p_0 = Interpolation_Phase.movement(Const.RATIO_FALLING_BEGIN, start_point, drop_point);
                const p_1 = Interpolation_Phase.movement(1, drop_point, end_point);
                const i = new Visual_Interpolation(entity, begin_at, end_at, [p_0, p_1]);
                i.on_complete = () => {
                    entity.interpolation = null;
                    if (hero_jump_down) {
                        const hero = entity.getComponent(Hero_Entity_Data);
                        hero.landing();
                    }
                    grid.move_entity(entity, position); // correct it
                };

                entity.interpolation = i;
            }
        }

        may_rotate_entity(this, manager, entity);
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

    try_add_itself(transaction: Move_Transaction): boolean {
        function locate_track_ahead(r: Game_Entity, d: Direction): Game_Entity {
            const supporters = manager.locate_future_supporters(r, d);
            for (let supporter of supporters) {
                if (supporter.entity_type == Entity_Type.TRACK) {
                    if (collinear_direction(supporter.rotation, rover.orientation)) {
                        return supporter;
                    }
                }
            }
            return null;
        }
        //#SCOPE

        const manager = transaction.entity_manager;
        const rover = manager.find(this.info.target_entity_id);

        let direction = rover.orientation;
        let turned_around: boolean = false;
        let stucked: boolean = false;

        let track = locate_track_ahead(rover, direction);
        if (track == null) { // There's no way ahead, we need to turn around
            turned_around = true;
        } else {
            if (collinear_direction(track.rotation, rover.orientation)) {
                const push_res = try_push_others(transaction, rover, direction);
                turned_around = push_res.pushed && !push_res.push_succeed;
            } else {
                // @implementMe Turning is a problem for now, we don't even have a suitable model...
            }
        }

        if (turned_around) {
            direction = clacu_reversed_direction(rover.orientation);
            let track = locate_track_ahead(rover, direction);

            if (track == null) {
                stucked = true;
            } else {
                if (collinear_direction(track.rotation, rover.orientation)) {
                    const push_res = try_push_others(transaction, rover, direction);
                    stucked = push_res.pushed && !push_res.push_succeed;
                } else {
                    // @implementMe Turning is a problem for now, we don't even have a suitable model...
                }
            }
        }

        if (stucked) {
            return false;
        }

        this.info.end_direction = direction;
        this.info.end_position = calcu_entity_future_position(rover, this.end_direction);
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        move_supportees(transaction, rover, position_delta, 0);

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);
        if (this.start_direction != this.end_direction)
            set_dirty(this, Move_Flags.ROTATED);

        transaction.moves.push(this);
        transaction.piority += this.piority;
        return true;
    }

    async execute(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (is_dirty(this, Move_Flags.MOVED)) {
            const position = this.end_position;
            const grid = manager.proximity_grid;

            const start_point = grid.local2world(this.start_position);
            const end_point = grid.local2world(this.end_position);
            {
                const begin_at = Gameplay_Timer.get_gameplay_time();
                const freq = get_rover_info(entity).freq;
                const end_at = Gameplay_Timer.get_gameplay_time(freq);

                const p_0 = Interpolation_Phase.movement(1, start_point, end_point);

                const m_0 = new Interpolation_Message(0.5);
                m_0.send = () => {
                    manager.logically_move_entity(entity, position);
                };

                const i = new Visual_Interpolation(entity, begin_at, end_at, [p_0], [m_0]);
                i.on_complete = () => {
                    entity.interpolation = null;
                    grid.move_entity(entity, position); // correct it
                };
                entity.interpolation = i;
            }
        }

        if (this.flags & Move_Flags.ROTATED) { // @hack
            entity.undoable.orientation = this.end_direction; // @implementMe Extract it to entity manager
            entity.logically_rotate_to(this.end_direction);
        }
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

        const other_entities = manager.locate_entities(move.end_position);
        for (let another_entity of other_entities) {
            if (another_entity.id == target.id) continue;
            if (exist_in_another_move(another_entity)) continue;
            if (another_entity.entity_type == Entity_Type.GATE || is_a_board_entity(another_entity.entity_type)) continue;

            res.is_taken = true;
            res.taken_by = another_entity;
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
                slap_it.try_add_itself(transaction);
            } else {
                let direction = 0;
                if (move.info.move_type == Move_Type.PUSHED) {
                    // @fixme Don't pay attention to this kinda of special cases...

                    direction = move.reaction_direction;
                } else {
                    direction = move.end_direction;
                }
                possible_falling(transaction, target, direction);
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

        if (info.counter == info.freq - 1) {
            const rover_move = new Rover_Move(rover);
            if (transaction_manager.try_add_new_move(rover_move)) {
                at_least_one = true;
            }
        }

        info.counter = (info.counter + 1) % info.freq;
        set_rover_info(rover, info);
    }

    if (at_least_one) {
        audio.play_sfx(audio.rover_move);
    }
}

export function generate_controller_proc(transaction_manager: Transaction_Manager, entity_manager: Entity_Manager, direction: Direction, step: number = 1) {
    const hero = entity_manager.active_hero;
    transaction_manager.try_add_new_move(new Controller_Proc_Move(hero, direction, step));
}

export function is_a_board_entity(t: Entity_Type): boolean {
    let res = false;
    switch (t) {
        case Entity_Type.TRACK:
        case Entity_Type.BRIDGE:
        case Entity_Type.ENTRANCE:
        case Entity_Type.SWITCH:
            res = true;
            break;
    }

    return res;
}
//#endregion PUBLIC

//#region PRIVATE
function possible_falling(t: Move_Transaction, e: Game_Entity, d: Direction, pusher?: Game_Entity): { fell: boolean, fall_succeed: boolean } {
    const res = {
        fell: false,
        fall_succeed: true,
    };

    const manager = t.entity_manager;
    let drop_point = e.position;
    if (d != Direction.DOWN) {
        drop_point = calcu_entity_future_position(e, d);
    }

    const supporters = manager.locate_supporters(drop_point, 1);
    if (supporters.length == 0) {
        const falling_move = new Falling_Move(e, d, pusher);
        if (falling_move.try_add_itself(t)) {
            res.fall_succeed = true;
        } else {
            res.fall_succeed = false;
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

function try_push_others(t: Move_Transaction, e: Game_Entity, d: Direction): { pushed: boolean, push_succeed: boolean } {
    const res = { pushed: false, push_succeed: true };
    const manager = t.entity_manager;
    for (let other of locate_entities_in_target_direction(manager, e, d)) {
        if (other == null) continue;
        if (other == e) continue;
        if (is_a_board_entity(other.entity_type)) continue;

        if (other.entity_type == Entity_Type.GATE) {
            const gate = other;
            const p = calcu_entity_future_position(e, d);
            if (!same_position(gate.position, p)
                || e.polyomino_type != Polyomino_Type.MONOMINO) {
                res.pushed = true;
                res.push_succeed = false;
            }

            continue;
        }

        res.pushed = true;
        const pushed_move = new Pushed_Move(e, other, d);
        if (!pushed_move.try_add_itself(t)) {
            res.push_succeed = false;
        }
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

        if (!support_move.try_add_itself(transaction)) {
            const res = possible_falling(transaction, entity, Direction.DOWN);
            // if (res.fell) { return res.fall_succeed; }
        }
    }
}

function hit_the_barrier(m: Entity_Manager, e: Game_Entity, d: Direction) {
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

function blocked_by_barrier(m: Entity_Manager, e: Game_Entity, d: Direction): boolean {
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