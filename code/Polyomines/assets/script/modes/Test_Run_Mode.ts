import { _decorator, EventKeyboard, KeyCode } from 'cc';
import { Contextual_Manager } from '../Contextual_Manager';

import { Entity_Manager } from '../Entity_Manager';
import { Direction } from '../Game_Entity';
import { Level_Editor } from '../Level_Editor';
import { Controller_Proc_Move, Possess_Move } from '../sokoban';
import { Transaction_Manager } from '../Transaction_Manager';
import { UI_Manager } from '../UI_Manager';
import { undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass } = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
    is_shift_down: boolean = false;
    entity_manager: Entity_Manager; // @hack

    on_enter() {
        this.entity_manager = Contextual_Manager.instance.entity_manager;
        undo_mark_beginning(this.entity_manager);

        UI_Manager.instance.info("Test Run");
        Level_Editor.instance.is_running = true; // @hack
    }

    on_exit() {
        Level_Editor.instance.is_running = false; // @hack
    }

    handle_key_down(event: EventKeyboard) {
        let key_code = event.keyCode;

        const active_hero = this.entity_manager.active_hero;
        switch (key_code) {
            case KeyCode.KEY_W: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.BACKWORD;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.KEY_S: {
                const step = this.is_shift_down ? 0 : 1;
                const target_directionection = Direction.FORWARD;
                const move = new Controller_Proc_Move(active_hero, target_directionection, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

            case KeyCode.KEY_A: {
                const step = this.is_shift_down ? 0 : 1;
                const target_direction = Direction.LEFT;
                const move = new Controller_Proc_Move(active_hero, target_direction, step);
                Transaction_Manager.instance.try_add_new_move(move);
            } break;

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

            case KeyCode.KEY_R: {
                Level_Editor.instance.reload_current_level();
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