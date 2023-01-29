import {_decorator, Component, JsonAsset, resources} from 'cc';
import {Camera3D_Controller, Camera_Info} from './Camera3D_Controller';
import {Const} from './Const';
import {Contextual_Manager} from './Contextual_Manager';
import {Debug_Console} from './Debug_Console';
import {Entity_Info, Entity_Manager} from './Entity_Manager';
import {Game_Board, Game_Board_Info} from './Game_Board';
import {Resource_Manager} from './Resource_Manager';

const {ccclass, property} = _decorator;

export type Level_Config = {
  camera_info: Camera_Info,
  game_board: Game_Board_Info,
  static_entities: Entity_Info[],
};

@ccclass('Main')
export class Main extends Component {
  @property(Game_Board) game_board: Game_Board = null;
  @property(Camera3D_Controller)
  camera3d_controller: Camera3D_Controller = null;
  @property(Entity_Manager) entity_manager: Entity_Manager = null;
  /* Singleton instances below: */
  @property(Debug_Console) console_instance: Debug_Console = null;
  @property(Contextual_Manager)
  contextual_manager_instance: Contextual_Manager = null;
  @property(Resource_Manager)
  resource_manager_instance: Resource_Manager = null;

  onLoad() {
    this.settle_singletons();
  }

  start() {
    Contextual_Manager.Enable();
    Resource_Manager.Load_Level(
        Const.Default_Level, this.on_level_loaded, this);
  }

  onDestroy() {
    Contextual_Manager.Dispose();
  }

  /** Callback when level config is loaded by Resource Manager  */
  on_level_loaded(target: Main, level_config: Level_Config) {
    target.game_board.show_grids(level_config.game_board);
    target.entity_manager.load_static_entities(level_config.static_entities);
    target.camera3d_controller.update_view(level_config.camera_info);
  }

  /** Settle singleton managers manually */
  private settle_singletons() {
    Debug_Console.Settle(this.console_instance);
    Contextual_Manager.Settle(this.contextual_manager_instance);
    Resource_Manager.Settle(this.resource_manager_instance);
  }
}