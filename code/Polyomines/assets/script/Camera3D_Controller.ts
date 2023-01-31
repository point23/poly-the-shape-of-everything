import {_decorator, Component, EventKeyboard, EventMouse, input, Input, KeyCode, Node, Overflow, Quat, Vec3} from 'cc';

const {ccclass, property} = _decorator;

export type Camera_Info = {
  position: {x: number, y: number, z: number};
  rotation: {x: number, y: number, z: number, w: number};
};

@ccclass('Camera3D_Controller')
export class Camera3D_Controller extends Component {
  @property(Node) camera_base: Node;

  /** TODO Allocate them all on the HEAP? */
  current_rotation: Quat = new Quat();
  last_rotation: Quat = new Quat();
  current_position: Vec3 = new Vec3();
  last_position: Vec3 = new Vec3();

  get camera_info(): Camera_Info {
    return {position: this.current_position, rotation: this.current_rotation};
  }

  public update_view(info: Camera_Info) {
    if (info.position) {
      this.current_position =
          new Vec3(info.position.x, info.position.y, info.position.z);
      this.camera_base.setPosition(this.current_position);
    }

    if (info.rotation) {
      this.current_rotation = new Quat(
          info.rotation.x, info.rotation.y, info.rotation.z, info.rotation.w);
      this.camera_base.setRotation(this.current_rotation);
    }
  }

  public transform_position(delta: Vec3) {
    this.last_position = this.camera_base.getPosition();
    this.current_position = this.last_position.add(delta);
    this.camera_base.setPosition(this.current_position);
  }

  public rotate_z(theta: number) {
    let radius = theta / 180 * Math.PI;
    this.last_rotation = this.camera_base.getRotation();
    this.current_rotation = Quat.rotateAround(
        this.current_rotation, this.last_rotation, new Vec3(0, 0, 1), radius);
    this.camera_base.setRotation(this.current_rotation);
  }
}
