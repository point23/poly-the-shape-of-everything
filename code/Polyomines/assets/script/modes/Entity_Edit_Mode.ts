import {_decorator, Camera, EventKeyboard, EventMouse, EventTouch, geometry, KeyCode, Node, PhysicsSystem, Quat, Touch, Vec2, Vec3} from 'cc';

import {Const} from '../Const';
import {Debug_Console} from '../Debug_Console';
import {Direction, Entity_Info, Game_Entity} from '../entities/Game_Entity_Base';
import {Entity_Manager} from '../Entity_Manager';
import {Game_Board} from '../Game_Board';
import {Resource_Manager} from '../Resource_Manager';

import {Game_Mode} from './Game_Mode_Base';

const {ccclass, property} = _decorator;

/**
 * NOTE
 * - Select & Deselect
 * - Move & Rotate
 * - Copy & Paste
 * - Load Different Levels
 */
@ccclass('Entity_Edit_Mode')
export class Entity_Edit_Mode extends Game_Mode {
  @property(Camera) readonly camera!: Camera;

  private _ray: geometry.Ray = new geometry.Ray();

  on_enter() {
    Debug_Console.Info('Entity Edit');
  }

  on_exit() {
    this.deselect_all();
  }

  is_jiggling: boolean = false;
  last_key_code: number = null;
  selected_entities: Game_Entity[] = [];
  copied_entities: Entity_Info[] = [];

  handle_touch_move(event: EventTouch) {
    const screen_x = event.getLocationX();
    const screen_y = event.getLocationY();
    this.camera.screenPointToRay(screen_x, screen_y, this._ray);
    if (PhysicsSystem.instance.raycast(this._ray)) {
      let raycast_results = PhysicsSystem.instance.raycastResults;
      raycast_results = raycast_results.sort((a, b) => {
        return a.distance - b.distance;
      });

      for (let i = 0; i < raycast_results.length; i++) {
        const item = raycast_results[i];
        let succeed: boolean = false;
        for (let entity of Entity_Manager.instance.entities_iterator) {
          if (item.collider.node.parent != entity.node) continue;

          this.select(entity);
          succeed = true;
        }
        if (succeed) break;
      }
    }
  }

  handle_mouse_down(event: EventMouse) {
    /* FIXME There is a bug of cocos */
    // const left_btn: boolean = event.getButton() == EventMouse.BUTTON_LEFT;
    // const right_btn: boolean = event.getButton() == EventMouse.BUTTON_RIGHT;
    if (this.is_jiggling) return;

    const screen_x = event.getLocationX();
    const screen_y = event.getLocationY();
    this.camera.screenPointToRay(screen_x, screen_y, this._ray);

    if (PhysicsSystem.instance.raycast(this._ray)) {
      let raycast_results = PhysicsSystem.instance.raycastResults;
      raycast_results = raycast_results.sort((a, b) => {
        return a.distance - b.distance;
      });

      for (let i = 0; i < raycast_results.length; i++) {
        const item = raycast_results[i];

        let succeed: boolean = false;

        for (let entity of Entity_Manager.instance.entities_iterator) {
          if (item.collider.node.parent != entity.node) continue;

          if (entity.selected)
            this.deselect(entity);
          else
            this.select(entity);
          succeed = true;
        }
        if (succeed) break;
      }
    }

    this.is_jiggling = true;
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
        if (this.last_key_code == KeyCode.CTRL_LEFT) {
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
        if (this.last_key_code == KeyCode.CTRL_LEFT) {
          this.copy_selected_entities();
        }
        break;
      case KeyCode.KEY_V:
        if (this.last_key_code == KeyCode.CTRL_LEFT) {
          this.paste_copied_entities();
        }
        break;
      case KeyCode.BACKSPACE:
        this.delete_selected_entities();
        break;
    }

    this.last_key_code = key_code;

    Entity_Manager.instance.validate_tiling();
  }

  copy_selected_entities() {
    this.copied_entities = [];

    for (let entity of this.selected_entities) {
      this.copied_entities.push(entity.info);
    }
  }

  paste_copied_entities() {
    this.deselect_all();

    let new_entities =
        Entity_Manager.instance.load_entities(this.copied_entities);
    for (let entity of new_entities) {
      this.select(entity);
    }
  }

  delete_selected_entities() {
    for (let entity of this.selected_entities) {
      Entity_Manager.instance.reclaim(entity);
    }

    this.deselect_all();
  }

  rotate_selected_entities() {
    for (let entity of this.selected_entities) {
      entity.rotate_clockwise_horizontaly();
    }
  }

  save_level() {
    let updated_level_config = Resource_Manager.instance.current_level_config;
    const entities = Entity_Manager.instance.entities_info();
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
      entity.move_towards(direction);
    }
  }
}
