import {_decorator, Component, MeshRenderer, Node, profiler, Quat, renderer, Vec2, Vec3} from 'cc';
import {Const} from '../Const';

const {ccclass, property} = _decorator;

@ccclass('Game_Entity')
export class Game_Entity extends Component {
  @property(MeshRenderer) renderable: MeshRenderer = null;

  //#region Cache Game Entity info
  private _world_pos: Vec3 = null;
  private _local_pos: Vec3 = null;
  private _rotation: Quat = null;
  private _selected: boolean = false;

  private _prefab_id: string = null;
  //#endregion

  init(world_pos: Vec3, rotation: Quat, local_pos: Vec3, prefab_id: string) {
    this.world_pos = world_pos;
    this.rotation = rotation;
    this.local_pos = local_pos;

    this._prefab_id = prefab_id;
  }

  get prefab_id(): string {
    return this._prefab_id;
  }

  get local_pos(): Vec3 {
    return this._local_pos;
  }

  set local_pos(pos: Vec3) {
    this._local_pos = pos;
  }

  set world_pos(pos: Vec3) {
    this._world_pos = pos;
    this.node.setPosition(pos);
  }

  get world_pos(): Vec3 {
    return this._world_pos;
  }

  set rotation(rot: Quat) {
    this._rotation = rot;
    this.node.setRotation(rot);
  }

  get rotation(): Quat {
    return this._rotation;
  }

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

  rotate_clockwise() {
    let new_rot: Quat = new Quat();
    const rad = 0.5 * Math.PI;
    Quat.rotateY(new_rot, this.rotation, rad);
    this.rotation = new_rot;
  }
}