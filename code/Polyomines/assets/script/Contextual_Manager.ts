import { _decorator, Component, EventKeyboard, EventMouse, EventTouch, game, input, Input, KeyCode, Node } from 'cc';
import { Entity_Manager } from './Entity_Manager';

import { Game_Mode } from './modes/Game_Mode_Base';
import { really_do_one_undo, undo_mark_beginning } from './undo';

const { ccclass, property } = _decorator;

/**
 * Implementation of State Pattern
 *  - Contextual_Manager as Context who holds states
 *  - Game_Modes as State who support handlers
 *
 * Problem:
 * - When a new input_event needs to be handled, both Submode and Context are  increasing?
 */

@ccclass('Contextual_Manager')
export class Contextual_Manager extends Component {
    public static instance: Contextual_Manager = null;
    public static Settle(instance: Contextual_Manager) {
        Contextual_Manager.instance = instance;
    }

    @property([Game_Mode]) game_modes: Game_Mode[] = [];
    current_mode: Game_Mode = null;

    current_mode_idx: number = -1;
    get entity_manager(): Entity_Manager {
        return Entity_Manager.current;
    }

    is_enabled: boolean = false;

    public enable() {
        if (!this.is_enabled) {
            this.register_events();
            this.is_enabled = true;
        };

        this.switch_mode(0);
        undo_mark_beginning(this.entity_manager);
    }

    public dispose() {
        this.unregister_events();
    }

    register_events() {
        input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
        input.on(Input.EventType.KEY_UP, this.on_key_up, this);
        input.on(Input.EventType.MOUSE_DOWN, this.on_mouse_down, this);
        input.on(Input.EventType.MOUSE_MOVE, this.on_mouse_move, this);
        input.on(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
        input.on(Input.EventType.TOUCH_START, this.on_touch_start, this);
        input.on(Input.EventType.TOUCH_MOVE, this.on_touch_move, this);
        input.on(Input.EventType.TOUCH_END, this.on_touch_end, this);
    }

    unregister_events() {
        input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
        input.off(Input.EventType.MOUSE_DOWN, this.on_mouse_down, this);
        input.off(Input.EventType.MOUSE_MOVE, this.on_mouse_move, this);
        input.off(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
        input.off(Input.EventType.TOUCH_START, this.on_touch_start, this);
        input.off(Input.EventType.TOUCH_MOVE, this.on_touch_move, this);
        input.off(Input.EventType.TOUCH_END, this.on_touch_end, this);
    }

    switch_mode(idx: number = null) {
        let from = this.current_mode;
        from?.on_exit();

        this.current_mode_idx = (this.current_mode_idx + 1) % this.game_modes.length;
        if (idx != null) {
            this.current_mode_idx = idx;
        }

        let to = this.game_modes[this.current_mode_idx];
        this.current_mode = to;
        to?.on_enter();
    }

    save_level() {
        this.current_mode.save_level();
    }

    on_key_down(event: EventKeyboard) {
        /* Handle Special Case: common interactions */
        const key_code = event.keyCode;
        switch (key_code) {
            case KeyCode.TAB:
                this.switch_mode();
                break;
            /* 
                    case KeyCode.EQUAL: {
                        Transaction_Manager.instance.redo_async();
                    } break;
             */
            default:
                this.current_mode.handle_key_down(event);
                break;
        }
    }

    on_key_up(event: EventKeyboard) {
        this.current_mode.handle_key_up(event);
    }

    on_mouse_down(event: EventMouse) {
        this.current_mode.handle_mouse_down(event);
    }

    on_mouse_move(event: EventMouse) {
        this.current_mode.handle_mouse_move(event);
    }

    on_mouse_scroll(event: EventMouse) {
        this.current_mode.handle_mouse_scroll(event);
    }

    on_touch_start(event: EventTouch) {
        this.current_mode.handle_touch_start(event);
    }

    on_touch_move(event: EventTouch) {
        this.current_mode.handle_touch_move(event);
    }

    on_touch_end(event: EventTouch) {
        this.current_mode.handle_touch_end(event);
    }
}