import { _decorator, KeyCode, Game } from 'cc';
import { button_state, ended_down, Game_Button, Game_Input, Game_Input_Handler, handle_button_down, handle_button_up, pressed_long_enough } from './Game_Input_Handler';
const { ccclass, property } = _decorator;

@ccclass('Keyboard')
export class Keyboard extends Game_Input_Handler {
    init() {
        this.#input = new Game_Input();
    }

    clear() {
        this.#input.reset();
        this.#map.clear();
    }

    #map: Map<number, button_state> = new Map();

    update_input() {
        const input = this.#input;
        if (input.availble) return;

        input.reset();
        const shift_down = (ended_down(this.#map, KeyCode.SHIFT_LEFT) || ended_down(this.#map, KeyCode.SHIFT_RIGHT));

        if (pressed_long_enough(this.#map, KeyCode.ARROW_UP) || pressed_long_enough(this.#map, KeyCode.KEY_W)) {
            input.availble = true;
            input.rotated = shift_down;
            input.moved = !shift_down;
            if (shift_down) {
                input.press(Game_Button.FACE_BACKWARD);
            } else {
                input.press(Game_Button.MOVE_BACKWARD);
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_DOWN) || pressed_long_enough(this.#map, KeyCode.KEY_S)) {
            input.availble = true;
            input.rotated = shift_down;
            input.moved = !shift_down;
            if (shift_down) {
                input.press(Game_Button.FACE_FORWARD);
            } else {
                input.press(Game_Button.MOVE_FORWARD);
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_LEFT) || pressed_long_enough(this.#map, KeyCode.KEY_A)) {
            input.availble = true;
            input.rotated = shift_down;
            input.moved = !shift_down;
            if (shift_down) {
                input.press(Game_Button.FACE_LEFT);
            } else {
                input.press(Game_Button.MOVE_LEFT);
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.ARROW_RIGHT) || pressed_long_enough(this.#map, KeyCode.KEY_D)) {
            input.availble = true;
            input.rotated = shift_down;
            input.moved = !shift_down;
            if (shift_down) {
                input.press(Game_Button.FACE_RIGHT);
            } else {
                input.press(Game_Button.MOVE_RIGHT);
            }
        }

        if (pressed_long_enough(this.#map, KeyCode.KEY_R)) {
            input.availble = true;
            input.press(Game_Button.RESET);
        }

        if (pressed_long_enough(this.#map, KeyCode.KEY_Z)) {
            input.availble = true;
            input.press(Game_Button.UNDO);
        }

        // @todo There're sth of user input that seems actually 
        // not related to current definition of "Available".
        if (pressed_long_enough(this.#map, KeyCode.TAB)) {
            input.availble = true;
            input.press(Game_Button.SWITCH_HERO);
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