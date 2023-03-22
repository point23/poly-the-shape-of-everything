import { _decorator, Vec3 } from 'cc';
import { Const, same_position, String_Builder } from './Const';
import { Entity_Manager } from './Entity_Manager';
import {
    calcu_entity_future_position,
    reversed_direction,
    Direction,
    Entity_Type,
    Game_Entity,
    Polyomino_Type,
    orthogonal_direction,
    same_direction,
    locate_entities_in_target_direction,
    calcu_target_direction
} from './Game_Entity';
import { Move_Transaction } from './Move_Transaction';
import { Transaction_Control_Flags, Transaction_Manager } from './Transaction_Manager';

export enum Move_Flags {
    ROTATED = 1 << 0,
    MOVED = 1 << 1,
    DEFERRED = 1 << 2,
}

export function sanity_check(transaction: Move_Transaction, move: Single_Move) {
    function exist_in_another_move(another: Game_Entity): boolean {
        for (let another_move of transaction.moves) {
            if (another_move.target_entity_id == another.id
                && is_dirty(another_move, Move_Flags.MOVED))
                return true;
        }
        return false;
    }
    //#SCOPE

    if (!is_dirty(move, Move_Flags.MOVED)) return true;
    const manager = transaction.entity_manager;
    const target = manager.find(move.target_entity_id);

    if (move instanceof Falling_Move) {
        function supporter_no_longer_exist() {
            const possible_supporters = manager.locate_supporters(move.end_position, 1);
            let at_least_one_supporter: boolean = false;
            for (let supporter of possible_supporters) {
                if (exist_in_another_move(supporter)) continue;

                at_least_one_supporter = true;
                break;
            }

            return at_least_one_supporter;
        }

        function resolve_new_supporter() {
            let at_least_one_supporter: boolean = false;
            for (let depth = 2; depth <= 10; depth++) {
                const possible_supporters = manager.locate_supporters(move.end_position, depth);
                for (let supporter of possible_supporters) {
                    if (exist_in_another_move(supporter)) continue;

                    console.log("SANITY CHECK: NEW SUPPORTER");
                    at_least_one_supporter = true;
                    move.info.end_position = supporter.position.add(Vec3.UNIT_Z);
                    break;
                }
                if (at_least_one_supporter) break;
            }
        }
        //#SCOPE

        if (!supporter_no_longer_exist()) {
            resolve_new_supporter();
        }
        return true;
    }

    const other_entities = manager.locate_entities(move.end_position);

    if (other_entities.length == 0) return true;

    for (let another_entity of other_entities) {
        if (another_entity.id == target.id) continue;
        if (exist_in_another_move(another_entity)) continue;
        return false;
    }

    return true;
}

export function hit_the_barrier(m: Entity_Manager, e: Game_Entity, d: Direction) {
    for (let other of m.locate_current_supporters(e)) {
        if (other.entity_type == Entity_Type.FENCE) {
            // @note Can't pass through when there's a fence on the future square
            // _______
            // |      ||
            // | -x-> ||
            // |______||
            const fence = other;
            if (same_direction(fence.orientation, d)) {
                return true;
            }
        }

        if (other.entity_type == Entity_Type.BRIDGE) {
            // @note Can't get off the bridge halfway
            // |  ↑  |
            // |<-x->| 
            // |  ↓  |
            const bridge = other;
            if (orthogonal_direction(bridge.orientation, d)) {
                return true;
            }
        };
    }
    return false;
}

export function blocked_by_barrier(m: Entity_Manager, e: Game_Entity, d: Direction): boolean {
    for (let supporter of m.locate_future_supporters(e, d)) {
        if (supporter.entity_type == Entity_Type.BRIDGE) {
            // @note Can't walk on the bridge halfway.
            // |  ↑  |
            // |     | <-x-
            // |  ↓  |
            const bridge = supporter;
            if (orthogonal_direction(bridge.rotation, d)) {
                return true;
            }
        };

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

export function try_push_others(t: Move_Transaction, e: Game_Entity, d: Direction): { pushed: boolean, push_succeed: boolean } {
    const res = { pushed: false, push_succeed: true };
    const manager = t.entity_manager;

    for (let other of locate_entities_in_target_direction(manager, e, d)) {
        if (other == null) continue;
        if (other == e) continue;

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

function possible_falling(t: Move_Transaction, e: Game_Entity, d: Direction): { fell: boolean, fall_succeed: boolean } {
    const res = {
        fell: false,
        fall_succeed: true,
    };
    const manager = t.entity_manager;
    const supporters = manager.locate_future_supporters(e, d);
    if (supporters.length == 0) {
        const falling_move = new Falling_Move(e, d);
        if (falling_move.try_add_itself(t))
            res.fall_succeed = true;
        else
            res.fall_succeed = false;
        res.fell = true;
    }
    return res;
}

function possible_win(m: Entity_Manager, e: Game_Entity, d: Direction) {
    for (let other of m.locate_future_supporters(e, d)) {
        if (other.entity_type == Entity_Type.CHECKPOINT) {
            m.pending_win = true;
        }
    }
}

export function move_supportees(transaction: Move_Transaction, e_target: Game_Entity, position_delta: Vec3, rotation_delta: number) {
    const manager = transaction.entity_manager;
    for (let supportee of manager.locate_current_supportees(e_target)) {
        const support_move = new Support_Move(supportee, rotation_delta, position_delta);
        support_move.try_add_itself(transaction);
    }
}

// Physically Update Entities
export function may_move_entity(move: Single_Move, manager: Entity_Manager, entity: Game_Entity) {
    if (!is_dirty(move, Move_Flags.MOVED)) return;
    manager.move_entity(entity, move.end_position);
}

export function may_rotate_entity(move: Single_Move, manager: Entity_Manager, entity: Game_Entity) {
    if (!is_dirty(move, Move_Flags.ROTATED)) return;
    manager.rotate_entity(entity, move.end_direction);
}

// === LOG STUFF ===
export function log_target_entity(builder: String_Builder, move: Single_Move) {
    builder.append('\n-   entity#').append(move.info.target_entity_id);
}

export function maybe_log_movement(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move, Move_Flags.MOVED)) return;

    builder.append('\n-   movement: from ')
        .append(move.start_position.toString())
        .append(' to ')
        .append(move.end_position.toString());
}

export function maybe_log_rotation(builder: String_Builder, move: Single_Move) {
    if (!is_dirty(move, Move_Flags.ROTATED)) return;

    builder.append('\n-   rotation: from ')
        .append(Const.Direction_Names[move.start_direction])
        .append(' to ')
        .append(Const.Direction_Names[move.end_direction]);
}

function can_push(e_source: Game_Entity, e_target: Game_Entity): boolean {
    if (e_target.entity_type == Entity_Type.STATIC
        || e_target.entity_type == Entity_Type.CHECKPOINT
        || e_target.entity_type == Entity_Type.SWITCH)
        return false;

    if (e_source.entity_type != Entity_Type.ROVER
        && e_target.entity_type == Entity_Type.ROVER)
        return false;
    return true;
}

// === FLAG STUFF ===
function is_dirty(move: Single_Move, f: number): boolean {
    return (move.flags & f) != 0;
}

export function set_dirty(move: Single_Move, f: number) {
    move.flags |= f;
}

function already_exist_one(f: number): boolean {
    if (Transaction_Manager.instance.control_flags & f) {
        return true;
    }
    return false;
}

export class Move_Info {
    source_entity_id: number;
    target_entity_id: number;

    start_position: Vec3;
    end_position: Vec3;

    start_direction: Direction;
    end_direction: Direction;
    reaction_direction: Direction;

    public constructor() { }
}

export class Single_Move {
    static serial_idx = 1;
    static get next_id(): number { return Single_Move.serial_idx++ };

    id: number;
    info: Move_Info;
    flags: number;

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

    execute_async(transaction: Move_Transaction) { }

    debug_info(): string { return ''; }
}

export class Controller_Proc_Move extends Single_Move {
    public constructor(entity: Game_Entity, direction: Direction, step: number = 1) {
        const move_info = new Move_Info();
        move_info.target_entity_id = entity.id;
        move_info.start_direction = entity.orientation;
        move_info.end_direction = direction;
        move_info.start_position = entity.position;
        move_info.end_position = calcu_entity_future_position(entity, direction, step);
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        function may_rotate(): boolean {
            if (!same_direction(start_direction, end_direction)) {
                // Face to target direction if it's not currently oriented to that direction.
                const delta = end_direction - start_direction;
                let rotate_move = new Controller_Proc_Move(e_target, end_direction, 0)
                set_dirty(rotate_move, Move_Flags.ROTATED);
                transaction.moves.push(rotate_move);
                if (e_target.entity_type != Entity_Type.AVATAR) {
                    // Avators would only rotate it's indicator 
                    move_supportees(transaction, e_target, Vec3.ZERO, delta);
                }
                return true;
            }
            return false;
        }
        //#SCOPE

        if (already_exist_one(Transaction_Control_Flags.CONTROLLER_MOVE)) return false;

        const manager = transaction.entity_manager;
        const e_target = manager.find(this.info.target_entity_id);
        const start_direction = this.start_direction;
        const end_direction = this.end_direction;
        const start_position = this.start_position;
        const end_position = this.end_position;

        const at_least_rotated = may_rotate();

        if (same_position(start_position, end_position)) return at_least_rotated;
        if (hit_the_barrier(manager, e_target, end_direction)) return at_least_rotated;

        const push_res = try_push_others(transaction, e_target, end_direction);
        if (push_res.pushed && !push_res.push_succeed) return at_least_rotated;

        const fall_res = possible_falling(transaction, e_target, end_direction);
        if (fall_res.fell) return (fall_res.fall_succeed || at_least_rotated);

        if (blocked_by_barrier(manager, e_target, end_direction)) return at_least_rotated;

        possible_win(manager, e_target, end_direction);
        transaction.moves.push(this);

        // Update entities that are supported by target entity
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        move_supportees(transaction, e_target, position_delta, 0);

        // Update transaction control flags
        Transaction_Manager.instance.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;
        this.flags |= Move_Flags.MOVED;

        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        may_move_entity(this, manager, entity);
        may_rotate_entity(this, manager, entity);
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('CONTROLLER_PROC#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_rotation(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

export class Pushed_Move extends Single_Move {
    public constructor(source: Game_Entity, target: Game_Entity, direction: Direction, step: number = 1) {
        const move_info = new Move_Info();
        move_info.source_entity_id = source.id;
        move_info.target_entity_id = target.id;
        move_info.start_position = target.position;
        move_info.reaction_direction = direction;
        move_info.end_position = calcu_entity_future_position(target, direction, step);
        super(move_info);
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

        const res = possible_falling(transaction, e_target, direction);
        if (res.fell) { return res.fall_succeed; }

        move_supportees(transaction, e_target, position_delta, 0);
        transaction.moves.push(this);

        set_dirty(this, Move_Flags.MOVED);
        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        manager.move_entity(entity, this.end_position);
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('PUSHED#').append(this.id);
        log_target_entity(builder, this);
        maybe_log_movement(builder, this);
        return builder.to_string();
    }
}

export class Support_Move extends Single_Move {
    public constructor(entity: Game_Entity, direction_delta: number, position_delta: Vec3 = Vec3.ZERO) {
        const move_info = new Move_Info();
        move_info.target_entity_id = entity.id;
        move_info.start_direction = entity.orientation;
        move_info.end_direction = calcu_target_direction(entity.orientation, direction_delta);
        move_info.start_position = entity.position;
        move_info.end_position = new Vec3(move_info.start_position).add(position_delta)
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;
        const e_target = manager.find(this.info.target_entity_id);
        const direction_delta = this.end_direction - this.start_direction;
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        move_supportees(transaction, e_target, position_delta, direction_delta);

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);
        if (this.start_direction != this.end_direction)
            set_dirty(this, Move_Flags.ROTATED);

        transaction.moves.push(this);
        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        may_move_entity(this, manager, entity);
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

export class Falling_Move extends Single_Move {
    public constructor(entity: Game_Entity, direction: Direction) {
        const move_info = new Move_Info();
        move_info.target_entity_id = entity.id;
        move_info.start_position = entity.position;
        move_info.start_direction = move_info.end_direction = direction;
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;

        const entity = manager.find(this.target_entity_id);
        const dir = this.start_direction;

        const supporters = manager.locate_future_supporters(entity, dir, 10); // @hack
        if (supporters.length == 0)
            return false;

        if (entity.entity_type == Entity_Type.HERO) {
            for (let supporter of supporters) {
                if (supporter.entity_type == Entity_Type.CHECKPOINT) {
                    manager.pending_win = true;
                }
            }
        }

        let future_pos = calcu_entity_future_position(entity, dir);
        future_pos.z = supporters[0].position.z + 1;
        this.info.end_position = future_pos;

        set_dirty(this, Move_Flags.MOVED);
        transaction.moves.push(this);

        const supportees = manager.locate_current_supportees(entity);
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, 0, position_delta);
            support_move.try_add_itself(transaction);
        }

        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        may_move_entity(this, manager, entity);
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

        // transaction.moves.push(this);
        // return true;

        return false; // @hack
    }

    async execute_async() {
        // Entity_Manager.instance.reclaim(this.source_entity);
        // this.target_entity.entity_type = Entity_Type.AVATAR;
        // Entity_Manager.instance.current_character = this.target_entity;
    }
}
