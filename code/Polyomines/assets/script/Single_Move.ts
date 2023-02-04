import {_decorator, Vec3} from 'cc';
import {Direction} from './entities/Game_Entity_Base';

export enum Move_Type {
  NONE,
  CONTROLLER,
  PULLED,
  PUSHED,
}

export class Move_Info {
  move_type: Move_Type;
  duration: number;
  start_pos: Vec3;
  end_pos: Vec3;
  direction: Direction;

  public constructor() {}
}

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
}
