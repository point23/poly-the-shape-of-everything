import {
    _decorator,
    Camera,
    EventKeyboard,
    EventMouse,
    EventTouch,
    geometry,
    KeyCode,
    PhysicsSystem,
    EventHandler
} from 'cc';
import { Const, Direction } from '../Const';
import { Entity_Manager } from '../Entity_Manager';
import {
    Serializable_Entity_Data,
    Game_Entity,
    calcu_entity_future_position,
    debug_validate_tiling,
    get_selected_entities,
    get_serializable,
    note_entity_is_deselected,
    note_entity_is_selected,
    rotate_clockwise_horizontaly
} from '../Game_Entity';
import { Level_Editor } from '../Level_Editor';
import { Resource_Manager } from '../Resource_Manager';
import { note_entity_creation, note_entity_destruction, undo_end_frame, undo_mark_beginning } from '../undo';
import { Navigator } from '../ui/Navigator';
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
    // @property(Navigator) entities_navigator: Navigator = null;

    ray: geometry.Ray = new geometry.Ray();
    get entity_manager(): Entity_Manager {
        return Entity_Manager.current;
    };

    is_jiggling: boolean = false;
    is_shift_down: boolean = false;

    copied_entities: Serializable_Entity_Data[] = []; // @note We may take them across levels...

    on_enter() {
        Level_Editor.instance.info("Entity Edit");
        undo_mark_beginning(this.entity_manager);
    }

    on_exit() {
        this.save_level();
        this.deselect_all();
    }

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
                for (let e of this.entity_manager.all_entities) {
                    if (item.collider.node.parent.parent != e.node) continue;

                    this.select(e);
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

                for (let e of this.entity_manager.all_entities) {
                    if (item.collider.node.parent.parent != e.node) continue;
                    if (e.is_selected)
                        this.deselect(e);
                    else
                        this.select(e);
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
                this.move_selected_entities(Direction.FORWARD);
                break;
            case KeyCode.KEY_A: {
                if (this.is_shift_down) {
                    this.select_all();
                } else {
                    this.move_selected_entities(Direction.LEFT);
                }
            } break;
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
        for (let e of get_selected_entities(this.entity_manager)) {
            this.copied_entities.push(get_serializable(e));
        }
    }

    paste_copied_entities() {
        if (this.copied_entities.length == 0) return;
        this.deselect_all();
        undo_end_frame(this.entity_manager);

        for (let info of this.copied_entities) {
            const e = this.entity_manager.load_entity(info);
            note_entity_creation(this.entity_manager, e);

            this.select(e);
        }

        undo_end_frame(this.entity_manager);

        debug_validate_tiling(this.entity_manager);

        undo_end_frame(this.entity_manager);
    }

    delete_selected_entities() {
        for (let e of get_selected_entities(this.entity_manager)) {
            note_entity_destruction(this.entity_manager, e);
            this.entity_manager.reclaim(e);
        }
        undo_end_frame(this.entity_manager);
    }

    save_level() {
        if (this.entity_manager == null || this.entity_manager == undefined) return;

        const updated_level_config = Resource_Manager.instance.current_level_config;
        const entities = this.entity_manager.get_entities_info();
        updated_level_config.entities = entities;
        Resource_Manager.instance.save_level(updated_level_config);
        Level_Editor.instance.info("Saved.");
    }

    select(e: Game_Entity) {
        if (e.is_selected) return;
        note_entity_is_selected(e);

        undo_end_frame(this.entity_manager); // @hack
    }

    deselect(e: Game_Entity) {
        if (!e.is_selected) return;
        note_entity_is_deselected(e);

        undo_end_frame(this.entity_manager); // @hack
    }

    select_all() {
        for (let e of this.entity_manager.all_entities) {
            this.select(e);
        }
    }

    deselect_all() {
        const entities = get_selected_entities(this.entity_manager);
        if (entities.length == 0) return;
        for (let e of entities) {
            note_entity_is_deselected(e);
        }
        undo_end_frame(this.entity_manager); // @hack
    }

    move_selected_entities(direction: Direction) {
        const selected = get_selected_entities(this.entity_manager);
        if (selected.length == 0) return;
        for (let e of selected) {
            const p_new = calcu_entity_future_position(e, direction);
            this.entity_manager.move_entity(e, p_new);
        }

        debug_validate_tiling(this.entity_manager);

        undo_end_frame(this.entity_manager);
    }

    rotate_selected_entities() {
        const selected = get_selected_entities(this.entity_manager);
        if (selected.length == 0) return;
        for (let e of selected) {
            let r_new = rotate_clockwise_horizontaly(e.rotation);
            this.entity_manager.rotate_entity(e, r_new);
        }

        debug_validate_tiling(this.entity_manager);

        undo_end_frame(this.entity_manager);
    }
}