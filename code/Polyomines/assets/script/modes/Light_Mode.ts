import { _decorator, EventKeyboard, EventMouse, KeyCode, Vec3 } from 'cc';

import { Camera3D_Controller } from '../Camera3D_Controller';
import { Level_Editor } from '../Level_Editor';
import { Resource_Manager } from '../Resource_Manager';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass, property } = _decorator;

@ccclass('Swipe_Camera_Mode')
export class Swipe_Camera_Mode extends Game_Mode {
    @property(Camera3D_Controller) light_controller: Camera3D_Controller;

    on_enter() {
        Level_Editor.instance.info("Light");
    }

    on_exit() {
        this.save_level();
    }

    is_shift_down: boolean = false;
    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;
        switch (key_code) {
            case KeyCode.KEY_W:
                this.light_controller.transform_position(new Vec3(1, 0, 0));
                break;
            case KeyCode.KEY_S:
                if (this.is_shift_down) {
                    this.save_level();
                } else {
                    this.light_controller.transform_position(new Vec3(-1, 0, 0));
                }
                break;
            case KeyCode.KEY_A:
                this.light_controller.transform_position(new Vec3(0, 0, -1));
                break;
            case KeyCode.KEY_D:
                this.light_controller.transform_position(new Vec3(0, 0, 1));
                break;
            case KeyCode.KEY_Q:
                this.light_controller.transform_position(new Vec3(0, -1, 0));
                break;
            case KeyCode.KEY_E:
                this.light_controller.transform_position(new Vec3(0, 1, 0));
                break;
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.is_shift_down = true;
                break;
        }
    }

    handle_key_up(event: EventKeyboard) {
        let keycode: number = event.keyCode;
        switch (keycode) {
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.is_shift_down = false;
                break;
        }
    }

    save_level() {
        let updated_level_config = Resource_Manager.instance.current_level_config;
        updated_level_config.light = this.light_controller.get_info();
        Resource_Manager.instance.save_level(updated_level_config);
    }

    handle_mouse_scroll(event: EventMouse) {
        let is_looking_up: boolean = event.getScrollY() > 0;
        if (is_looking_up) {
            this.light_controller.rotate_z(5);
        } else {
            this.light_controller.rotate_z(-5);
        }
    }
}
