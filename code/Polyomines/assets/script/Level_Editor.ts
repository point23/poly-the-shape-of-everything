import { _decorator, Component, Node, instantiate, Prefab, EventHandler, Button, RichText, resources, Label, editorExtrasTag } from 'cc';
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
import { make_human_animation_graph, make_monster_animation_graph } from './Character_Data';
import { Game_Input_Recorder } from './input/Game_Input_Handler';

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

    @property(Button) btn_record: Button = null;
    @property(Button) btn_replay: Button = null;

    @property(Button) btn_test: Button = null;

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
    recorder: Game_Input_Recorder = new Game_Input_Recorder();

    onLoad() {
        $$.HINTS_EDITABLE = true;
        $$.FOR_EDITING = true

        this.settle_singletons();
        init_ui(this);
        make_human_animation_graph(); // @Note There're some aync? behaviour inside...
        make_monster_animation_graph(); // @Note There're some aync? behaviour inside...

        $$.AVAILABLE = false;
        Resource_Manager.instance.load_levels(this, init);

        $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;

        // @Hack
        this.btn_record.node.on(Button.EventType.CLICK, () => { toggle_record() });
        this.btn_replay.node.on(Button.EventType.CLICK, () => { toggle_replay() });
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

    #test_statistics: Map<string, { tested: boolean, passed: boolean }> = new Map();
    auto_test() {
        const resource = this.resource_manager;
        const transaction = this.transaction_manager;
        const levels_to_test = resource.levels_to_test;
        if (!levels_to_test) return;

        for (let id of levels_to_test) {
            this.#test_statistics.set(id, { tested: false, passed: false });
        }

        $$.AUTO_TEST = true;
        const init_level = levels_to_test[0];
        const idx = resource.level_id_to_idx.get(init_level);
        this.load_level(idx);
    }

    note_test_result(res: boolean) {
        const resource = this.resource_manager;
        const idx = resource.current_level_idx;
        const current = resource.level_idx_to_id.get(idx);
        console.log(`[${res ? 'PASS' : 'FAIL'}]: ${current}`);
        this.#test_statistics.get(current).passed = res;
        this.#test_statistics.get(current).tested = true;

        const levels_to_test = resource.levels_to_test;
        let next = null;
        for (let id of levels_to_test) {
            if (this.#test_statistics.get(id).tested) continue;
            next = id;
            break;
        }
        if (next) {
            const idx = resource.level_id_to_idx.get(next);
            this.load_level(idx);
        } else {
            const num = levels_to_test.length;
            let passed = 0;
            for (let id of levels_to_test) {
                if (!this.#test_statistics.get(id).passed) continue;
                passed += 1;
            }
            console.log(`total: ${num}, passed: ${passed}, failed: ${num - passed}`);

            $$.AUTO_TEST = false;
            this.load_level(0);
        }
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

        const manager = Entity_Manager.current;
        manager?.reclaim_all();
        Entity_Manager.current = null;

        this.debug_grid?.destroy();
        this.debug_grid = null;

        $$.AVAILABLE = false;
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

        { // Auto test!!!
            const e = new EventHandler();
            e.target = editor.node;
            e.component = "Level_Editor";
            e.handler = 'auto_test';
            editor.btn_test.clickEvents.push(e);
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
    $$.AVAILABLE = true;

    if ($$.AUTO_TEST) {
        editor.game_mode = 0;
        editor.contextual_manager.enable(editor.game_mode);
        editor.transaction_manager.speed_up();
        editor.transaction_manager.speed_up();
        editor.transaction_manager.speed_up();

        $$.IS_REPLAYING = true;
        const resource = editor.resource_manager;
        const records = resource.current_level_config.records;
        const recorder = editor.recorder;
        recorder.clear();
        if (records) {
            for (let r of records) {
                recorder.add(r.button, r.time);
            }
        }
    } else {
        editor.contextual_manager.enable(editor.game_mode);
    }
}

export function toggle_record(): void {
    const recorder = Level_Editor.instance.recorder;
    const btn_record = Level_Editor.instance.btn_record;
    const btn_replay = Level_Editor.instance.btn_replay;

    const label_record = btn_record.getComponentInChildren(Label);
    if ($$.IS_RECORDING) {
        btn_replay.interactable = true;
        label_record.string = 'Record';
    } else {
        btn_replay.interactable = false;
        label_record.string = 'Recording';
    }

    if ($$.IS_RECORDING) {
        $$.IS_RECORDING = false;
        const resource = Resource_Manager.instance;
        const updated = resource.current_level_config;

        updated.records = recorder.records;
        Resource_Manager.instance.save_level(updated);
        Level_Editor.instance.info("Recorded!");

        console.log(recorder.to_string());
    } else {
        $$.IS_RECORDING = true;
        reload_current_level();
        recorder.clear();
    }
}

function reload_current_level(): void {
    $$.IS_RUNNING = false;
    $$.RELOADING = true;

    if ($$.FOR_EDITING) {
        Level_Editor.instance.reload_current_level();
    }
}

export function toggle_replay(): void {
    const btn_record = Level_Editor.instance.btn_record;
    const btn_replay = Level_Editor.instance.btn_replay;

    const label_replay = btn_replay.getComponentInChildren(Label);
    if ($$.IS_REPLAYING) {
        btn_record.interactable = true;
        label_replay.string = 'Replay';
    } else {
        btn_record.interactable = false;
        label_replay.string = 'Replaying';
    }

    if ($$.IS_REPLAYING) {
        $$.IS_REPLAYING = false;
    } else {
        $$.IS_REPLAYING = true;

        const resource = Resource_Manager.instance;
        const records = resource.current_level_config.records;
        const recorder = Level_Editor.instance.recorder;
        recorder.clear();

        if (records) {
            for (let r of records) {
                recorder.add(r.button, r.time);
            }
        }

        console.log(recorder.to_string());
        reload_current_level();
    }
}