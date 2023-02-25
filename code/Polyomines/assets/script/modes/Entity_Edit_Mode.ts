import { _decorator, Camera, EventKeyboard, EventMouse, EventTouch, geometry, KeyCode, Node, PhysicsSystem, Quat, Touch, Vec2, Vec3, instantiate } from 'cc';

import { Const, Pid } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Debug_Console } from '../Debug_Console';
import { Entity_Manager } from '../Entity_Manager';
import { Direction } from '../Enums';
import { calcu_entity_future_position, Entity_Serializable, Game_Entity, get_entity_squares, rotate_clockwise_horizontaly } from '../Game_Entity';
import { Resource_Manager } from '../Resource_Manager';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass, property } = _decorator;

/**
 * NOTE
 * - Select & Deselect
 * - Move & Rotate
 * - Copy & Paste
 * - Load Different Levels
 * - Entity Proxy: support editor cover, hightlight when selected/invalid...
 */
@ccclass('Entity_Edit_Mode')
export class Entity_Edit_Mode extends Game_Mode {
    @property(Camera) readonly camera!: Camera;
    ray: geometry.Ray = new geometry.Ray();
    entity_manager: Entity_Manager;

    on_enter() {
        this.entity_manager = Contextual_Manager.instance.entity_manager;
        Debug_Console.Info('Entity Edit');
    }

    on_exit() {
        this.deselect_all();
    }

    is_jiggling: boolean = false;
    is_shift_down: boolean = false;
    selected_entities: Game_Entity[] = [];
    copied_entities: Entity_Serializable[] = [];

    handle_touch_move(event: EventTouch) {
        const screen_x = event.getLocationX();
        const screen_y = event.getLocationY();

        this.camera.screenPointToRay(screen_x, screen_y, this.ray);
        if (PhysicsSystem.instance.raycast(this.ray)) {
            let raycast_results = PhysicsSystem.instance.raycastResults;
            raycast_results = raycast_results.sort((a, b) => {
                return a.distance - b.distance;
            });

            for (let i = 0; i < raycast_results.length; i++) {
                const item = raycast_results[i];
                let succeed: boolean = false;
                for (let entity of this.entity_manager.all_entities) {
                    if (item.collider.node.parent.parent != entity.node) continue;

                    this.select(entity);
                    succeed = true;
                }
                if (succeed) break;
            }
        }
    }

    handle_mouse_down(event: EventMouse) {
        // @fixme There is a bug of cocos:
        // const left_btn: boolean = event.getButton() == EventMouse.BUTTON_LEFT;
        // const right_btn: boolean = event.getButton() == EventMouse.BUTTON_RIGHT;
        if (this.is_jiggling) return;
        this.is_jiggling = true;

        const screen_x = event.getLocationX();
        const screen_y = event.getLocationY();
        this.camera.screenPointToRay(screen_x, screen_y, this.ray);

        if (PhysicsSystem.instance.raycast(this.ray)) {
            let raycast_results = PhysicsSystem.instance.raycastResults;
            raycast_results = raycast_results.sort((a, b) => {
                return a.distance - b.distance;
            });

            for (let i = 0; i < raycast_results.length; i++) {
                const item = raycast_results[i];
                let succeed: boolean = false;

                for (let entity of this.entity_manager.all_entities) {
                    if (item.collider.node.parent.parent != entity.node) continue;
                    if (entity.selected) this.deselect(entity);
                    else this.select(entity);
                    succeed = true;
                }

                if (succeed) break;
            }
        }

        this.scheduleOnce(() => {
            this.is_jiggling = false;
        }, Const.Mouse_Jiggling_Interval);
    }

    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;

        switch (key_code) {
            case KeyCode.KEY_W:
                this.move_selected_entities(Direction.BACKWORD);
                break;
            case KeyCode.KEY_S:
                if (this.is_shift_down) {
                    this.save_level();
                } else {
                    this.move_selected_entities(Direction.FORWARD);
                }
                break;
            case KeyCode.KEY_A:
                this.move_selected_entities(Direction.LEFT);
                break;
            case KeyCode.KEY_D:
                this.move_selected_entities(Direction.RIGHT);
                break;
            case KeyCode.KEY_Q:
                this.move_selected_entities(Direction.DOWN);
                break;
            case KeyCode.KEY_E:
                this.move_selected_entities(Direction.UP);
                break;
            case KeyCode.KEY_R:
                this.rotate_selected_entities();
                break;
            case KeyCode.ESCAPE:
                this.deselect_all();
                break;
            case KeyCode.KEY_C:
                if (this.is_shift_down) {
                    this.copy_selected_entities();
                }
                break;
            case KeyCode.KEY_V:
                if (this.is_shift_down) {
                    this.paste_copied_entities();
                }
                break;
            case KeyCode.BACKSPACE:
                this.delete_selected_entities();
                break;

            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.is_shift_down = true;
                break;
        }

        debug_validate_tiling(this.entity_manager);
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

    copy_selected_entities() {
        this.copied_entities = [];

        for (let entity of this.selected_entities) {
            this.copied_entities.push(entity.get_serializable());
        }
    }

    paste_copied_entities() {
        this.deselect_all();
        for (let info of this.copied_entities) {
            const e = this.entity_manager.load_entity(info);
            this.select(e);
        }
    }

    delete_selected_entities() {
        for (let entity of this.selected_entities) {
            this.entity_manager.reclaim(entity);
        }

        this.deselect_all();
    }

    save_level() {
        const updated_level_config = Resource_Manager.instance.current_level_config;
        const entities = this.entity_manager.get_entities_info();
        updated_level_config.entities = entities;
        Resource_Manager.instance.save_level(updated_level_config);
    }

    select(entity: Game_Entity) {
        if (entity.selected) return;

        this.selected_entities.push(entity);
        entity.selected = true;
    }

    deselect(entity: Game_Entity) {
        if (!entity.selected) return;

        const idx = this.selected_entities.indexOf(entity);
        this.selected_entities.splice(idx, 1);
        entity.selected = false;
    }

    deselect_all() {
        for (let entity of this.selected_entities) {
            entity.selected = false;
        }
        this.selected_entities = [];
    }

    move_selected_entities(direction: Direction) {
        for (let entity of this.selected_entities) {
            const p_new = calcu_entity_future_position(entity, direction);
            this.entity_manager.proximity_grid.remove_entity(entity);
            this.entity_manager.proximity_grid.move_entity(entity, p_new);
            this.entity_manager.proximity_grid.add_entity(entity);
        }
    }

    rotate_selected_entities() {
        for (let entity of this.selected_entities) {
            let r_new = rotate_clockwise_horizontaly(entity.rotation);
            this.entity_manager.proximity_grid.rotate_entity(entity, r_new);
        }
    }
}


//#region DEBUG STUFF
function debug_validate_tiling(manager: Entity_Manager) {
    const map = new Map<string, boolean>();

    for (let entity of manager.all_entities) {
        for (let pos of get_entity_squares(entity)) {
            const pos_str = pos.toString();
            if (map.has(pos_str)) {
                map.set(pos_str, true);
            } else {
                map.set(pos_str, false);
            }
        }
    }

    for (let entity of manager.all_entities) {
        let is_valid = true;
        for (let pos of get_entity_squares(entity)) {
            if (map.get(pos.toString())) {
                is_valid = false;
            }
        }

        entity.valid = is_valid;
    }
}
//#endregion DEBUG STUFF