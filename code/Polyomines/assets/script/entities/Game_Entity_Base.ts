import {_decorator, AnimationClip, Color, Component, Enum, MeshRenderer, Node, profiler, Quat, renderer, SkeletalAnimation, tween, Vec2, Vec3} from 'cc';

import {Const} from '../Const';
import {Game_Board} from '../Game_Board';

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

  @property(SkeletalAnimation) animation: SkeletalAnimation = null;
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

  /** TODO Rename it, Support move poly types */
  get occupied_squares(): Vec3[] {
    let res: Vec3[] = [];
    res.push(this.local_pos);

    if (this.polyomino_type == Polyomino_Type.MONOMINO) return res;

    for (let delta of
             Const.Polyomino_Deltas[this.polyomino_type][this.direction]) {
      let o = this.local_pos.clone();
      let p = o.add(delta);
      res.push(p);
    }

    return res;
  }

  //#region TEST
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
  //#endregion TEST

  async move_to_async(target: Vec3) {
    this.local_pos = target.clone();
    let world_pos = Game_Board.instance.local2world(this.local_pos);
    // this.animation.getState('walk').speed = 5;
    // this.animation.getState('walk').wrapMode = AnimationClip.WrapMode.Normal;

    // this.animation.play('walk');
    await this.physically_move_to_async(world_pos);
  }

  /* TODO Naming Issue: separate move with animation in Run-Mode and move in
   * Edit-Mode  */
  async move_towards_async(dir: Direction, step: number = 1) {
    this.logically_move_towards(dir, step);
    let world_pos = Game_Board.instance.local2world(this.local_pos);
    // this.animation.getState('walk').speed = 5;
    // this.animation.getState('walk').wrapMode = AnimationClip.WrapMode.Normal;

    // this.animation.play('walk');
    await this.physically_move_to_async(world_pos);
  }

  async face_towards_async(dir: Direction) {
    await this.rotate_to_async(dir);
  }

  move_towards(dir: Direction, step: number = 1) {
    this.logically_move_towards(dir, step);
    let world_pos = Game_Board.instance.local2world(this.local_pos);
    this.physically_move_to(world_pos);
  }

  calcu_future_pos(dir: Direction, step: number = 1): Vec3 {
    const delta = Const.Direction2Vec3[dir].clone().multiplyScalar(step);
    let current = this.local_pos.clone();
    return current.add(delta);
  }

  calcu_future_squares(dir: Direction, step: number = 1): Vec3[] {
    let res = [];
    const future_pos = this.calcu_future_pos(dir, step);
    res.push(future_pos);

    if (this.polyomino_type == Polyomino_Type.MONOMINO) return res;

    for (let delta of
             Const.Polyomino_Deltas[this.polyomino_type][this.direction]) {
      let o = future_pos.clone();
      let p = o.add(delta);
      res.push(p);
    }

    return res;
  }

  logically_move_towards(dir: Direction, step: number = 1) {
    const delta = Const.Direction2Vec3[dir].multiplyScalar(step);
    this.local_pos = this.local_pos.add(delta);
  }

  async physically_move_to_async(pos: Vec3) {
    this._info.world_pos = pos;
    tween().target(this.node).to(0.1, {position: pos}).start();
  }

  async rotate_to_async(dir: Direction) {
    this._info.direction = dir;
    tween()
        .target(this.node)
        .to(0.1, {rotation: Const.Direction2Quat[dir]})
        .start();
  }

  physically_move_to(pos: Vec3) {
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
}