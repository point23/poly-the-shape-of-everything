import { _decorator } from 'cc';
import { Game_Button, Game_Input, Game_Input_Handler, pressed_long_enough } from './Game_Input_Handler';
import { Input_Manager } from './Input_Manager';
const { ccclass, property } = _decorator;

@ccclass('Keyboard')
export class Keyboard extends Game_Input_Handler {
    init() {
        this.#input = new Game_Input();
    }

    clear() {
        this.#input.reset();
    }

    update_input() {
        for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.SWITCH_HERO; i++) {
            if (pressed_long_enough(this.#input.button_states, i)) {
                this.input.availble = true;
                this.input.pending_record.push(i);
                this.input.increase_count(i);
            }
        }
    }

    get input(): Game_Input { return this.#input; }
    get name(): string {
        return "Keyboard";
    }

    #input: Game_Input = new Game_Input();
    #command_button_ended_down: Set<number> = new Set();

    handle_key_down(key_code: number) {
        const game_input = this.#input;

        const command_buttons = Input_Manager.Command_Buttons;
        for (let command_button of command_buttons.keys()) {
            const buttons = command_buttons.get(command_button);
            if (buttons.indexOf(key_code) != -1) {
                this.#command_button_ended_down.add(command_button);
            }
        }
        const any_command_button_ended_down = this.#command_button_ended_down.size != 0;

        const map = Input_Manager.Game_Button_To_Key_Info;
        for (let game_button of map.keys()) {
            const info = map.get(game_button);
            if (info.candidates.indexOf(key_code) != -1) {
                console.log(info);
                if (info.command_button_in_need) {
                    if (this.#command_button_ended_down.has(info.command_button)) {
                        game_input.press(game_button);
                    }
                } else {
                    if (!any_command_button_ended_down) // @note Ignore it when Command Button is Down
                        game_input.press(game_button);
                }
            }
        }
    }

    handle_key_up(key_code: number) {
        const game_input = this.#input;

        const command_buttons = Input_Manager.Command_Buttons;
        for (let command_button of command_buttons.keys()) {
            const buttons = command_buttons.get(command_button);
            if (buttons.indexOf(key_code) != -1) {
                this.#command_button_ended_down.delete(command_button);
            }
        }

        const map = Input_Manager.Game_Button_To_Key_Info;
        for (let game_button of map.keys()) {
            const info = map.get(game_button);

            if (info.candidates.indexOf(key_code) != -1) {
                game_input.release(game_button);
            }
        }
    }
}