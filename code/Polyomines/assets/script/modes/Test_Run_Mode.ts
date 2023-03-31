import { _decorator, EventKeyboard, EventHandler, KeyCode } from 'cc';
import { Const, $$ } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Manager } from '../Entity_Manager';
import { Game_Button, Game_Input, Game_Input_Handler } from '../input/Game_Input_Handler';
import { Keyboard } from '../input/Keyboard';
import { Virtual_Controller } from '../input/Virtual_Controller';
import { Level_Editor } from '../Level_Editor';
import {
    generate_controller_proc,
    generate_rover_moves_if_switch_turned_on,
} from '../sokoban';

import { Transaction_Manager } from '../Transaction_Manager';
import { Navigator } from '../ui/Navigator';
import { do_one_undo, undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass, property } = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
    @property(Navigator) inputs_navigator: Navigator = null;

    @property(Virtual_Controller) vcontroller: Virtual_Controller = null;
    @property(Keyboard) keyboard: Keyboard = null;

    is_shift_down: boolean = false;
    entity_manager: Entity_Manager = null; // @hack

    current_handler_idx: number = 0;
    input_handlers: Game_Input_Handler[] = [];
    get current_handler(): Game_Input_Handler { return this.input_handlers[this.current_handler_idx]; }
    get input(): Game_Input { return this.current_handler.input; }

    get ticks_per_loop(): number {
        return Const.Ticks_Per_Loop[Transaction_Manager.instance.duration_idx];
    };

    round: number = 0;
    #tick: number = 0;

    start() {
        this.input_handlers.push(this.keyboard);
        this.input_handlers.push(this.vcontroller);

        $$.IS_RUNNING = false;
        this.schedule(this.tick, Const.Tick_Interval);
        this.schedule(this.#update_inputs, Const.Input_Query_Interval)
    }

    on_enter() {
        this.entity_manager = Contextual_Manager.instance.entity_manager;
        undo_mark_beginning(this.entity_manager);
        Level_Editor.instance.info("Test Run");

        $$.IS_RUNNING = true;
        $$.RELOADING = false;
        this.round = 0;

        this.#init_ui();
        this.current_handler.init();
    }

    on_exit() {
        $$.IS_RUNNING = false;

        this.#clear_ui();
        this.current_handler.clear();
    }

    tick() {
        if ((this.#tick % this.ticks_per_loop) == 0) {
            this.main_loop();
        }
        this.#tick = (this.#tick + 1) % (1 << 16);
    }

    main_loop() {
        if (!$$.IS_RUNNING) return;

        const transaction_manager = Transaction_Manager.instance;
        this.#process_inputs();
        if (!$$.DOING_UNDO && !$$.RELOADING) {
            generate_rover_moves_if_switch_turned_on(transaction_manager, this.round);
            transaction_manager.execute();
            this.round = (this.round + 1) % (1 << 16);
            if (this.entity_manager.pending_win) {
                Level_Editor.instance.load_succeed_level();
                $$.IS_RUNNING = false;
            }

            let entering = this.entity_manager.entering_other_level;
            if (entering.entering) {
                Level_Editor.instance.load_level(entering.idx);
            }
        }

        $$.DOING_UNDO = false;
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
        last.clear();
        this.current_handler_idx = (this.current_handler_idx - 1 + this.input_handlers.length) % this.input_handlers.length;
        const current = this.current_handler;
        current.init();
        this.inputs_navigator.label_current.string = current.name;
    }

    switch_to_next_input_handler() {
        const last = this.current_handler;
        last.clear();
        this.current_handler_idx = (this.current_handler_idx + 1) % this.input_handlers.length;
        const current = this.current_handler;
        current.init();
        this.inputs_navigator.label_current.string = current.name;
    }

    #update_inputs() {
        if (this.input.availble) return;
        this.current_handler.update_input();
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

    #process_inputs() {
        if (!this.input.availble) return;
        const current_button = this.input.current_button;

        if (current_button == Game_Button.RESET) {
            $$.RELOADING = true;
            Level_Editor.instance.reload_current_level();
        } else if (current_button == Game_Button.UNDO) {
            $$.DOING_UNDO = true;
            do_one_undo(this.entity_manager);
        } else if (current_button == Game_Button.SWITCH_HERO) {
            this.entity_manager.switch_hero();
        } else if (this.input.moved || this.input.rotated) {
            let direction = 0;
            const step = this.input.moved ? 1 : 0;

            for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.FACE_BACKWARD; i++) {
                if (current_button == i) {
                    direction = i % 4;
                    break; // @note Just take the first button which ended down
                }
            }
            generate_controller_proc(Transaction_Manager.instance, this.entity_manager, direction, step);
        }

        this.input.reset();
    }

    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;

        if (key_code == KeyCode.KEY_H) {
            this.show_hints();
        }

        this.keyboard.handle_key_down(key_code);
    }

    handle_key_up(event: EventKeyboard) {
        let key_code: number = event.keyCode;
        this.keyboard.handle_key_up(key_code);
    }
}