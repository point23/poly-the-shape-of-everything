import { _decorator, Component, Node, instantiate, Prefab, EventHandler, Button } from 'cc';
import { Camera3D_Controller } from './Camera3D_Controller';
import { Const } from './Const';
import { Contextual_Manager } from './Contextual_Manager';
import { Entity_Manager } from './Entity_Manager';
import { debug_render_grid, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { generate_rover_moves } from './rover';
import { Transaction_Manager } from './Transaction_Manager';
import { Level_Editor_Panel } from './ui/Level_Editor_Panel';
import { UI_Manager } from './UI_Manager';
import { do_one_redo, do_one_undo, Undo_Handler } from './undo';

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

    reload_current_level() {
        this.clear_current_level();

        this.resource_manager.load_current_level(this, init);
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

        this.resource_manager.load_next_level(this, init);
    }

    clear_current_level() {
        const manager = this.entity_manager;
        manager.all_entities.forEach((it) => { it.node.destroy(); });
        Entity_Manager.current = null;

        clear_ui(this);

        this.debug_grid.destroy();
        this.debug_grid = null;
    }

    tick() {
        if ((this.round % this.ticks_per_loop) == 0) {
            this.main_loop();
        }

        this.round = (this.round + 1) % 1024;
    }

    #is_running: boolean = false;
    set is_running(v: boolean) {
        this.#is_running = v;
    };
    get is_running(): boolean {
        return this.#is_running;
    }

    main_loop() {
        if (!this.is_running) return;
        if (this.round % 64 == 0) generate_rover_moves(this.transaction_manager); // @hack
        this.transaction_manager.execute_async();
    }

    // Settle singleton managers manually
    settle_singletons() {
        Level_Editor.instance = this;
        Contextual_Manager.Settle(this.contextual_manager);
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        UI_Manager.Settle(this.ui_manager);
    }
}

function init_ui(editor: Level_Editor) {
    function init_options() {
        {
            const e = new EventHandler();
            e.target = editor.contextual_manager.node;
            e.component = "Contextual_Manager";
            e.handler = 'save_level';
            ui.btn_save.clickEvents.push(e);
        }
        {
            const e = new EventHandler();
            e.target = editor.resource_manager.node;
            e.component = "Resource_Manager";
            e.handler = 'download_config';
            ui.btn_download.clickEvents.push(e);
        }
    }

    function init_modes() {
        const e = new EventHandler();
        e.target = editor.contextual_manager.node;
        e.component = "Contextual_Manager";
        e.handler = 'switch_mode';
        ui.modes.events.push(e);
    }

    function init_levels() {
        const levels = ui.levels;
        levels.label.string = "level";
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

    function init_difficulty() {
        const difficulty = ui.difficulty;
        difficulty.label.string = "difficulty";
        difficulty.set_rating(editor.resource_manager.current_level_difficulty);

        { // Rating event
            const e = new EventHandler();
            e.target = editor.resource_manager.node;
            e.component = "Resource_Manager";
            e.handler = 'set_level_difficulty';
            difficulty.on_rated.push(e);
        }
    }

    function init_undos() {
        const undos = ui.undos;

        undos.label.string = "undo";
        ui.show_undo_changes(0);

        { // Really do one undo
            undos.btn_prev.node.on(Button.EventType.CLICK, () => {
                do_one_undo(editor.entity_manager);
            }, undos.btn_prev.node);
        }

        { // Really do one redo
            undos.btn_next.node.on(Button.EventType.CLICK, () => {
                do_one_redo(editor.entity_manager);
            }, undos.btn_next.node);
        }
    }

    function init_transactions() {
        const navigator = ui.transaction_panel.navigator;

        ui.transaction_panel.reset_counter();
        navigator.label.string = "transactions";
        { // Show or Hide single move logs
            const e = new EventHandler();
            e.target = ui.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'toggle';
            navigator.btn_current.clickEvents.push(e);
        }

        { // Show prev transaction
            const e = new EventHandler();
            e.target = ui.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'show_prev';
            navigator.btn_prev.clickEvents.push(e);
        }

        { // Show next transaction
            const e = new EventHandler();
            e.target = ui.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'show_next';
            navigator.btn_next.clickEvents.push(e);
        }

        ui.transaction_panel.clear_logs();
        ui.transaction_panel.hide_logs();
    }
    //#SCOPE

    const ui = editor.ui_manager;

    init_options();
    init_modes();
    init_levels();
    init_difficulty();
    init_undos();
    init_transactions();
}

function clear_ui(editor: Level_Editor) {
    const ui = editor.ui_manager;
    ui.btn_save.clickEvents = [];
    ui.btn_download.clickEvents = [];

    ui.levels.clear();
    ui.undos.clear();

    ui.transaction_panel.clear();
}

function init(editor: Level_Editor) {
    init_ui(editor);

    const config = editor.resource_manager.current_level_config;

    editor.camera3d_controller.update_view(config.camera);

    // @implementMe Directives like #PREVIEW or #WINDOWS...
    const grid = new Proximity_Grid(config.grid);
    const debug_grid = instantiate(editor.debug_grid_prefab);
    debug_grid.setParent(editor.debug_stuff);
    debug_render_grid(grid, debug_grid);
    editor.debug_grid = debug_grid;

    const entity_manager = new Entity_Manager(grid);

    // When loading each entities, we're going to update the old_entity_state of undo
    // So it must be create before we load entities the very first time.
    const undo = new Undo_Handler();
    entity_manager.undo_handler = undo;
    undo.manager = entity_manager;

    entity_manager.load_entities(config.entities);
    editor.entity_manager = entity_manager;
    Entity_Manager.current = entity_manager;

    editor.transaction_manager.clear();

    editor.contextual_manager.enable();
}