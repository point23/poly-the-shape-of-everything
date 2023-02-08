import {_decorator, CCClass, CCString, Component, EventKeyboard, EventMouse, EventTouch, Node} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('Game_Mode')
export class Game_Mode extends Component {
  on_enter() {
    throw new Error('not implemented');
  }

  on_exit() {
    throw new Error('not implemented');
  }

  handle_key_down(event: EventKeyboard) {}
  handle_key_up(event: EventKeyboard) {}
  handle_mouse_down(event: EventMouse) {}
  handle_mouse_move(event: EventMouse) {}
  handle_mouse_scroll(event: EventMouse) {}
  handle_touch_start(event: EventTouch) {}
  handle_touch_move(event: EventTouch) {}
  handle_touch_end(event: EventTouch) {}
}