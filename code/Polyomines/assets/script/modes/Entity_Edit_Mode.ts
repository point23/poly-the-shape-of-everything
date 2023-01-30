import {_decorator, Camera, EventKeyboard, EventMouse, geometry, KeyCode, Node, PhysicsSystem, Touch, Vec2, Vec3} from 'cc';
import {Const} from '../Const';

import {Debug_Console} from '../Debug_Console';
import {Entity_Manager} from '../Entity_Manager';
import {Game_Board} from '../Game_Board';
import {Level_Config} from '../Main';
import {Resource_Manager} from '../Resource_Manager';

import {Game_Mode} from './Game_Mode_Base';

const {ccclass, property} = _decorator;

/**
 * NOTE
 * - Select & Deselect
 * - Copy & Paste
 */
@ccclass('Entity_Edit_Mode')
export class Entity_Edit_Mode extends Game_Mode {
  @property(Camera) readonly camera!: Camera;
  @property(Game_Board) readonly game_board!: Game_Board;

  private _ray: geometry.Ray = new geometry.Ray();
  // private _last_coord: Vec2 = Vec2.ZERO;

  on_enter() {
    Debug_Console.Info('Entity Edit');
  }

  on_exit() {}

  is_selecting: boolean = true;
  is_jiggling: boolean = false;
  /* FIXME Temporarily fixed double-click problem, find better solution. */
  handle_mouse_down(event: EventMouse) {
    /* FIXME There is a bug of cocos */
    // const select: boolean = event.getButton() == EventMouse.BUTTON_LEFT;
    // const deselect: boolean = event.getButton() == EventMouse.BUTTON_RIGHT;
    if (this.is_jiggling) return;

    const screen_x = event.getLocationX();
    const screen_y = event.getLocationY();
    this.camera.screenPointToRay(screen_x, screen_y, this._ray);

    if (PhysicsSystem.instance.raycast(this._ray)) {
      const raycast_results = PhysicsSystem.instance.raycastResults;
      for (let i = 0; i < raycast_results.length; i++) {
        const item = raycast_results[i];
        let succeed: boolean = false;
        for (let entity of Entity_Manager.instance.entities) {
          if (item.collider.node == entity.node) {
            if (this.is_selecting)
              Entity_Manager.instance.select(entity);
            else {
              Entity_Manager.instance.deselect(entity);
            }

            succeed = true;
            break;
          }
        }
        if (succeed) {
          break;
        }
      }
    }

    this.is_jiggling = true;
    this.scheduleOnce(() => {
      this.is_jiggling = false;
    }, Const.Mouse_Jiggling_Interval);

    this.is_selecting = false;
    this.scheduleOnce(() => {
      this.is_selecting = true;
    }, Const.Double_Click_Time_Interval);
  }

  handle_key_down(event: EventKeyboard) {
    let key_code = event.keyCode;
    switch (key_code) {
      case KeyCode.KEY_W:
        Entity_Manager.instance.move_selected_entities(new Vec2(0, 1));
        break;
      case KeyCode.KEY_S:
        Entity_Manager.instance.move_selected_entities(new Vec2(0, -1));
        break;
      case KeyCode.KEY_A:
        Entity_Manager.instance.move_selected_entities(new Vec2(-1, 0));
        break;
      case KeyCode.KEY_D:
        Entity_Manager.instance.move_selected_entities(new Vec2(1, 0));
        break;
      case KeyCode.ESCAPE:
        Entity_Manager.instance.deselect_all();
        break;
      // case KeyCode.KEY_Q:
      //   break;
      // case KeyCode.KEY_E:
      //   break;
      case KeyCode.ENTER:
        let updated_level_config: Level_Config =
            Resource_Manager.Current_Level_Config;
        const entities = Entity_Manager.instance.entities_info();
        updated_level_config.entities = entities;
        Resource_Manager.Save_Level(updated_level_config);
    }
  }

  /* FIXME Touch Move to drag an entity, create a river...*/
  // handle_touch_move(event: EventTouch) {
  //   const touch = event.touch!;
  //   const screen_x = touch.getLocationX();
  //   const screen_y = touch.getLocationY();
  //   const square_position = this.screen_to_square_position(screen_x,
  //   screen_y); const convert_res =
  //   this.game_board.world2coord(square_position); let coord: Vec2; if
  //   (convert_res.succeed) {
  //     coord = convert_res.coord;

  //     if (coord != this._last_coord) {
  //       Entity_Manager.instance.move_selected_entities(
  //           coord.subtract(this._last_coord));
  //     }
  //   }
  // }

  // handle_touch_end(event: EventTouch) {
  // }

  // screen_to_square_position(x: number, y: number): Vec3 {
  //   this.camera.screenPointToRay(x, y, this._ray);
  //   if (PhysicsSystem.instance.raycast(this._ray)) {
  //     const raycast_results = PhysicsSystem.instance.raycastResults;
  //     for (let i = 0; i < raycast_results.length; i++) {
  //       const item = raycast_results[i];
  //       let succeed: boolean = false;
  //       for (let square of this.game_board.squares) {
  //         if (item.collider.node == square) {
  //           return square.position;
  //         }
  //       }
  //       if (succeed) {
  //         break;
  //       }
  //     }
  //   }
  // }
}
