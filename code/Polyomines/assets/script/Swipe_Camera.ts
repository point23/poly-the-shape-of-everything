import {_decorator, Component, EventKeyboard, EventMouse, input, Input, KeyCode, Node, Overflow, Quat, Vec3} from 'cc';

const {ccclass, property} = _decorator;

type Camera_Info = {
  position: {x: number, y: number, z: number};
  rotation: {x: number, y: number, z: number, w: number};
};

/* FIXME Load and Destroy this at runtime when in Debug_Mode.Swipe_Camera */
@ccclass('Swipe_Camera')
export class Swipe_Camera extends Component {
  @property(Node) camera_base: Node;

  /* Allocate them all on the HEAP? */
  current_rotation: Quat = new Quat();
  last_rotation: Quat = new Quat();
  current_position: Vec3 = new Vec3();
  last_position: Vec3 = new Vec3();

  get camera_info(): Camera_Info {
    return {position: this.current_position, rotation: this.current_rotation};
  }

  onLoad() {
    this.register_event();
  }

  onDestroy() {
    this.unregister_event();
  }

  register_event() {
    input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
    input.on(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
  }

  unregister_event() {
    input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
    input.off(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
  }

  on_key_down(event: EventKeyboard) {
    let key_code = event.keyCode;

    switch (key_code) {
      case KeyCode.KEY_W:
        this.transform_position(new Vec3(1, 0, 0));
        break;
      case KeyCode.KEY_S:
        this.transform_position(new Vec3(-1, 0, 0));
        break;
      case KeyCode.KEY_A:
        this.transform_position(new Vec3(0, 0, -1));
        break;
      case KeyCode.KEY_D:
        this.transform_position(new Vec3(0, 0, 1));
        break;
      case KeyCode.KEY_Q:
        this.transform_position(new Vec3(0, -1, 0));
        break;
      case KeyCode.KEY_E:
        this.transform_position(new Vec3(0, 1, 0));
        break;
    }
  }

  on_mouse_scroll(event: EventMouse) {
    let is_looking_up: boolean = event.getScrollY() > 0;
    if (is_looking_up) {
      this.rotate_around_z_axis(5);
    } else {
      this.rotate_around_z_axis(-5);
    }
  }

  update_view(info: Camera_Info) {
    console.log(info);

    if (info.position) {
      this.camera_base.setPosition(
          new Vec3(info.position.x, info.position.y, info.position.z));
    }

    if (info.rotation) {
      this.camera_base.setRotation(new Quat(
          info.rotation.x, info.rotation.y, info.rotation.z, info.rotation.w));
    }
  }

  transform_position(delta: Vec3) {
    this.last_position = this.camera_base.getPosition();
    this.current_position = this.last_position.add(delta);
    this.camera_base.setPosition(this.current_position);
  }

  rotate_around_z_axis(theta: number) {
    let radius = theta / 180 * Math.PI;
    this.last_rotation = this.camera_base.getRotation();
    this.current_rotation = Quat.rotateAround(
        this.current_rotation, this.last_rotation, new Vec3(0, 0, 1), radius);
    this.camera_base.setRotation(this.current_rotation);
  }
}
