import {_decorator, Component, EventKeyboard, EventMouse, KeyCode, Node, Vec3} from 'cc';

import {Camera3D_Controller} from '../Camera3D_Controller';
import {Debug_Console} from '../Debug_Console';
import {Resource_Manager} from '../Resource_Manager';

import {Game_Mode} from './Game_Mode_Base';

const {ccclass, property} = _decorator;

@ccclass('Swipe_Camera_Mode')
export class Swipe_Camera_Mode extends Game_Mode {
  @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller;

  on_enter() {
    Debug_Console.Info('Swipe Camera');
  }

  on_exit() {}

  last_key_code: number = null;
  handle_key_down(event: EventKeyboard) {
    let key_code = event.keyCode;
    switch (key_code) {
      case KeyCode.KEY_W:
        this.camera3d_controller.transform_position(new Vec3(1, 0, 0));
        break;
      case KeyCode.KEY_S:
        if (this.last_key_code == KeyCode.CTRL_LEFT) {
          this.save_level();
        } else {
          this.camera3d_controller.transform_position(new Vec3(-1, 0, 0));
        }
        break;
      case KeyCode.KEY_A:
        this.camera3d_controller.transform_position(new Vec3(0, 0, -1));
        break;
      case KeyCode.KEY_D:
        this.camera3d_controller.transform_position(new Vec3(0, 0, 1));
        break;
      case KeyCode.KEY_Q:
        this.camera3d_controller.transform_position(new Vec3(0, -1, 0));
        break;
      case KeyCode.KEY_E:
        this.camera3d_controller.transform_position(new Vec3(0, 1, 0));
        break;
    }

    this.last_key_code = key_code;
  }

  private save_level() {
    let updated_level_config = Resource_Manager.instance.current_level_config;
    updated_level_config.camera_info = this.camera3d_controller.camera_info;
    Resource_Manager.instance.save_level(updated_level_config);
  }

  handle_mouse_scroll(event: EventMouse) {
    let is_looking_up: boolean = event.getScrollY() > 0;
    if (is_looking_up) {
      this.camera3d_controller.rotate_z(5);
    } else {
      this.camera3d_controller.rotate_z(-5);
    }
  }
}
