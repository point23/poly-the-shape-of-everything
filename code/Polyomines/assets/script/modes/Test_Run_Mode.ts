import { _decorator, EventKeyboard, KeyCode } from 'cc';
import { Const } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Manager } from '../Entity_Manager';
import { Direction } from '../Game_Entity';
import { Dpad, Dpad_Button, Dpad_Input } from '../input/Dpad';
import { Joystick_Input, Joystick } from '../input/Joystick';
import { Level_Editor } from '../Level_Editor';
import {
    Controller_Proc_Move,
    generate_controller_proc,
    generate_rover_moves_if_switch_turned_on,
    Possess_Move
} from '../sokoban';

import { Transaction_Manager } from '../Transaction_Manager';
import { UI_Manager } from '../UI_Manager';
import { do_one_undo, undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';

export enum Game_Button {
    MOVE_LEFT = Direction.LEFT,
    MOVE_RIGHT = Direction.RIGHT,
    MOVE_FORWARD = Direction.FORWARD,
    MOVE_BACKWARD = Direction.BACKWORD,

    FACE_LEFT = Direction.LEFT + 4,
    FACE_RIGHT = Direction.RIGHT + 4,
    FACE_FORWARD = Direction.FORWARD + 4,
    FACE_BACKWARD = Direction.BACKWORD + 4,
}

export class Game_Controller_Input {
    availble: boolean = false;
    moved: boolean = false;
    button_states: Uint8Array = new Uint8Array(8); // @temprory

    reset() {
        this.availble = false;
        this.moved = false;

        this.button_states.forEach((it, it_idx) => {
            this.button_states[it_idx] = 0;
        });
    }
}

const { ccclass, property } = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
    @property(Joystick) joystick: Joystick = null;
    @property(Dpad) dpad: Dpad = null;

    is_shift_down: boolean = false;
    entity_manager: Entity_Manager = null; // @hack

    input: Game_Controller_Input = new Game_Controller_Input();

    get ticks_per_loop(): number {
        return Const.Ticks_Per_Loop[Transaction_Manager.instance.duration_idx];
    };
    #round: number = 0;
    #tick: number = 0;

    #is_running: boolean = false;

    set is_running(v: boolean) {
        this.#is_running = v;
    };

    get is_running(): boolean {
        return this.#is_running;
    }

    on_enter() {
        this.entity_manager = Contextual_Manager.instance.entity_manager;
        undo_mark_beginning(this.entity_manager);
        UI_Manager.instance.info("Test Run");

        this.is_running = true;
        this.#init_inputs();

        this.schedule(this.tick, Const.Tick_Interval);
        this.schedule(this.#handle_inputs, Const.Input_Query_Interval);
    }

    on_exit() {
        this.is_running = false;
        this.#clear_inputs();
        this.unschedule(this.tick);
    }

    tick() {
        if ((this.#tick % this.ticks_per_loop) == 0) {
            this.main_loop();
        }
        this.#tick = (this.#tick + 1) % (1 << 16);
    }

    main_loop() {
        if (!this.is_running) return;
        const transaction_manager = Transaction_Manager.instance;

        if ((this.#round % Const.ROVER_SPEED) == 0) {
            generate_rover_moves_if_switch_turned_on(transaction_manager);
        }

        this.#process_inputs();

        transaction_manager.execute_async();
        this.#round = (this.#round + 1) % (1 << 16);
    }

    #init_inputs() {
        this.joystick.init();
        this.dpad.init();
    }

    #clear_inputs() {
        this.joystick.clear();
        this.dpad.clear();
    }

    #handle_inputs() {
        if (this.input.availble) return;

        this.input.reset();
        this.#handle_joystick_input();
        this.#handle_dpad_input();
    }

    #process_inputs() {
        if (!this.input.availble) return;

        let direction = 0;
        const step = this.input.moved ? 1 : 0;

        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.FACE_BACKWARD; i++) {
            if (this.input.button_states[i]) {
                direction = i % 4;
                break; // @note Just take the first button which ended down
            }
        }

        this.input.reset();
        generate_controller_proc(Transaction_Manager.instance, this.entity_manager, direction, step);
    }

    #handle_joystick_input() {
        const state: Joystick_Input = this.joystick.state;
        if (!state.available) return;

        this.input.availble = true;

        const deg = state.degree;
        if (deg >= 45 && deg <= 135) { // BACKWARD
            this.input.button_states[Game_Button.FACE_BACKWARD] = 1;
        } else if (deg <= -45 && deg >= -135) { // FORWARD
            this.input.button_states[Game_Button.FACE_FORWARD] = 1;
        } else if (deg >= 135 || deg <= -135) { // LEFT
            this.input.button_states[Game_Button.FACE_LEFT] = 1;
        } else if (deg <= 45 && deg >= -45) { // RIGHT
            this.input.button_states[Game_Button.FACE_RIGHT] = 1;

        }
    }

    #handle_dpad_input() {
        const state: Dpad_Input = this.dpad.state;

        if (!state.available) return;

        this.input.availble = true;

        this.input.button_states[state.btn_idx] = 1;
        this.input.moved = true;
    }

    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;

        const active_hero = this.entity_manager.active_hero;
        switch (key_code) {
            case KeyCode.ARROW_UP:
            case KeyCode.KEY_W: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.BACKWORD;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.ARROW_DOWN:
            case KeyCode.KEY_S: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.FORWARD;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.ARROW_LEFT:
            case KeyCode.KEY_A: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.LEFT;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.ARROW_RIGHT:
            case KeyCode.KEY_D: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.RIGHT;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.ENTER: {
                const move = new Possess_Move(active_hero);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.KEY_P: {
                this.#is_running = !this.#is_running;
            } break;

            case KeyCode.KEY_R: {
                Level_Editor.instance.reload_current_level();
            } break;

            case KeyCode.KEY_Z: {
                do_one_undo(this.entity_manager);
            } break;

            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.is_shift_down = true;
                break;
        }
    }

    handle_key_up(event: EventKeyboard) {
        let keycode: number = event.keyCode;
        switch (keycode) {
            case KeyCode.SHIFT_LEFT:
            case KeyCode.SHIFT_RIGHT:
                this.is_shift_down = false;
                break;
        }
    }
}