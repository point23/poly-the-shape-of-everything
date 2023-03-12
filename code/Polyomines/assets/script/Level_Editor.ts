import { _decorator, Component, Camera, Node, instantiate, Prefab, EventHandler, debug } from 'cc';
import { Camera3D_Controller } from './Camera3D_Controller';
import { Const } from './Const';
import { Contextual_Manager } from './Contextual_Manager';
import { Debug_Console } from './Debug_Console';
import { Entity_Manager } from './Entity_Manager';
import { debug_render_grid, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { Transaction_Manager } from './Transaction_Manager';
import { Level_Editor_Panel } from './ui/Level_Editor_Panel';
import { UI_Manager } from './UI_Manager';
import { Undo_Handler } from './undo';

const { ccclass, property } = _decorator;

/**
 * @note
 * - Game Loop
 */
@ccclass('Level_Editor')
export class Level_Editor extends Component {
    static instance: Level_Editor;

    @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller = null;
    ticks_per_loop = 1;
    round: number = 0;

    @property(Prefab) debug_grid_prefab: Prefab = null;
    @property(Node) debug_stuff: Node = null;
    @property(Level_Editor_Panel) panel: Level_Editor_Panel = null;

    /* Singleton instances: */
    @property(Debug_Console) console_instance: Debug_Console = null;
    @property(Contextual_Manager) contextual_manager: Contextual_Manager = null;
    @property(Resource_Manager) resource_manager: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;
    @property(UI_Manager) ui_manager: UI_Manager = null;

    // @hack
    entity_manager: Entity_Manager = null;
    debug_grid: Node = null;

    onLoad() {
        this.settle_singletons();
        Resource_Manager.instance.load_levels(this, init);
    }

    onDestroy() {
        this.clear_current_level();
    }

    start() {
        this.ticks_per_loop =
            Const.Ticks_Per_Loop.get(Transaction_Manager.instance.duration);
        this.schedule(this.tick, Const.Tick_Interval);
    }

    load_prev_level() {
        this.clear_current_level();

        this.resource_manager.load_prev_level(this, init);
    }

    load_succeed_level() {
        this.clear_current_level();

        this.resource_manager.load_succeed_level(this, init);
    }

    load_next_level() {
        this.clear_current_level();

        this.resource_manager.load_prev_level(this, init);
    }

    clear_current_level() {
        const manager = this.entity_manager;
        manager.all_entities.forEach((it) => { it.node.destroy(); });
        Entity_Manager.current = null;

        this.debug_grid.destroy();
        this.debug_grid = null;
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
        Level_Editor.instance = this;

        Debug_Console.Settle(this.console_instance);
        Contextual_Manager.Settle(this.contextual_manager);
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        UI_Manager.Settle(this.ui_manager);
    }
}

function init(editor: Level_Editor) {
    function init_levels_navigator(panel: Level_Editor_Panel) {
        const levels = panel.levels;
        levels.label.string = "levels";
        // levels.btn_label.interactable = false;

        levels.label_current.string = Resource_Manager.instance.current_level_name;
        // levels.btn_current.interactable = false;

        { // Navigate to previous level
            const e = new EventHandler();
            e.target = editor.node;
            e.component = "Level_Editor";
            e.handler = 'load_prev_level';
            levels.btn_prev.clickEvents.push(e);
        }

        { // Navigate to next level
            const e = new EventHandler();
            e.target = editor.node;
            e.component = "Level_Editor";
            e.handler = 'load_next_level';
            levels.btn_next.clickEvents.push(e);
        }
    }
    //#SCOPE 

    const config = Resource_Manager.instance.current_level_config;
    init_levels_navigator(editor.panel);

    editor.camera3d_controller.update_view(config.camera);

    // @implementMe Directives like #PREVIEW or #WINDOWS...
    const grid = new Proximity_Grid(config.grid);
    const debug_grid = instantiate(editor.debug_grid_prefab);
    debug_grid.setParent(editor.debug_stuff);
    debug_render_grid(grid, debug_grid);
    editor.debug_grid = debug_grid;

    const entity_manager = new Entity_Manager(grid);
    entity_manager.load_entities(config.entities);
    editor.entity_manager = entity_manager;
    Entity_Manager.current = entity_manager;

    const undo = new Undo_Handler();
    entity_manager.undo_handler = undo;
    undo.manager = entity_manager;

    editor.contextual_manager.enable();
}