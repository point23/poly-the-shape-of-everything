import { _decorator, Component, Node } from 'cc';
import { Camera3D_Controller } from './Camera3D_Controller';
import { Entity_Manager } from './Entity_Manager';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { Transaction_Manager } from './Transaction_Manager';
import { Show_Hide_Type, UI_Manager } from './UI_Manager';
import { Undo_Handler } from './undo';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller = null;
    @property(Resource_Manager) resource_manager: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;
    @property(UI_Manager) ui_manager: UI_Manager = null;

    entity_manager: Entity_Manager = null;

    @property(Node) title: Node = null;
    @property(Node) dim: Node = null;

    onLoad() {
        this.settle_singletons();
        Resource_Manager.instance.load_levels(this, init_level);
    }

    start() {
        this.ui_manager.show_and_hide({
            target: this.dim,
            show_delay: 0,
            show_duration: 0,
            hide_delay: 2,
            hide_duration: 2,
            type: Show_Hide_Type.BLINDS,
        });

        this.ui_manager.show_and_hide({
            target: this.title,
            show_delay: 4,
            show_duration: 2,
            hide_delay: 5,
            hide_duration: 2,
            type: Show_Hide_Type.FADE,
        });
    }

    settle_singletons() {
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        UI_Manager.Settle(this.ui_manager);
    }
}

function init_level(game: Main) {
    function init_ui() {

    }

    function init_camera() {
        game.camera3d_controller.update_view(config.camera);
    }

    function init_entities() {
        const grid = new Proximity_Grid(config.grid);
        const entity_manager = new Entity_Manager(grid);
        const undo = new Undo_Handler();
        entity_manager.undo_handler = undo;
        undo.manager = entity_manager;

        entity_manager.load_entities(config.entities);
        game.entity_manager = entity_manager;
        Entity_Manager.current = entity_manager;

        game.transaction_manager.clear();
    }
    //#SCOPE

    const config = game.resource_manager.current_level_config;
    init_ui();
    init_camera();
    init_entities();
}


