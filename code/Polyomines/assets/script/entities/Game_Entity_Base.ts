import {_decorator, Component, MeshRenderer, Node, profiler, Quat, renderer, Vec2, Vec3} from 'cc';
import {Const} from '../Const';

const {ccclass, property} = _decorator;

export class Entity_Info {
  prefab: string;
  local_pos: Vec3;
  world_pos: Vec3;
  direction: Direction;
  poly_type: Polyomino_Type;

  public constructor(info: any) {
    this.prefab = info.prefab;
    this.local_pos =
        new Vec3(info.local_pos.x, info.local_pos.y, info.local_pos.z);
    this.direction = info.direction;
    this.poly_type = info.poly_type;
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
  @property(MeshRenderer) renderable: MeshRenderer = null;

  _info: Entity_Info;
  private _selected: boolean = false;

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

  get poly_type(): Polyomino_Type {
    return this._info.poly_type;
  }

  get local_pos(): Vec3 {
    return this._info.local_pos;
  }

  set local_pos(pos: Vec3) {
    this._info.local_pos = pos;
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
  set selected(is_selected: boolean) {
    this._selected = is_selected;
    const mat = this.renderable.material;

    if (is_selected) {
      mat.setProperty('albedoScale', Const.Selected_Albedo_Scale);
    } else {
      mat.setProperty('albedoScale', Const.Normal_Albedo_Scale);
    }
  }

  get selected(): boolean {
    return this._selected;
  }
}