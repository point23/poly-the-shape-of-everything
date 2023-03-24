import { _decorator, EventKeyboard, KeyCode, EventHandler, Vec2, misc } from 'cc';
import { Const } from '../Const';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Manager } from '../Entity_Manager';
import { Direction } from '../Game_Entity';
import { Level_Editor } from '../Level_Editor';
import { Controller_Proc_Move, Possess_Move } from '../sokoban';
import { Transaction_Manager } from '../Transaction_Manager';
import { Joystick } from '../ui/Joystick';
import { UI_Manager } from '../UI_Manager';
import { do_one_undo, undo_mark_beginning } from '../undo';

import { Game_Mode } from './Game_Mode_Base';

const { ccclass, property } = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
    @property(Joystick) joystick: Joystick = null;
    is_shift_down: boolean = false;
    entity_manager: Entity_Manager = null; // @hack

    on_enter() {
        this.entity_manager = Contextual_Manager.instance.entity_manager;
        undo_mark_beginning(this.entity_manager);

        { // Navigate to previous level
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Test_Run_Mode";
            e.handler = 'handle_joystick_input';
            this.joystick.controller_events.push(e);
        }

        UI_Manager.instance.info("Test Run");
        Level_Editor.instance.is_running = true; // @hack
    }

    on_exit() {
        this.joystick.controller_events = [];
        Level_Editor.instance.is_running = false; // @hack
    }

    #is_jiggling: boolean = false;
    handle_joystick_input(pos: Vec2, radius: number) {
        if (this.#is_jiggling) return;
        this.#is_jiggling = true;

        const delta = pos.length();

        const step = ((delta / radius) >= 0.5) ? 1 : 0;

        const active_hero = this.entity_manager.active_hero;

        const rad = Math.atan2(pos.y, pos.x);
        const deg: number = misc.radiansToDegrees(rad);
        console.log(deg);

        var direction: Direction;
        if (deg >= 45 && deg <= 135) direction = Direction.BACKWORD;
        if (deg <= -45 && deg >= -135) direction = Direction.FORWARD;
        if (deg >= 135 || deg <= -135) direction = Direction.LEFT;
        if (deg <= 45 && deg >= -45) direction = Direction.RIGHT;

        const move = new Controller_Proc_Move(active_hero, direction, step);
        Transaction_Manager.instance.try_add_new_move(move);

        this.scheduleOnce(() => {
            this.#is_jiggling = false;
        }, Const.Joystick_Jiggling_Interval);
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