import { _decorator, Component, Node } from 'cc';
import { Direction } from '../Const';
const { ccclass, property } = _decorator;

export enum Game_Button {
    // @fixme There're hard coded stuff, for now don not change its order!
    MOVE_LEFT,
    MOVE_RIGHT,
    MOVE_FORWARD,
    MOVE_BACKWARD,

    FACE_LEFT,
    FACE_RIGHT,
    FACE_FORWARD,
    FACE_BACKWARD,

    UNDO,
    RESET,
}

export class Game_Input {
    availble: boolean = false;
    moved: boolean = false;
    button_states: Uint8Array = new Uint8Array(10); // @temprory

    reset() {
        this.availble = false;
        this.moved = false;

        this.button_states.forEach((it, it_idx) => {
            this.button_states[it_idx] = 0;
        });
    }
}

@ccclass('Game_Input_Handler')
export class Game_Input_Handler extends Component {
    init() { }
    clear() { }
    handle_inputs() { }
    get input(): Game_Input { return null; }
}