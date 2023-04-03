import { _decorator, EventKeyboard, EventMouse, KeyCode, Vec3 } from 'cc';

import { Camera3D_Controller } from '../Camera3D_Controller';
import { Level_Editor } from '../Level_Editor';
import { Resource_Manager } from '../Resource_Manager';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass, property } = _decorator;

@ccclass('Light_Mode')
export class Light_Mode extends Game_Mode {
    @property(Camera3D_Controller) light_controller: Camera3D_Controller;

    on_enter() {
        Level_Editor.instance.info("Light");
    }

    on_exit() {
        this.save_level();
    }

    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;
        switch (key_code) {
            case KeyCode.KEY_W:
                this.light_controller.rotate_z(5);
                break;
            case KeyCode.KEY_S:
                this.light_controller.rotate_z(-5);
                break;
            case KeyCode.KEY_A:
                this.light_controller.rotate_x(-5);
                break;
            case KeyCode.KEY_D:
                this.light_controller.rotate_x(5);
                break;
            case KeyCode.KEY_Q:
                this.light_controller.rotate_y(-5);
                break;
            case KeyCode.KEY_E:
                this.light_controller.rotate_y(5);
                break;
        }
    }

    save_level() {
        let updated_level_config = Resource_Manager.instance.current_level_config;
        updated_level_config.light = this.light_controller.get_info();
        Resource_Manager.instance.save_level(updated_level_config);
    }
}
