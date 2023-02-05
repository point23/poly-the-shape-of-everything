import {_decorator, Vec3} from 'cc';
import {Const} from './Const';
import {Direction, Game_Entity} from './entities/Game_Entity_Base';
import {Entity_Manager} from './Entity_Manager';

export enum Move_Type {
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

  get entity(): Game_Entity {
    return Entity_Manager.instance.id2entity.get(this.entity_id);
  }

  get type(): Move_Type {
    return this.move_info.move_type;
  }

  get direction(): Direction {
    return this.move_info.direction;
  }

  get debug_info(): string {
    let res = '';
    switch (this.type) {
      case Move_Type.CONTROLLER:
        res += 'Move#' + this.move_id.toString();
        res += ' type: ' + Const.Move_Type_Names[Move_Type.CONTROLLER];
        res += ' directiuon: ' + Const.Direction_Names[this.direction];
        break;
    }
    return res;
  }
}
