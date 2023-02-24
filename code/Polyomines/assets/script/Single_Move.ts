import { _decorator, Vec3 } from 'cc';

import { Const } from './Const';
import { Direction, Entity_Type } from './Enums';
import { Game_Entity } from './Game_Entity';
import { Move_Transaction } from './Move_Transaction';
import { Transaction_Control_Flags, Transaction_Manager } from './Transaction_Manager';

export class Move_Info {
    source_entity_id: number;
    target_entity_id: number;

    start_pos: Vec3;
    end_pos: Vec3;

    start_dir: Direction;
    end_dir: Direction;
    reaction_direction: Direction;

    public constructor() { }
}

/**
 * Implementation of Command Pattern
 * - Try add itself to current transaction
 * - Execute & Undo
 */
export class Single_Move {
    static move_id_seq: number = 0;
    move_id: number;
    move_info: Move_Info;

    public constructor(move_info: Move_Info) {
        this.move_id = Single_Move.move_id_seq++;

        this.move_info = move_info;
    }

    get start_dir(): Direction {
        return this.move_info.start_dir;
    }

    get end_dir(): Direction {
        return this.move_info.end_dir;
    }

    get dir_delta(): number {
        return this.end_dir - this.start_dir;
    }

    get reaction_direction(): Direction {
        return this.move_info.reaction_direction;
    }

    get start_pos(): Vec3 {
        return this.move_info.start_pos;
    }

    get end_pos(): Vec3 {
        return this.move_info.end_pos;
    }

    execute_async() { }

    debug_info(): string {
        return '';
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        return false;
    }
}

export class Controller_Proc_Move extends Single_Move {
    public constructor(entity: Game_Entity, dir: Direction, step: number = 1) {
        const move_info = new Move_Info();

        move_info.target_entity_id = entity.entity_id;
        move_info.start_dir = entity.direction;
        move_info.end_dir = dir;
        move_info.start_pos = entity.local_pos;
        move_info.end_pos = entity.calcu_future_pos(dir, step);
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        if (Transaction_Manager.instance.control_flags &&
            Transaction_Control_Flags.CONTROLLER_MOVE) {  // Already exist a Controller_Move
            return false;
        }

        const manager = transaction.entity_manager;

        // const e_source = manager.find(this.move_info.source_entity_id);
        const e_target = manager.find(this.move_info.target_entity_id);

        let at_least_rotated = false;
        const supportees: Game_Entity[] =
            manager.locate_current_supportees(e_target);

        if (this.end_dir != this.start_dir) {  // Face towards target-dir first
            let dir_delta = this.end_dir - this.start_dir;

            transaction.moves.push(new Controller_Proc_Move(e_target, this.end_dir, 0));
            this.move_info.start_dir = this.end_dir;
            at_least_rotated = true;

            if (e_target.entity_type !=
                Entity_Type.AVATAR) {  // Avator would only rotate it's indicator
                // Rotate relatively
                for (let supportee of supportees) {
                    const support_move = new Support_Move(supportee, dir_delta);
                    support_move.try_add_itself(transaction);
                }
            }
        }

        if (this.end_pos.equals(this.start_pos)) {
            return at_least_rotated;
        }

        const future_squares = e_target.calcu_future_squares(this.end_dir);

        const supporters =
            manager.locate_future_supporters(e_target, this.end_dir);
        if (supporters.length == 0) {
            return at_least_rotated;
        }

        for (let pos of future_squares) {
            const other = manager.locate_entity(pos);
            if (other != null) console.log(other.info);

            if (other != null && other != e_target) {
                const pushed_move = new Pushed_Move(other, this.end_dir);
                if (!pushed_move.try_add_itself(transaction)) {
                    /**
                     * NOTE : Interesting bugs(fixed)
                     *  - Walk into a Dynamic-Entity When face towards another dir
                     */
                    return at_least_rotated;
                }
            }
        }

        transaction.moves.push(this);
        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, 0, this.end_dir, 1);
            support_move.try_add_itself(transaction);
        }

        Transaction_Manager.instance.control_flags |=
            Transaction_Control_Flags.CONTROLLER_MOVE;

        return true;
    }

    async execute_async() {
        // if (!this.start_pos.equals(this.end_pos)) {
        //     await this.target_entity.move_to_async(this.end_pos);
        // }

        // if (this.start_dir != this.end_dir) {
        //     await this.target_entity.face_towards_async(this.end_dir);
        // }
    }

    debug_info(): string {
        let res = '';
        res += 'CONTROLLER_PROC#' + this.move_id.toString();
        res += ' entity#' + this.move_info.target_entity_id.toString();

        if (this.start_dir != this.end_dir) {  // Rotation
            res += ' rotation: from ' + Const.Direction_Names[this.start_dir] +
                ' to ' + Const.Direction_Names[this.end_dir];
        }

        if (!this.start_pos.equals(this.end_pos)) {  // Movement
            res += ' movement: from ' + this.start_pos.toString() + ' to ' +
                this.end_pos.toString();
        }
        return res;
    }
}

/**
 * NOTE
 * Interesting bugs(fixed)
 *  - Can't push domino
 */
export class Pushed_Move extends Single_Move {
    public constructor(entity: Game_Entity, dir: Direction, step: number = 1) {
        const move_info = new Move_Info();

        move_info.target_entity_id = entity.entity_id;
        move_info.start_pos = entity.local_pos;
        move_info.reaction_direction = dir;
        move_info.end_pos = entity.calcu_future_pos(dir, step);
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;

        let e_target = manager.find(this.move_info.target_entity_id);
        const direction = this.reaction_direction;

        if (e_target.entity_type == Entity_Type.STATIC) {
            return false;
        }

        const future_squares = e_target.calcu_future_squares(direction);

        const supporters = manager.locate_future_supporters(e_target, direction);
        if (supporters.length == 0) {
            /* TODO Failing */
            return false;
        }

        for (let pos of future_squares) {
            const other = manager.locate_entity(pos);
            if (other != null && other != e_target) {
                return false;
            }
        }

        const supportees = manager.locate_current_supportees(e_target);
        for (let supportee of supportees) {
            const support_move = new Support_Move(
                supportee, this.dir_delta, this.reaction_direction, 1);
            support_move.try_add_itself(transaction);
        }

        transaction.moves.push(this);
        return true;
    }

    async execute_async() {
        // await this.target_entity.move_to_async(this.end_pos);
    }

    debug_info(): string {
        let res = '';
        res += 'PUSHED#' + this.move_id.toString();
        res += ' direction ' + Const.Direction_Names[this.reaction_direction];
        return res;
    }
}

export class Support_Move extends Single_Move {
    public constructor(
        entity: Game_Entity, dir_delta: number, reaction_direction: Direction = 0,
        step: number = 0) {
        const move_info = new Move_Info();

        move_info.target_entity_id = entity.entity_id;
        move_info.start_dir = entity.direction;
        move_info.end_dir = (entity.direction + dir_delta + 4) % 4;
        move_info.reaction_direction = reaction_direction;
        move_info.start_pos = entity.local_pos;
        move_info.end_pos = entity.calcu_future_pos(reaction_direction, step);
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        const manager = transaction.entity_manager;

        let e_target = manager.find(this.move_info.target_entity_id);

        const supportees = manager.locate_current_supportees(e_target);
        for (let supportee of supportees) {
            const support_move = new Support_Move(
                supportee, this.dir_delta, this.reaction_direction, 1);
            support_move.try_add_itself(transaction);
        }

        transaction.moves.push(this);
        return true;
    }

    async execute_async() {
        // if (!this.start_pos.equals(this.end_pos)) {
        //     await this.target_entity.move_to_async(this.end_pos);
        // }

        // if (this.start_dir != this.end_dir) {
        //     await this.target_entity.face_towards_async(this.end_dir);
        // }
    }

    debug_info(): string {
        let res = '';
        res += 'SUPPORT#' + this.move_id.toString();
        if (this.start_dir != this.end_dir) {  // Rotation
            res += ' rotation: from ' + Const.Direction_Names[this.start_dir] +
                ' to ' + Const.Direction_Names[this.end_dir];
        }

        if (!this.start_pos.equals(this.end_pos)) {  // Movement
            res += ' movement: from ' + this.start_pos.toString() + ' to ' +
                this.end_pos.toString();
        }
        return res;
    }
}

export class Possess_Move extends Single_Move {
    public constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.source_entity_id = entity.entity_id;
        move_info.start_pos = entity.local_pos;
        move_info.start_dir = move_info.end_dir = entity.direction;
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
