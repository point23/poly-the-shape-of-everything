import { _decorator } from 'cc';
import { Game_Input, Game_Input_Handler } from './Game_Input_Handler';
import { Input_Manager } from './Input_Manager';
const { ccclass, property } = _decorator;

@ccclass('Keyboard')
export class Keyboard extends Game_Input_Handler {
    init(i: Game_Input) {
        this.input = i;
    }

    clear() {
        this.input = null;
    }

    get name(): string {
        return "Keyboard";
    }

    #command_button_ended_down: Set<number> = new Set();

    handle_key_down(key_code: number) {
        if (this.active == false) return;

        const game_input = this.input;

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
                if (info.command_button_in_need) {
                    if (this.#command_button_ended_down.has(info.command_button)) {
                        game_input.press(game_button);
                    }
                } else {
                    if (!any_command_button_ended_down) // @Note Ignore it when Command Button is Down
                        game_input.press(game_button);
                }
            }
        }
    }

    handle_key_up(key_code: number) {
        if (this.active == false) return;

        const game_input = this.input;

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