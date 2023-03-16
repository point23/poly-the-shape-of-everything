import { _decorator, Vec3 } from 'cc';
import { Const, String_Builder } from './Const';
import { calcu_entity_future_position, calcu_entity_future_squares, Direction, Entity_Type, Game_Entity, Polyomino_Type } from './Game_Entity';
import { Move_Transaction } from './Move_Transaction';
import { Transaction_Control_Flags, Transaction_Manager } from './Transaction_Manager';

export enum Move_Flags {
    ROTATED = 1 << 0,
    MOVED = 1 << 1,
    DEFERRED = 1 << 2,
}

// @hack
function same_position(a: Vec3, b: Vec3): boolean {
    return a.x == b.x && a.y == b.y && a.z == b.z;
}

function calcu_target_direction(d: Direction, delta: number): Direction {
    return (d + delta + 4) % 4;
}

class Move_Info {
    source_entity_id: number;
    target_entity_id: number;

    start_position: Vec3;
    end_position: Vec3;

    start_direction: Direction;
    end_direction: Direction;
    reaction_direction: Direction;

    public constructor() { }
}

/**
 * Implementation of Command Pattern
 * - Try add itself to current transaction
 * - Execute & Undo
 */
export class Single_Move {
    static serial_idx = 1;
    static get next_id(): number { return Single_Move.serial_idx++ };

    id: number;
    info: Move_Info;

    // Flags
    flags: number;
    get is_deferred(): boolean { return (this.flags & Move_Flags.DEFERRED) != 0; }

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
        if (Transaction_Manager.instance.control_flags & Transaction_Control_Flags.CONTROLLER_MOVE) {
            // Already exist a Controller_Move
            return false;
        }

        const manager = transaction.entity_manager;
        const e_target = manager.find(this.info.target_entity_id);
        const supportees: Game_Entity[] = manager.locate_current_supportees(e_target);
        let at_least_rotated = false;

        // Face to target direction if it's not currently oriented to that direction.
        if (this.end_direction != this.start_direction) {
            const direction_delta = this.end_direction - this.start_direction;
            let rotate_move = new Controller_Proc_Move(e_target, this.end_direction, 0)
            rotate_move.flags |= Move_Flags.ROTATED;
            transaction.moves.push(rotate_move);
            this.info.start_direction = this.end_direction;
            at_least_rotated = true;

            if (e_target.entity_type != Entity_Type.AVATAR) {
                // Avators would only rotate it's indicator 
                for (let supportee of supportees) {
                    const support_move = new Support_Move(supportee, direction_delta);
                    support_move.try_add_itself(transaction); // @todo Handle if failed to move the supportees
                }
            }
        }

        if (same_position(this.start_position, this.end_position))
            return at_least_rotated;

        let walk_on_bridge: boolean = false;
        const future_squares = calcu_entity_future_squares(e_target, this.end_direction);

        // Detect if there are any existed entity in target position.
        for (let pos of future_squares) {
            const other = manager.locate_entity(pos);

            if (other == null) continue;
            if (other == e_target) continue;

            // Can pass through the channel entities like bridge, gate... 
            if (other.entity_type == Entity_Type.BRIDGE) {
                walk_on_bridge = true;
                continue;
                // @implementMe You can only cross the bridge in certain directions...
            };

            if (other.entity_type == Entity_Type.GATE) {
                // If it's a gate, then only monominoes can pass through 
                if (same_position(other.position, pos) && e_target.polyomino_type == Polyomino_Type.MONOMINO)
                    continue;
                else {
                    return at_least_rotated;
                }
            }

            const pushed_move = new Pushed_Move(e_target, other, this.end_direction);

            if (!pushed_move.try_add_itself(transaction)) {
                return at_least_rotated;
            }
        }

        const supporters = manager.locate_future_supporters(e_target, this.end_direction);
        if (!walk_on_bridge) {
            // Fall if there're no valid supporters
            if (supporters.length == 0) {
                const falling_move = new Falling_Move(e_target, this.end_direction);
                if (falling_move.try_add_itself(transaction))
                    return true;
                return at_least_rotated;
            }
        }

        // Reached the checkpoint, hey, you win...
        for (let s of supporters) {
            if (s.entity_type == Entity_Type.CHECKPOINT) {
                manager.pending_win = true;
            }
        }

        transaction.moves.push(this);

        // Update entities that are supported by target entity
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);
        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, 0, position_delta);
            support_move.try_add_itself(transaction);
        }

        // Update transaction control flags
        Transaction_Manager.instance.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;
        this.flags |= Move_Flags.MOVED;

        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (this.flags & Move_Flags.MOVED) {
            manager.move_entity(entity, this.end_position);
        }

        if (this.flags & Move_Flags.ROTATED) {
            manager.rotate_entity(entity, this.end_direction)
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('CONTROLLER_PROC#').append(this.id);
        builder.append('\n-   entity#').append(this.info.target_entity_id);

        if (this.flags & Move_Flags.ROTATED) {
            // Rotation
            builder.append('\n-   rotation: from ')
                .append(Const.Direction_Names[this.start_direction])
                .append(' to ')
                .append(Const.Direction_Names[this.end_direction]);
        }

        if (this.flags & Move_Flags.MOVED) {
            // Movement
            builder.append('\n-   movement: from ')
                .append(this.start_position.toString())
                .append(' to ')
                .append(this.end_position.toString());
        }

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

        let e_target = manager.find(this.info.target_entity_id);
        const direction = this.reaction_direction;

        if (e_target.entity_type == Entity_Type.STATIC ||
            e_target.entity_type == Entity_Type.CHECKPOINT) {
            return false;
        }

        const future_squares = calcu_entity_future_squares(e_target, this.reaction_direction);

        const supporters = manager.locate_future_supporters(e_target, direction);

        if (supporters.length == 0) {
            const falling_move = new Falling_Move(e_target, this.reaction_direction);
            if (falling_move.try_add_itself(transaction))
                return true;
            return false;
        }

        for (let pos of future_squares) {
            const other = manager.locate_entity(pos);
            if (other != null && other != e_target) {
                return false;
            }
        }

        const supportees = manager.locate_current_supportees(e_target);
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, 0, position_delta);
            support_move.try_add_itself(transaction);
        }

        transaction.moves.push(this);
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
        builder.append('\n-   direction ')
            .append(Const.Direction_Names[this.reaction_direction]);

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

        let e_target = manager.find(this.info.target_entity_id);

        const supportees = manager.locate_current_supportees(e_target);
        const direction_delta = this.end_direction - this.start_direction;
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, direction_delta, position_delta);
            support_move.try_add_itself(transaction);
        }

        if (!same_position(this.start_position, this.end_position))
            this.flags |= Move_Flags.MOVED;
        if (this.start_direction != this.end_direction)
            this.flags |= Move_Flags.ROTATED;
        transaction.moves.push(this);
        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (this.flags & Move_Flags.MOVED) {
            manager.move_entity(entity, this.end_position);
        }

        if (this.flags & Move_Flags.ROTATED) {
            manager.rotate_entity(entity, this.end_direction);
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('SUPPORT#').append(this.id);
        builder.append('\n-   entity#').append(this.info.target_entity_id);
        if (this.flags & Move_Flags.ROTATED) {
            // Rotation
            builder.append('\n-   rotation: from ')
                .append(Const.Direction_Names[this.start_direction])
                .append(' to ')
                .append(Const.Direction_Names[this.end_direction]);
        }

        if (this.flags & Move_Flags.MOVED) {
            // Movement
            builder.append('\n-   movement: from ')
                .append(this.start_position.toString())
                .append(' to ')
                .append(this.end_position.toString());
        }

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

        const supporters = manager.locate_future_supporters(entity, dir, 10);

        if (supporters.length == 0)
            return false;

        let future_pos = calcu_entity_future_position(entity, dir);
        future_pos.z = supporters[0].position.z + 1;
        this.info.end_position = future_pos;
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
        manager.move_entity(entity, this.end_position);
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('FALLING#').append(this.id);
        builder.append('\n-   entity#').append(this.info.target_entity_id);
        builder.append('\n-   from ')
            .append(this.start_position.toString())
            .append(' to ')
            .append(this.end_position.toString());

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
