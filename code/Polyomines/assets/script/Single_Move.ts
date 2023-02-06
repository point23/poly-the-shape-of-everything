import {_decorator, Vec3} from 'cc';
import {Const} from './Const';
import {Direction, Game_Entity} from './entities/Game_Entity_Base';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Move_Transaction, Transaction_Control_Flags} from './Move_Transaction';

export class Move_Info {
  duration: number;
  start_pos: Vec3;
  end_pos: Vec3;
  direction: Direction;

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

  get direction(): Direction {
    return this.move_info.direction;
  }

  execute_async() {}

  undo_async() {}

  debug_info(): string {
    return '';
  }

  try_add_it_self(transaction: Move_Transaction): boolean {
    return false;
  }
}

export class Controller_Proc_Move extends Single_Move {
  try_add_it_self(transaction: Move_Transaction): boolean {
    const entity = this.entity;
    const direction = this.direction;

    if (entity.direction != direction) {
      let move_info = new Move_Info();
      move_info.direction = direction;
      const rotate_move = new Controller_Proc_Move(entity.entity_id, move_info);
      transaction.moves.push(rotate_move);
    }

    if (transaction.control_flags &&
        Transaction_Control_Flags.CONTROLLER_MOVE) {
      return false;
    }

    const future_pos = entity.logically_move_towards(direction);
    if (!Game_Board.instance.validate_pos(future_pos)) return false;

    const other = Entity_Manager.instance.locate_entity(future_pos);
    if (other != null) {
      let move_info = new Move_Info();
      move_info.direction = direction;
      const pushed_move = new Pushed_Move(other.entity_id, move_info);

      if (!pushed_move.try_add_it_self(transaction)) {
        return false;
      }
    }

    transaction.moves.push(this);
    transaction.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;

    return true;
  }

  async execute_async() {
    if (this.entity.direction == this.direction) {
      await this.entity.move_towards_async(this.direction);
    } else {
      await this.entity.face_towards_async(this.direction);
    }
  }

  debug_info(): string {
    let res = '';
    res += 'CONTROLLER_PROC#' + this.move_id.toString();
    res += ' dir: ' + Const.Direction_Names[this.direction];
    return res;
  }
}

export class Pushed_Move extends Single_Move {
  try_add_it_self(transaction: Move_Transaction): boolean {
    const entity = this.entity;
    const direction = this.direction;

    const future_pos = entity.logically_move_towards(direction);
    if (!Game_Board.instance.validate_pos(future_pos)) {
      return false
    };

    const other = Entity_Manager.instance.locate_entity(future_pos);
    if (other != null) {
      return false;
    }

    transaction.moves.push(this);

    return true;
  }

  async execute_async() {
    await this.entity.move_towards_async(this.direction);
  }

  debug_info(): string {
    let res = '';
    res += 'PUSHED#' + this.move_id.toString();
    res += ' dir: ' + Const.Direction_Names[this.direction];
    return res;
  }
}