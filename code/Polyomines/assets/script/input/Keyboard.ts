import { _decorator, KeyCode, Game } from 'cc';
import { Button_State, ended_down, Game_Button, Game_Input, Game_Input_Handler, handle_button_down, handle_button_up, pressed_long_enough } from './Game_Input_Handler';
const { ccclass, property } = _decorator;

@ccclass('Keyboard')
export class Keyboard extends Game_Input_Handler {
    init() { }

    clear() {
        this.#input.reset();
        this.#map.clear();
    }

    #map: Map<number, Button_State> = new Map();

    update_input() {
        if (this.#input.availble) return;

        this.#input.reset();
        const shift_down = (ended_down(this.#map, KeyCode.SHIFT_LEFT) || ended_down(this.#map, KeyCode.SHIFT_RIGHT));

        if (pressed_long_enough(this.#map, KeyCode.ARROW_UP) || pressed_long_enough(this.#map, KeyCode.KEY_W)) {
            this.#input.availble = true;
            this.#input.rotated = shift_down;
            this.#input.moved = !shift_down;
            if (shift_down) {
                this.#input.button_states[Game_Button.FACE_BACKWARD] = 1;
            } else {
                this.#input.button_states[Game_Button.MOVE_BACKWARD] = 1;
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_DOWN) || pressed_long_enough(this.#map, KeyCode.KEY_S)) {
            this.#input.availble = true;
            this.#input.rotated = shift_down;
            this.#input.moved = !shift_down;
            if (shift_down) {
                this.#input.button_states[Game_Button.FACE_FORWARD] = 1;
            } else {
                this.#input.button_states[Game_Button.MOVE_FORWARD] = 1;
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_LEFT) || pressed_long_enough(this.#map, KeyCode.KEY_A)) {
            this.#input.availble = true;
            this.#input.rotated = shift_down;
            this.#input.moved = !shift_down;
            if (shift_down) {
                this.#input.button_states[Game_Button.FACE_LEFT] = 1;
            } else {
                this.#input.button_states[Game_Button.MOVE_LEFT] = 1;
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_RIGHT) || pressed_long_enough(this.#map, KeyCode.KEY_D)) {
            this.#input.availble = true;
            this.#input.rotated = shift_down;
            this.#input.moved = !shift_down;
            if (shift_down) {
                this.#input.button_states[Game_Button.FACE_RIGHT] = 1;
            } else {
                this.#input.button_states[Game_Button.MOVE_RIGHT] = 1;
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.KEY_R)) {
            this.#input.availble = true;
            this.#input.button_states[Game_Button.RESET] = 1;
        }

        if (pressed_long_enough(this.#map, KeyCode.KEY_H)) {
            this.#input.availble = true;
            this.#input.button_states[Game_Button.HINTS] = 1;
        }

        if (pressed_long_enough(this.#map, KeyCode.KEY_Z)) {
            this.#input.availble = true;
            this.#input.button_states[Game_Button.UNDO] = 1;
        }

        // @todo There're sth of user input that seems actually 
        // not related to current definition of "Available".
        if (pressed_long_enough(this.#map, KeyCode.TAB)) {
            this.#input.availble = true;
            this.#input.button_states[Game_Button.SWITCH_HERO] = 1;
        }
    }

    get input(): Game_Input { return this.#input; }
    get name(): string {
        return "Keyboard";
    }
    #input: Game_Input = new Game_Input();

    handle_key_down(key_code: number) {
        handle_button_down(this.#map, key_code);
    }

    handle_key_up(key_code: number) {
        handle_button_up(this.#map, key_code);
    }
}