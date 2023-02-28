import { _decorator, Component, Camera, Node, instantiate, Prefab } from 'cc';
import { Camera3D_Controller } from './Camera3D_Controller';
import { Const, Pid } from './Const';
import { Contextual_Manager } from './Contextual_Manager';
import { Debug_Console } from './Debug_Console';
import { Entity_Manager } from './Entity_Manager';
import { debug_render_grid, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { Transaction_Manager } from './Transaction_Manager';
import { Undo_Handler } from './undo';

const { ccclass, property } = _decorator;

/**
 * @note
 * - Game Loop
 */
@ccclass('Main')
export class Main extends Component {
    @property(Camera3D_Controller)
    camera3d_controller: Camera3D_Controller = null;
    ticks_per_loop = 1;
    round: number = 0;

    /* Singleton instances: */
    @property(Debug_Console) console_instance: Debug_Console = null;
    @property(Contextual_Manager) contextual_manager: Contextual_Manager = null;
    @property(Resource_Manager) resource_manager_instance: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;

    @property(Prefab) debug_grid_prefab: Prefab;
    @property(Node) debug_stuff: Node;

    async start() {
        this.settle_singletons();

        await Resource_Manager.instance.load_level(Const.Default_Level)
            .then(config => {
                this.camera3d_controller.update_view(config.camera);

                const grid = new Proximity_Grid(config.grid);

                // @implementMe Directives like #PREVIEW or #WINDOWS...
                const debug_grid_renderer = instantiate(this.debug_grid_prefab);
                debug_grid_renderer.setParent(this.debug_stuff);
                debug_render_grid(grid, debug_grid_renderer);

                const entity_manager = new Entity_Manager(grid);
                entity_manager.load_entities(config.entities);

                const undo = new Undo_Handler();
                entity_manager.undo_handler = undo;
                undo.manager = entity_manager;

                this.contextual_manager.entity_manager = entity_manager;
                this.transaction_manager.entity_manager = entity_manager;
            });

        this.contextual_manager.enable();
        this.ticks_per_loop =
            Const.Ticks_Per_Loop.get(Transaction_Manager.instance.duration);
        this.schedule(this.tick, Const.Tick_Interval);
    }

    onDestroy() {
        this.contextual_manager.dispose();
    }

    tick() {
        if ((this.round % this.ticks_per_loop) == 0) {
            this.main_loop();
        }

        this.round = (this.round + 1) % 1024;
    }

    main_loop() {
        Transaction_Manager.instance.execute_async();
    }


    // Settle singleton managers manually
    settle_singletons() {
        Debug_Console.Settle(this.console_instance);
        Contextual_Manager.Settle(this.contextual_manager);
        Resource_Manager.Settle(this.resource_manager_instance);
        Transaction_Manager.Settle(this.transaction_manager);
    }
}