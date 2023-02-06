import {_decorator, Vec3} from 'cc';
import {Const} from './Const';
import {Direction, Entity_Type, Game_Entity} from './entities/Game_Entity_Base';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Move_Transaction} from './Move_Transaction';
import {Transaction_Control_Flags, Transaction_Manager} from './Transaction_Manager';

export class Move_Info {
  duration: number;
  start_pos: Vec3;
  end_pos: Vec3;
  start_dir: Direction;
  end_dir: Direction;

  public constructor() {}
}

/**
 * Implementation of Command Pattern
 * - Try add itself to current transaction
 * - Execute & Undo
 */
export class Single_Move {
  static move_id_seq: number = 0;
  move_id: number;
  entity_id: number;
  move_info: Move_Info;

  public constructor(entity_id: number, move_info: Move_Info) {
    this.move_id = Single_Move.move_id_seq++;

    this.entity_id = entity_id;
    this.move_info = move_info;
  }

  get entity(): Game_Entity {
    return Entity_Manager.instance.id2entity.get(this.entity_id);
  }

  get start_dir(): Direction {
    return this.move_info.start_dir;
  }

  set start_dir(dir: Direction) {
    this.move_info.start_dir = dir;
  }

  get end_dir(): Direction {
    return this.move_info.end_dir;
  }

  get start_pos(): Vec3 {
    return this.move_info.start_pos;
  }

  get end_pos(): Vec3 {
    return this.move_info.end_pos;
  }

  execute_async() {}

  undo_async() {}

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
    move_info.start_dir = entity.direction;
    move_info.end_dir = dir;
    move_info.start_pos = entity.local_pos;
    move_info.end_pos = entity.calcu_future_pos(dir, step);
    super(entity.entity_id, move_info);
  }

  try_add_itself(transaction: Move_Transaction): boolean {
    if (Transaction_Manager.instance.control_flags &&
        Transaction_Control_Flags
            .CONTROLLER_MOVE) {  // Already exist an Controller_Move
      return false;
    }

    const entity = this.entity;
    let at_least_rotated = false;

    if (this.end_dir != this.start_dir) {  // Face towards target dir first
      transaction.moves.push(new Controller_Proc_Move(entity, this.end_dir, 0));
      this.start_dir = this.end_dir;
      at_least_rotated = true;
    }

    const future_pos = this.end_pos;
    if (!Game_Board.instance.validate_pos(future_pos)) return at_least_rotated;

    const other = Entity_Manager.instance.locate_entity(future_pos);
    if (other != null) {
      const pushed_move = new Pushed_Move(other, this.end_dir);

      if (!pushed_move.try_add_itself(transaction)) {
        /**
         * NOTE : Interesting bugs(fixed)
         *  - Walk into a Dynamic-Entity When face towards another dir
         */
        return at_least_rotated;
      }
    }

    transaction.moves.push(this);
    Transaction_Manager.instance.control_flags |=
        Transaction_Control_Flags.CONTROLLER_MOVE;

    return true;
  }

  async execute_async() {
    if (!this.start_pos.equals(this.end_pos)) {
      await this.entity.move_to_async(this.end_pos);
    }

    if (this.start_dir != this.end_dir) {
      await this.entity.face_towards_async(this.end_dir);
    }
  }

  async undo_async() {}

  debug_info(): string {
    let res = '';
    res += 'CONTROLLER_PROC#' + this.move_id.toString();

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
    move_info.start_pos = entity.local_pos;
    move_info.start_dir = move_info.end_dir = dir;
    move_info.end_pos = entity.calcu_future_pos(dir, step);
    super(entity.entity_id, move_info);
  }

  try_add_itself(transaction: Move_Transaction): boolean {
    const entity = this.entity;
    const direction = this.end_dir;

    if (entity.entity_type == Entity_Type.STATIC) {
      return false;
    }

    const future_squares = entity.calcu_future_squares(direction);
    for (let pos of future_squares) {
      const other = Entity_Manager.instance.locate_entity(pos);
      if (other != null && other != entity) {
        return false;
      }
    }

    transaction.moves.push(this);
    return true;
  }

  async execute_async() {
    await this.entity.move_to_async(this.end_pos);
  }

  debug_info(): string {
    let res = '';
    res += 'PUSHED#' + this.move_id.toString();
    res +=
        ' from ' + this.start_pos.toString() + ' to ' + this.end_pos.toString();
    return res;
  }
}