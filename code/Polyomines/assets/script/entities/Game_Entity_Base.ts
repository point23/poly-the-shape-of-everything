import {_decorator, Color, Component, Enum, MeshRenderer, Node, profiler, Quat, renderer, Vec2, Vec3} from 'cc';

import {Const} from '../Const';

const {ccclass, property} = _decorator;

export class Entity_Info {
  prefab: string;
  local_pos: Vec3;
  world_pos: Vec3;
  direction: Direction;

  public constructor(info: any) {
    this.prefab = info.prefab;
    this.local_pos =
        new Vec3(info.local_pos.x, info.local_pos.y, info.local_pos.z);
    this.direction = info.direction;
  }
};

export enum Direction {
  RIGHT,
  LEFT,
  FORWARD,
  BACKWORD,
  UP,
  DOWN,
}

export enum Entity_Type {
  STATIC,
  DYNAMIC,
  CHARACTER,
}

export enum Polyomino_Type {
  /* Monomino:
     _ _ _
    |     |
    |  o  |
    |_ _ _|
   */
  MONOMINO,
  /* Domino:
     _ _ _ _ _ _
    |     |     |
    |  o  |     |
    |_ _ _|_ _ _|
   */
  DOMINO,
  /* Straight-Tromino:
     _ _ _ _ _ _ _ _ _
    |     |     |     |
    |     |  o  |     |
    |_ _ _|_ _ _|_ _ _|
   */
  STRAIGHT_TROMINO,
  /* L-Tromino:
     _ _ _
    |     |
    |     |
    |_ _ _|_ _ _
    |     |     |
    |  o  |     |
    |_ _ _|_ _ _|
   */
  L_TROMINO,
}

@ccclass('Game_Entity')
export class Game_Entity extends Component {
  static entity_id_seq: number = 0;
  static get next_id(): number {
    return this.entity_id_seq++;
  }

  @property(MeshRenderer) editing_cover: MeshRenderer = null;
  @property({type: Enum(Polyomino_Type)})
  polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;
  @property({type: Enum(Entity_Type)})
  entity_type: Entity_Type = Entity_Type.STATIC;

  entity_id: number;
  _info: Entity_Info;

  get info(): Entity_Info {
    return this._info;
  }

  set info(info: Entity_Info) {
    this._info = info;

    this.node.setRTS(
        Const.Direction2Quat[info.direction], info.world_pos,
        new Vec3(1, 1, 1));
  }

  get prefab(): string {
    return this._info.prefab;
  }

  get local_pos(): Vec3 {
    return this._info.local_pos;
  }

  set local_pos(pos: Vec3) {
    this._info.local_pos = pos;
  }

  get direction(): Direction {
    return this._info.direction;
  }

  // TEST
  /** TODO Rename it */
  get occupied_positions(): Vec3[] {
    let result: Vec3[] = [];
    result.push(this.local_pos);

    if (this.polyomino_type == Polyomino_Type.MONOMINO) return result;

    for (let delta of
             Const.Polyomino_Deltas[this.polyomino_type][this.direction]) {
      let o = this.local_pos.clone();
      let p = o.add(delta);
      result.push(p);
    }

    return result;
  }

  private _valid: boolean = true;
  set valid(is_valid: boolean) {
    this._valid = is_valid;
    const mat = this.editing_cover.material;

    /* FIXME Change them into flags */
    if (is_valid) {
      if (!this.selected) {
        mat.setProperty('mainColor', Const.Cover_Normal_Color);
      } else {
        mat.setProperty('mainColor', Const.Cover_Selected_Color);
      }
    } else {
      mat.setProperty('mainColor', Const.Cover_Invalid_Color);
    }
  }
  get valid(): boolean {
    return this._valid;
  }

  logically_move_towards(dir: Direction, step: number = 1) {
    const delta = Const.Direction2Vec3[dir].multiplyScalar(step);
    this.local_pos = this.local_pos.add(delta);
  }

  move_to(pos: Vec3) {
    this._info.world_pos = pos;
    this.node.setPosition(pos);
  }

  rotate_to(dir: Direction) {
    this._info.direction = dir;
    this.node.setRotation(Const.Direction2Quat[dir]);
  }

  rotate_clockwise_horizontaly() {
    let new_dir: Direction = null;

    switch (this._info.direction) {
      case Direction.RIGHT:
        new_dir = Direction.FORWARD;
        break;
      case Direction.FORWARD:
        new_dir = Direction.LEFT;
        break;
      case Direction.LEFT:
        new_dir = Direction.BACKWORD;
        break;
      case Direction.BACKWORD:
        new_dir = Direction.RIGHT;
        break;
    }

    this.rotate_to(new_dir);
  }

  // TEST
  private _selected: boolean = false;
  set selected(is_selected: boolean) {
    this._selected = is_selected;
    const mat = this.editing_cover.material;

    /* FIXME Change them into flags */
    if (is_selected) {
      mat.setProperty('mainColor', Const.Cover_Selected_Color);
    } else {
      if (this.valid) {
        mat.setProperty('mainColor', Const.Cover_Normal_Color);
      } else {
        mat.setProperty('mainColor', Const.Cover_Invalid_Color);
      }
    }
  }

  get selected(): boolean {
    return this._selected;
  }
}