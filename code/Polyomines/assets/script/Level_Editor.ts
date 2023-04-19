import { _decorator, Component, Node, instantiate, Prefab, EventHandler, Button, RichText } from 'cc';
import { Camera3D_Controller } from './Camera3D_Controller';
import { $$, Const } from './Const';
import { Contextual_Manager } from './Contextual_Manager';
import { Entity_Manager } from './Entity_Manager';
import { debug_render_grid, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { Transaction_Manager } from './Transaction_Manager';
import { Button_Group } from './ui/Button_Group';
import { Rating } from './ui/Rating';
import { Navigator } from './ui/Navigator';
import { Transaction_Panel } from './ui/Transaction_Panel';
import { do_one_redo, do_one_undo, Undo_Handler } from './undo';
import { Entity_Edit_Mode } from './modes/Entity_Edit_Mode';
import { Test_Run_Mode } from './modes/Test_Run_Mode';
import { Audio_Manager } from './Audio_Manager';
import { Efx_Manager } from './Efx_Manager';
import { make_human_animation_graph } from './Character_Data';

const { ccclass, property } = _decorator;

/**
 * @Note
 * - Game Loop
 */
@ccclass('Level_Editor')
export class Level_Editor extends Component {
    static instance: Level_Editor;

    @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller = null;
    @property(Camera3D_Controller) light_controller: Camera3D_Controller = null;

    @property(Prefab) debug_grid_prefab: Prefab = null;
    @property(Node) debug_stuff: Node = null;

    /* Singleton instances: */
    @property(Contextual_Manager) contextual_manager: Contextual_Manager = null;
    @property(Resource_Manager) resource_manager: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;
    @property(Audio_Manager) audio_manager: Audio_Manager = null;
    @property(Efx_Manager) efx_manager: Efx_Manager = null;

    @property(RichText) txt_info: RichText = null;
    @property(Transaction_Panel) transaction_panel: Transaction_Panel = null;

    @property(Navigator) undos: Navigator = null;
    @property(Navigator) levels: Navigator = null;

    @property(Navigator) durations: Navigator = null;

    @property(Rating) difficulty: Rating = null;

    @property(Button) btn_save: Button = null;
    @property(Button) btn_download: Button = null;

    @property(Button_Group) modes: Button_Group = null;

    show_undo_changes(num: number) {
        this.undos.label_current.string = `${num} changes`;
    }

    info(s: string) {
        this.txt_info.string = s;
        this.scheduleOnce(() => {
            this.txt_info.string = "";
        }, 1);
    }

    entity_manager: Entity_Manager = null;
    debug_grid: Node = null;

    onLoad() {
        $$.HINTS_EDITABLE = true;
        $$.FOR_EDITING = true

        this.settle_singletons();
        init_ui(this);
        make_human_animation_graph(); // @Note There're some aync? behaviour inside...
        Resource_Manager.instance.load_levels(this, init);

        $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;
    }

    onDestroy() {
        clear_ui(this);
        this.contextual_manager.dispose();
        this.clear_current_level();
    }

    game_mode: number = 1;
    switch_edit_mode(idx: any) {
        idx = Number(idx);
        this.game_mode = idx;
        const mode = this.contextual_manager.game_modes[idx];

        if (mode instanceof Entity_Edit_Mode) {
            $$.HINTS_EDITABLE = true;
            this.reload_current_level();
            return;
        }

        if (mode instanceof Test_Run_Mode) {
            $$.HINTS_EDITABLE = false;
            this.reload_current_level();
            return;
        }

        this.contextual_manager.switch_mode(idx);
    }

    reload_current_level() {
        this.clear_current_level();
        this.resource_manager.load_current_level(this, init);
    }

    load_prev_level() {
        this.clear_current_level();
        $$.HINTS_EDITABLE = true;
        this.game_mode = 1;
        this.resource_manager.load_prev_level(this, init);
    }

    load_next_level() {
        this.clear_current_level();
        $$.HINTS_EDITABLE = true;
        this.game_mode = 1;
        this.resource_manager.load_next_level(this, init);
    }

    load_level(idx: number) {
        this.clear_current_level();
        $$.HINTS_EDITABLE = true;
        this.game_mode = 1;
        this.resource_manager.load_level(idx, this, init);
    }

    load_succeed_level() {
        this.clear_current_level();
        $$.HINTS_EDITABLE = true;
        this.game_mode = 1;
        this.resource_manager.load_succeed_level(this, init);
    }

    clear_current_level() {
        Transaction_Manager.instance.clear();
        Contextual_Manager.instance.switch_mode(-1);

        const manager = this.entity_manager;
        manager.all_entities.forEach((it) => { it.node.destroy(); });
        Entity_Manager.current = null;

        this.debug_grid.destroy();
        this.debug_grid = null;
    }

    // Settle singleton managers manually
    settle_singletons() {
        Level_Editor.instance = this;
        Contextual_Manager.Settle(this.contextual_manager);
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        Audio_Manager.Settle(this.audio_manager);
        Efx_Manager.Settle(this.efx_manager);
    }
}

function update_ui(editor: Level_Editor) {
    function update_level() {
        const levels = editor.levels;
        levels.label_current.string = Resource_Manager.instance.current_level.name;
    }
    function update_difficulty() {
        const difficulty = editor.difficulty;
        difficulty.set_rating(editor.resource_manager.current_level_config.difficulty);
    }
    function reset_undo() {
        editor.undos.clear();
        editor.show_undo_changes(0);
    }
    function reset_transaction() {
        editor.transaction_panel.reset_counter();
        editor.transaction_panel.clear_logs();
        editor.transaction_panel.hide_logs();
    }
    function update_duration() {
        const duration = editor.durations;
        $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;
        duration.label_current.string = Const.DURATION_NAMES[$$.DURATION_IDX];
    }
    //#SCOPE

    update_level();
    update_difficulty();
    reset_undo();
    reset_transaction();
    update_duration();
}

function init_ui(editor: Level_Editor) {
    function init_options() {
        { // Save level config
            const e = new EventHandler();
            e.target = editor.contextual_manager.node;
            e.component = "Contextual_Manager";
            e.handler = 'save_level';
            editor.btn_save.clickEvents.push(e);
        }
        { // Download level config
            const e = new EventHandler();
            e.target = editor.resource_manager.node;
            e.component = "Resource_Manager";
            e.handler = 'download_config';
            editor.btn_download.clickEvents.push(e);
        }
    }

    function init_modes() {
        const e = new EventHandler();
        e.target = editor.node;
        e.component = "Level_Editor";
        e.handler = 'switch_edit_mode';
        editor.modes.events.push(e);
    }

    function init_levels() {
        const levels = editor.levels;
        levels.label.string = "level";
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
        const difficulty = editor.difficulty;
        difficulty.label.string = "difficulty";
        { // Rating event
            const e = new EventHandler();
            e.target = editor.resource_manager.node;
            e.component = "Resource_Manager";
            e.handler = 'set_level_difficulty';
            difficulty.on_rated.push(e);
        }
    }

    function init_undos() {
        const undos = editor.undos;
        undos.label.string = "undo";
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
        const navigator = editor.transaction_panel.navigator;
        navigator.label.string = "transaction";
        { // Show or Hide single move logs
            const e = new EventHandler();
            e.target = editor.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'toggle';
            navigator.btn_current.clickEvents.push(e);
        }
        { // Show prev transaction
            const e = new EventHandler();
            e.target = editor.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'show_prev';
            navigator.btn_prev.clickEvents.push(e);
        }
        { // Show next transaction
            const e = new EventHandler();
            e.target = editor.transaction_panel.node;
            e.component = 'Transaction_Panel';
            e.handler = 'show_next';
            navigator.btn_next.clickEvents.push(e);
        }
    }

    function init_duration() {
        const navigatar = editor.durations;
        navigatar.label.string = 'duration';
        { // Slow Down
            const e = new EventHandler();
            e.target = editor.transaction_manager.node;
            e.component = 'Transaction_Manager';
            e.handler = 'slow_down';
            navigatar.btn_prev.clickEvents.push(e);
        }
        { // Speed up
            const e = new EventHandler();
            e.target = editor.transaction_manager.node;
            e.component = 'Transaction_Manager';
            e.handler = 'speed_up';
            navigatar.btn_next.clickEvents.push(e);
        }
    }
    //#SCOPE

    init_options();
    init_modes();
    init_levels();
    init_difficulty();
    init_undos();
    init_transactions();
    init_duration();
}

function clear_ui(editor: Level_Editor) {
    editor.btn_save.clickEvents = [];
    editor.btn_download.clickEvents = [];
    editor.levels.clear();
    editor.undos.clear();
    editor.transaction_panel.clear();
}

function init(editor: Level_Editor) {
    update_ui(editor);

    const config = editor.resource_manager.current_level_config;

    editor.camera3d_controller.update_view(config.camera);
    editor.light_controller.update_view(config.light);

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
    editor.contextual_manager.enable(editor.game_mode);
}