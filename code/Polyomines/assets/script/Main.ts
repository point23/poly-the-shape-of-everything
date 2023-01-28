import {_decorator, assetManager, Component, JsonAsset, resources, Size, sys} from 'cc';
import fs from 'fs-extra';

import {Entity_Info, Entity_Manager} from './Entity_Manager';
import {Game_Board, Game_Board_Info} from './Game_Board';
import {Camera_Info, Swipe_Camera} from './Swipe_Camera';

const {ccclass, property} = _decorator;

/* TODO For now, the 'Main' is just a Level_Loader?
 */

type Level_Config = {
  camera_info: Camera_Info; game_board: Game_Board_Info;
  static_entities: Entity_Info[];
}

@ccclass('Main') export class Main extends Component {
  @property(Game_Board) game_board: Game_Board;
  @property(Entity_Manager) entity_manager: Entity_Manager;
  @property(Swipe_Camera) swipe_camera: Swipe_Camera;

  public static Level_Config: Level_Config;

  onLoad() {
    resources.load('data/level#001', (err: Error, jsonAsset: JsonAsset) => {
      if (err != null) {
        console.error(err);
        return;
      }

      this.load_level(jsonAsset.json);
    });
  }

  start() {
    this.save_level();
  }

  load_level(level_config: any) {
    Main.Level_Config = level_config;
    console.log(Main.Level_Config);

    this.game_board.show_grids(level_config.game_board);
    this.entity_manager.load_static_entities(level_config.static_entities);
    this.swipe_camera.update_view(level_config.camera_info);
  }

  async save_level() {
    console.log('try save level!');
    // Main.Level_Config.camera_info = this.swipe_camera.camera_info;

    /* FIXME DONT use the absolute path...  */
    let root = 'A:/code/poly/code/Polyomines/assets/resources';
    fs.writeJson(`${root}/data/level#002.json`, {name: 'fs-extra'})
        .then(() => {console.log('success!')})
        .catch(err => {console.error(err)});
  };
}