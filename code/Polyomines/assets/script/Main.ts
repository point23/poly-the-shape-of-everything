import {_decorator, assetManager, Component, JsonAsset, resources, Size, sys} from 'cc';
import {Entity_Manager} from './Entity_Manager';

import {Game_Board} from './Game_Board';
import {Swipe_Camera} from './Swipe_Camera';

const {ccclass, property} = _decorator;

/* TODO For now, the 'Main' is just a Level_Loader?
 */
@ccclass('Main')
export class Main extends Component {
  @property(Game_Board) game_board: Game_Board;
  @property(Entity_Manager) entity_manager: Entity_Manager;
  @property(Swipe_Camera) swipe_camera: Swipe_Camera;

  public static Level_Config: any;

  onLoad() {
    resources.load('data/level_01', (err: Error, jsonAsset: JsonAsset) => {
      if (err != null) {
        console.error(err);
        return;
      }

      this.load_level(jsonAsset.json);
    });
  }

  load_level(level_config: any) {
    Main.Level_Config = level_config;

    this.game_board.show_grids(level_config.game_board.grid_size);
    this.entity_manager.load_static_entities(level_config.static_entities);
    this.swipe_camera.update_view(level_config.camera_info);
  }

  save_level() {
    Main.Level_Config.camera_info = this.swipe_camera.camera_info;
  }
}