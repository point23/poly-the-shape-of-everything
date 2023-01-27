import {_decorator, Component, EventKeyboard, input, Input, KeyCode, Node, Overflow, Quat, Vec3} from 'cc';

const {ccclass, property} = _decorator;

type Camera_Info = {
  position: {x: number, y: number, z: number};
  rotation: {x: number, y: number, z: number, w: number};
};

@ccclass('Swipe_Camera')
export class Swipe_Camera extends Component {
  @property(Node) camera_base: Node;

  onLoad() {
    this.register_event();
  }

  onDestroy() {
    this.unregister_event();
  }

  register_event() {
    input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
  }

  unregister_event() {
    input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
  }

  on_key_down(event: EventKeyboard) {
    let key_code = event.keyCode;

    switch (key_code) {
      case KeyCode.KEY_W:
        this.update_position(new Vec3(0, 1, 0));
        break;
      case KeyCode.KEY_S:
        this.update_position(new Vec3(0, -1, 0));
        break;
      case KeyCode.KEY_A:
        this.update_position(new Vec3(0, 0, -1));
        break;
      case KeyCode.KEY_D:
        this.update_position(new Vec3(0, 0, 1));
        break;
      case KeyCode.KEY_Q:
        this.update_position(new Vec3(1, 0, 0));
        break;
      case KeyCode.KEY_E:
        this.update_position(new Vec3(-1, 0, 0));
        break;
    }
  }

  update_view(info: Camera_Info) {
    if (info.position) {
      this.camera_base.setPosition(
          new Vec3(info.position.x, info.position.y, info.position.z));
    }

    if (info.rotation) {
      let out: any;
      this.camera_base.setRotation(new Quat(
          info.rotation.x, info.rotation.y, info.rotation.z, info.rotation.w));
    }
  }

  update_position(delta: Vec3) {
    this.camera_base.setPosition(this.camera_base.position.add(delta));
  }

  update_rotation(rotation: Quat) {
    this.camera_base.setRotation(rotation);
  }
}
