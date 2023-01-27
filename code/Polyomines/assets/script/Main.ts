import {_decorator, assetManager, Component, JsonAsset, resources, Size, sys} from 'cc';
import {Entity_Manager} from './Entity_Manager';

import {Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

/* TODO For now, the 'Main' is just a Level_Loader?
 */
@ccclass('Main')
export class Main extends Component {
  @property(Game_Board) game_board: Game_Board;
  @property(Entity_Manager) entity_manager: Entity_Manager;
  public static Level_Config: any;

  start() {
    console.warn(`platform: ${sys.platform}`);

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
    this.entity_manager.generate_grounds(level_config.grounds);
  }
}