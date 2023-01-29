import {_decorator, CCClass, Component, EventKeyboard, EventMouse, Node} from 'cc';
const {ccclass, property} = _decorator;

@ccclass('Game_Mode')
export class Game_Mode extends Component {
  get next(): Game_Mode {
    throw new Error('not implemented');
  }

  on_enter() {
    throw new Error('not implemented');
  }
  on_exit() {
    throw new Error('not implemented');
  }
  handle_key_down(event: EventKeyboard) {
    throw new Error('not implemented');
  }
  handle_mouse_scroll(event: EventMouse) {
    throw new Error('not implemented');
  }
}