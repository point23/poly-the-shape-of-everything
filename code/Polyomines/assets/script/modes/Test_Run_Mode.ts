import { _decorator, EventHandler, } from 'cc';
import { Audio_Manager } from '../Audio_Manager';
import { Const, $$, Direction } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Manager } from '../Entity_Manager';
import { Gameplay_Timer } from '../Gameplay_Timer';
import { Button_State, Game_Button, Game_Input, Game_Input_Handler } from '../input/Game_Input_Handler';
import { Input_Manager } from '../input/Input_Manager';
import { Keyboard } from '../input/Keyboard';
import { Virtual_Controller } from '../input/Virtual_Controller';
import { Level_Editor } from '../Level_Editor';
import {
    generate_player_move,
    maybe_move_rovers,
} from '../sokoban';

import { Transaction_Manager } from '../Transaction_Manager';
import { Navigator } from '../ui/Navigator';
import { do_one_undo, undo_end_frame, undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';
import { HERO_ANIM_STATE, Hero_Entity_Data } from '../Hero_Entity_Data';

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
        Input_Manager.Settle(this.input_manager);

        this.input_handlers.push(this.keyboard);
        this.input_handlers.push(this.vcontroller);

        $$.IS_RUNNING = false;
        Gameplay_Timer.run(this, main_loop, [process_animations, update_inputs]);
    }

    on_enter() {
        this.input_manager.init();

        this.current_handler_idx = 0;
        this.input_handlers.forEach((it) => {
            it.active = false;
        });
        this.current_handler.active = true;

        this.#init_ui();

        undo_mark_beginning(this.entity_manager);
        Level_Editor.instance.info("Test Run");

        $$.IS_RUNNING = true;
        $$.RELOADING = false;
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;

        init_animations();
    }

    on_exit() {
        $$.IS_RUNNING = false;
        this.#clear_ui();
        this.input_manager.clear();
        Gameplay_Timer.reset();
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
    }

    #clear_ui() {
        this.inputs_navigator.clear();
        this.inputs_navigator.node.active = false;
        Level_Editor.instance.durations.node.active = false;
        Level_Editor.instance.transaction_panel.navigator.node.active = false;
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
        for (let e of this.entity_manager.hints) {
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

    process_inputs();

    if (!$$.DOING_UNDO && !$$.RELOADING) {
        maybe_move_rovers(transaction_manager);
        transaction_manager.update_transactions();

        if (entity_manager.pending_win) {
            Level_Editor.instance.load_succeed_level();
            $$.IS_RUNNING = false;
            return;
        }

        const enter_res = entity_manager.entering_other_level;
        if (enter_res.entering) {
            Level_Editor.instance.load_level(enter_res.idx);
            $$.IS_RUNNING = false;
            return;
        }
    }

    if ($$.SHOULD_DO_UNDO_AT == Gameplay_Timer.get_gameplay_time().round) {
        undo_end_frame(entity_manager);
    }
}

function init_animations() {
    // const entity_manager = Entity_Manager.current;
    // entity_manager.heros.forEach((it) => { // @Hack 
    //     const hero = it.getComponent(Hero_Entity_Data);
    //     if (entity_manager.active_hero.id == it.id) {
    //         hero.active();
    //     } else {
    //         hero.inactive();
    //     }
    // });
}

function update_inputs() {
    Input_Manager.instance.update_inputs();
}

function process_animations() {
    // if (!$$.IS_RUNNING) return;

    // const entity_manager = Entity_Manager.current;
    // const hero = entity_manager.active_hero.getComponent(Hero_Entity_Data);
    // const input: Game_Input = Input_Manager.instance.game_input;

    // let keep_pressing_moving_btn = false;
    // { // Detect if user keep moving forward
    //     for (let b of [Game_Button.MOVE_BACKWARD, Game_Button.MOVE_FORWARD, Game_Button.MOVE_LEFT, Game_Button.MOVE_RIGHT]) {
    //         if (input.button_states.get(b).ended_down) {
    //             keep_pressing_moving_btn = true;
    //         }
    //     }
    // }

    // if (!$$.HERO_VISUALLY_MOVING && !keep_pressing_moving_btn) { // @Hack
    //     hero.active(2);
    // }
}

function process_inputs() {
    if (!$$.IS_RUNNING) return;

    const entity_manager = Entity_Manager.current;
    const transaction_manager = Transaction_Manager.instance;
    const audio = Audio_Manager.instance;
    const input: Game_Input = Input_Manager.instance.game_input;
    const records = input.pending_records;

    if (!(input.button_states.get(Game_Button.UNDO).ended_down)) {
        $$.DOING_UNDO = false;
    }

    records.sort((a: Button_State, b: Button_State) => { return a.counter - b.counter });// @Note a > b if a - b < 0,

    for (let record of input.pending_records) {
        const button = record.button;

        if (button == Game_Button.RESET) {
            $$.IS_RUNNING = false;
            $$.RELOADING = true;
            Level_Editor.instance.reload_current_level();
        }

        if (button == Game_Button.UNDO) {
            $$.DOING_UNDO = true;
            do_one_undo(entity_manager);
            audio.play_sfx(audio.rewind);
        }

        if (button == Game_Button.SWITCH_HERO) {
            if (entity_manager.num_heros == 1) {
                audio.play_sfx(audio.invalid);
            } else {
                entity_manager.switch_hero();
                audio.play_sfx(audio.switch_hero);
            }
        }

        // @Fixme There might be other buttons.
        input.buffered_player_moves.enqueue(button);
    }

    input.pending_records = [];

    if ($$.DOING_UNDO || $$.RELOADING) return;
    if (!input.buffered_player_moves.empty() && !$$.PLAYER_MOVE_NOT_YET_EXECUTED) {
        while (input.buffered_player_moves.size() >= Const.WEIRD_USER_INPUT_COUNTS) { // @Note Handle weird user inputs.
            input.buffered_player_moves.storage.pop(); // @Hack
        }

        const button = input.buffered_player_moves.dequeue();

        // Move
        if (button == Game_Button.MOVE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 1);
        }
        if (button == Game_Button.MOVE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 1);
        }
        if (button == Game_Button.MOVE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 1);
        }
        if (button == Game_Button.MOVE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 1);
        }

        // Rotate @Deprecated Should be pull?
        if (button == Game_Button.FACE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 0);
        }
        if (button == Game_Button.FACE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 0);
        }
        if (button == Game_Button.FACE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 0);
        }
        if (button == Game_Button.FACE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 0);
        }
    }
}