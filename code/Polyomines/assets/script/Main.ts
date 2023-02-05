import {_decorator, Component} from 'cc';
import {Camera3D_Controller} from './Camera3D_Controller';
import {Const} from './Const';
import {Contextual_Manager} from './Contextual_Manager';
import {Debug_Console} from './Debug_Console';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Resource_Manager} from './Resource_Manager';
import {Transaction_Manager} from './Transaction_Manager';

const {ccclass, property} = _decorator;

@ccclass('Main')
export class Main extends Component {
  @property(Camera3D_Controller)
  camera3d_controller: Camera3D_Controller = null;

  /* Singleton instances: */
  @property(Entity_Manager) entity_manager: Entity_Manager = null;
  @property(Debug_Console) console_instance: Debug_Console = null;
  @property(Contextual_Manager)
  contextual_manager_instance: Contextual_Manager = null;
  @property(Resource_Manager)
  resource_manager_instance: Resource_Manager = null;
  @property(Transaction_Manager)
  transaction_manager: Transaction_Manager = null;
  @property(Game_Board) game_board: Game_Board = null;

  onLoad() {
    this.settle_singletons();
  }

  start() {
    Contextual_Manager.instance.enable();

    Resource_Manager.instance.load_level(Const.Default_Level)
        .then((level_config) => {
          this.camera3d_controller.update_view(level_config.camera_info);

          Game_Board.instance.resize(level_config.game_board);
          Game_Board.instance.show_grid();

          Entity_Manager.instance.load_entities(level_config.entities);
        });
  }

  onDestroy() {
    Contextual_Manager.instance.dispose();
  }

  /** Settle singleton managers manually */
  private settle_singletons() {
    Game_Board.Settle(this.game_board);
    Debug_Console.Settle(this.console_instance);
    Contextual_Manager.Settle(this.contextual_manager_instance);
    Resource_Manager.Settle(this.resource_manager_instance);
    Entity_Manager.Settle(this.entity_manager);
    Transaction_Manager.Settle(this.transaction_manager);
  }
}