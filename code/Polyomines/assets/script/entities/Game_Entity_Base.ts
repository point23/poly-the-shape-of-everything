import {_decorator, Component, MeshRenderer, Node, profiler, Quat, renderer, Vec2, Vec3} from 'cc';
import {Const} from '../Const';

const {ccclass, property} = _decorator;

@ccclass('Game_Entity')
export class Game_Entity extends Component {
  @property(MeshRenderer) renderable: MeshRenderer = null;

  //#region Cache Game Entity info
  private _position: Vec3 = null;
  private _rotation: Quat = null;
  private _coord: Vec2 = null;
  private _prefab_id: string = null;
  private _selected: boolean = false;
  //#endregion

  get prefab_id(): string {
    return this._prefab_id;
  }

  get coord(): Vec2 {
    return this._coord;
  }

  set coord(coord: Vec2) {
    this._coord = coord;
  }

  set position(pos: Vec3) {
    this._position = pos;
    this.node.setPosition(pos);
  }

  get position(): Vec3 {
    return this._position;
  }

  set rotation(rot: Quat) {
    this._rotation = rot;
    this.node.setRotation(rot);
  }

  get rotation(): Quat {
    return this._rotation;
  }

  init(position: Vec3, rotation: Quat, coord: Vec2, prefab_id: string) {
    this.position = position;
    this.rotation = rotation;
    this._coord = coord;
    this._prefab_id = prefab_id;
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
}