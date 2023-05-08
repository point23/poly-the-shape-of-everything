import { _decorator, bezierByTime, Button, EventHandler, Label, labelAssembler, } from 'cc';
import { Const, $$, } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Manager } from '../Entity_Manager';
import { Gameplay_Timer } from '../Gameplay_Timer';
import { Game_Input_Handler, Game_Input_Recorder, } from '../input/Game_Input_Handler';
import { Input_Manager } from '../input/Input_Manager';
import { Keyboard } from '../input/Keyboard';
import { Virtual_Controller } from '../input/Virtual_Controller';
import { Level_Editor } from '../Level_Editor';
import { generate_monster_moves, maybe_move_trams } from '../sokoban';

import { Transaction_Manager } from '../Transaction_Manager';
import { Navigator } from '../ui/Navigator';
import { undo_end_frame, undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';
import { init_animations, per_round_animation_update, process_inputs, update_inputs } from '../common';
import { Resource_Manager } from '../Resource_Manager';

const { ccclass, property } = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
    @property(Navigator) inputs_navigator: Navigator = null;
    @property(Input_Manager) input_manager: Input_Manager = null;

    @property(Virtual_Controller) vcontroller: Virtual_Controller = null;
    @property(Keyboard) keyboard: Keyboard = null;

    is_shift_down: boolean = false;
    get entity_manager(): Entity_Manager {
        return Contextual_Manager.instance.entity_manager;
    }

    current_handler_idx: number = 0;
    input_handlers: Game_Input_Handler[] = [];
    get current_handler(): Game_Input_Handler { return this.input_handlers[this.current_handler_idx]; }

    get ticks_per_loop(): number {
        return Const.TICKS_PER_ROUND[$$.DURATION_IDX];
    };

    start() {
        const btn_record = Level_Editor.instance.btn_record;
        const btn_replay = Level_Editor.instance.btn_replay;

        btn_record.node.on(Button.EventType.CLICK, () => {
            toggle_record();
        }, this);

        btn_replay.node.on(Button.EventType.CLICK, () => {
            toggle_replay();
        }, this);

        Input_Manager.Settle(this.input_manager);

        this.input_handlers.push(this.keyboard);
        this.input_handlers.push(this.vcontroller);

        $$.IS_RUNNING = false;
        Gameplay_Timer.run(this, main_loop, [update_inputs]);
    }

    on_enter() {
        Gameplay_Timer.reset();
        Level_Editor.instance.info("Test Run");
        this.input_manager.init();

        { // @Note Dispose inactive handlers
            this.current_handler_idx = 0;
            this.input_handlers.forEach(it => it.active = false);
            this.current_handler.active = true;
        }

        this.#init_ui();

        undo_mark_beginning(this.entity_manager);

        $$.IS_RUNNING = true;
        $$.RELOADING = false;
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;

        init_animations();
    }

    on_exit() {
        $$.IS_RUNNING = false;
        this.#clear_ui();
        this.input_manager.clear();
    }

    #init_ui() {
        this.inputs_navigator.label.string = 'input';
        this.inputs_navigator.label_current.string = this.current_handler.name;
        { // Prev
            const e = new EventHandler();
            e.target = this.node;
            e.component = 'Test_Run_Mode';
            e.handler = 'switch_to_prev_input_handler';
            this.inputs_navigator.btn_prev.clickEvents.push(e);
        }

        { // Next
            const e = new EventHandler();
            e.target = this.node;
            e.component = 'Test_Run_Mode';
            e.handler = 'switch_to_next_input_handler';
            this.inputs_navigator.btn_next.clickEvents.push(e);
        }

        this.inputs_navigator.node.active = true;
        Level_Editor.instance.durations.node.active = true;
        Level_Editor.instance.transaction_panel.navigator.node.active = true;

        Level_Editor.instance.btn_record.node.active = true;
        Level_Editor.instance.btn_replay.node.active = true;
    }

    #clear_ui() {
        this.inputs_navigator.clear();
        this.inputs_navigator.node.active = false;
        Level_Editor.instance.durations.node.active = false;
        Level_Editor.instance.transaction_panel.navigator.node.active = false;

        Level_Editor.instance.btn_record.node.active = false;
        Level_Editor.instance.btn_replay.node.active = false;
    }

    switch_to_prev_input_handler() {
        const last = this.current_handler;
        last.active = false;

        this.current_handler_idx = (this.current_handler_idx - 1 + this.input_handlers.length) % this.input_handlers.length;
        const current = this.current_handler;
        current.active = true;

        this.inputs_navigator.label_current.string = current.name;
    }

    switch_to_next_input_handler() {
        const last = this.current_handler;
        last.active = false;

        this.current_handler_idx = (this.current_handler_idx + 1) % this.input_handlers.length;
        const current = this.current_handler;
        current.active = true;

        this.inputs_navigator.label_current.string = current.name;
    }

    #showing_hints: boolean = false;
    show_hints() {
        if (this.#showing_hints) return;
        // VFX?
        for (let e of this.entity_manager.by_type.Hint) {
            e.node.active = true;
        }
        this.scheduleOnce(function () {
            for (let e of this.entity_manager.hints) {
                e.node.active = false;
            }
            this.#showing_hints = false;
        }, Const.HINTS_DURATION);
    }
}

function main_loop() {
    const transaction_manager = Transaction_Manager.instance;
    const entity_manager = Entity_Manager.current;

    const recorder = Level_Editor.instance.recorder;
    process_inputs(recorder);

    if ($$.IS_REPLAYING && recorder.completed()) {
        const btn_record = Level_Editor.instance.btn_record;
        const btn_replay = Level_Editor.instance.btn_replay;
        const label_replay = btn_replay.getComponentInChildren(Label);

        btn_record.interactable = true;
        label_replay.string = 'Replay';
        toggle_replay();
    }

    if ($$.IS_RUNNING) {
        for (let e of entity_manager.by_type.Hero) {
            per_round_animation_update(e);
        }

        for (let m of entity_manager.by_type.Monster) {
            per_round_animation_update(m);
        }
    }

    if ($$.IS_RUNNING && !$$.DOING_UNDO && !$$.RELOADING) {
        if (entity_manager.pending_win) {
            if ($$.IS_RECORDING || $$.IS_REPLAYING) toggle_record();

            Level_Editor.instance.info("You Win");
            $$.RELOADING = true;
            // Level_Editor.instance.load_succeed_level();
            return;
        }

        const enter_res = entity_manager.entering_other_level;
        if (enter_res.entering) {
            if ($$.IS_RECORDING || $$.IS_REPLAYING) toggle_record();

            Level_Editor.instance.info(`Entering Level#${enter_res.idx}`);
            $$.RELOADING = true;
            // Level_Editor.instance.load_level(enter_res.idx);
            return;
        }

        maybe_move_trams(transaction_manager);
        transaction_manager.update_transactions();
    }

    const now = Gameplay_Timer.get_gameplay_time();

    if ($$.SHOULD_UNDO_AT == now.round) {
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;
        undo_end_frame(entity_manager);
    }

    if ($$.SHOULD_GENERATE_MONSTER_MOVE_AT == now.round) {
        generate_monster_moves(transaction_manager, entity_manager);
    }
}

function toggle_record(): void {
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

function toggle_replay(): void {
    const recorder = Level_Editor.instance.recorder;
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

function reload_current_level(): void {
    $$.IS_RUNNING = false;
    $$.RELOADING = true;

    if ($$.FOR_EDITING) {
        Level_Editor.instance.reload_current_level();
    }
}