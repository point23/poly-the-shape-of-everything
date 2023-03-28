import { _decorator, Component, Node, EventKeyboard, input, Input } from 'cc';
import { Const } from '../Const';
import { Game_Input, Game_Input_Handler } from './Game_Input_Handler';
import { Keyboard } from './Keyboard';
import { Virtual_Controller } from './Virtual_Controller';
const { ccclass, property } = _decorator;

@ccclass('Input_Manager')
export class Input_Manager extends Component {
    public static instance: Input_Manager = null;
    public static Settle(instance: Input_Manager) {
        Input_Manager.instance = instance;
    }

    @property(Virtual_Controller) vcontroller: Virtual_Controller = null;
    @property(Keyboard) keyboard: Keyboard = null;

    input_handlers: Game_Input_Handler[] = [];
    game_input: Game_Input = new Game_Input();

    onLoad() {
        input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
        input.on(Input.EventType.KEY_UP, this.on_key_up, this);
        this.input_handlers = [this.vcontroller, this.keyboard];
    }

    start() {
        this.schedule(this.update_inputs, Const.Input_Query_Interval);
    }

    init() {
        this.input_handlers.forEach((it) => {
            it.init();
        });
    }

    clear() {
        this.input_handlers.forEach((it) => {
            it.clear();
        });
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
        if (this.game_input.availble) return;

        this.input_handlers.forEach((it) => {
            it.update_input();
            if (it.input.availble) {
                this.game_input = it.input;
            }
        });
    }
}


