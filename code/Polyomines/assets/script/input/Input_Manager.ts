import { _decorator, Component, EventKeyboard, input, Input, KeyCode } from 'cc';
import { $$, Const } from '../Const';
import { Action_Button } from './Action_Button_Group';
import { Dpad_Button } from './Dpad';
import { Game_Button, Game_Input, Game_Input_Handler, Keyboard_Command_Button } from './Game_Input_Handler';
import { Keyboard } from './Keyboard';
import { Virtual_Controller } from './Virtual_Controller';
const { ccclass, property } = _decorator;

export class Key_Info {
    candidates: KeyCode[];
    command_button_in_need: boolean;
    command_button: Keyboard_Command_Button;

    constructor(buttons: KeyCode[], command_button_in_need = false, command_button: Keyboard_Command_Button = 0) {
        this.candidates = buttons;
        this.command_button_in_need = command_button_in_need;
        this.command_button = command_button;
    }
}

export type keymap = {
    undo: number[],
    reset: number[],
    switch: number[],
    action: number[],

    backward: number[],
    forward: number[],
    left: number[],
    right: number[],

    command_rotate: number,
}

@ccclass('Input_Manager')
export class Input_Manager extends Component {
    public static instance: Input_Manager = null;
    public static Settle(instance: Input_Manager) {
        Input_Manager.instance = instance;
    }

    static Command_Buttons: Map<number, number[]> = new Map();
    static Game_Button_To_Key_Info: Map<number, Key_Info> = new Map(); // Command Button + Game_Button...
    static Dpad_Button_To_Game_Button: Map<number, number> = new Map();
    static Action_Button_To_Game_Button: Map<number, number> = new Map();

    @property(Virtual_Controller) vcontroller: Virtual_Controller = null;
    @property(Keyboard) keyboard: Keyboard = null;

    input_handlers: Game_Input_Handler[] = [];
    game_input: Game_Input = null;

    onLoad() {
        this.input_handlers = [this.vcontroller, this.keyboard];
        // Getting keymap from user config
        this.mapping_game_buttons(Const.DEFAULT_KEYMAP);
    }

    init() {
        input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
        input.on(Input.EventType.KEY_UP, this.on_key_up, this);

        this.game_input = new Game_Input();
        this.input_handlers.forEach((it) => {
            it.init(this.game_input);
            it.active = true;
        });
    }

    clear() {
        input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
        input.off(Input.EventType.KEY_UP, this.on_key_up, this);

        this.game_input = null;
        this.input_handlers.forEach((it) => {
            it.clear();
            it.active = false;
        });
    }

    mapping_game_buttons(config: keymap) {
        // @Note: Keymap Config Example:
        // undo: [z]
        // reset: [r]
        // switch: [tab]
        // backward: [w, up]
        // forward: [s, down]
        // left: [a, left]
        // right: [d, right]
        // command_rotate: shift

        Input_Manager.Command_Buttons = new Map([
            [
                Keyboard_Command_Button.SHIFT,
                [KeyCode.SHIFT_LEFT, KeyCode.SHIFT_RIGHT]
            ],
        ]);

        Input_Manager.Game_Button_To_Key_Info = new Map([
            [Game_Button.UNDO, new Key_Info(config.undo)],
            [Game_Button.RESET, new Key_Info(config.reset)],
            [Game_Button.SWITCH_HERO, new Key_Info(config.switch)],
            [Game_Button.ACTION, new Key_Info(config.action)],

            [Game_Button.FACE_BACKWARD, new Key_Info(config.backward, true, config.command_rotate)],
            [Game_Button.FACE_FORWARD, new Key_Info(config.forward, true, config.command_rotate)],
            [Game_Button.FACE_LEFT, new Key_Info(config.left, true, config.command_rotate)],
            [Game_Button.FACE_RIGHT, new Key_Info(config.right, true, config.command_rotate)],

            [Game_Button.MOVE_BACKWARD, new Key_Info(config.backward)],
            [Game_Button.MOVE_FORWARD, new Key_Info(config.forward)],
            [Game_Button.MOVE_LEFT, new Key_Info(config.left)],
            [Game_Button.MOVE_RIGHT, new Key_Info(config.right)],
        ]);

        Input_Manager.Dpad_Button_To_Game_Button = new Map([
            [Dpad_Button.UP, Game_Button.MOVE_BACKWARD],
            [Dpad_Button.DOWN, Game_Button.MOVE_FORWARD],
            [Dpad_Button.LEFT, Game_Button.MOVE_LEFT],
            [Dpad_Button.RIGHT, Game_Button.MOVE_RIGHT],
        ])

        Input_Manager.Action_Button_To_Game_Button = new Map([
            [Action_Button.X, Game_Button.SWITCH_HERO],
            [Action_Button.Y, Game_Button.RESET],
            [Action_Button.B, Game_Button.UNDO],
            [Action_Button.A, Game_Button.ACTION],
        ])
    }

    on_key_down(event: EventKeyboard) {
        const key_code = event.keyCode;
        this.keyboard.handle_key_down(key_code);
    }

    on_key_up(event: EventKeyboard) {
        const key_code = event.keyCode;
        this.keyboard.handle_key_up(key_code);
    }

    update_inputs() {
        if (!$$.IS_RUNNING) return;

        this.input_handlers.forEach((it) => {
            it.update_input();
        });
    }
}


