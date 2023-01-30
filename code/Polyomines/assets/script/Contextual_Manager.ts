import {_decorator, Component, EventKeyboard, EventMouse, EventTouch, input, Input, KeyCode, Node} from 'cc';

import {Game_Mode} from './modes/Game_Mode_Base';

const {ccclass, property} = _decorator;

/**
 * Implementation of State Pattern
 *  - Contextual_Manager as Context who holds states
 *  - Game_Modes as State who support handlers
 *
 * Problem:
 * - When a new input_event needs to be handled, both Submode and Context are
 * increasing?
 */
@ccclass('Contextual_Manager')
export class Contextual_Manager extends Component {
  public static instance: Contextual_Manager = null;
  public static Settle(instance: Contextual_Manager) {
    Contextual_Manager.instance = instance;
  }

  @property(Game_Mode) default_mode: Game_Mode = null;
  @property(Game_Mode) current_mode: Game_Mode = null;

  static get Default_Mode(): Game_Mode {
    return Contextual_Manager.instance.default_mode;
  }

  public static Enable() {
    Contextual_Manager.instance.register_events();
    const default_mode = Contextual_Manager.Default_Mode;
    Contextual_Manager.instance.switch_mode(default_mode);
  }

  public static Dispose() {
    Contextual_Manager.instance.unregister_events();
    Contextual_Manager.instance.switch_mode(null);
  }

  register_events() {
    input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
    input.on(Input.EventType.MOUSE_DOWN, this.on_mouse_down, this);
    input.on(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
    input.on(Input.EventType.TOUCH_START, this.on_touch_start, this);
    input.on(Input.EventType.TOUCH_MOVE, this.on_touch_move, this);
    input.on(Input.EventType.TOUCH_END, this.on_touch_end, this);
  }

  unregister_events() {
    input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
    input.off(Input.EventType.MOUSE_DOWN, this.on_mouse_down, this);
    input.off(Input.EventType.MOUSE_WHEEL, this.on_mouse_scroll, this);
    input.off(Input.EventType.TOUCH_START, this.on_touch_start, this);
    input.off(Input.EventType.TOUCH_MOVE, this.on_touch_move, this);
    input.off(Input.EventType.TOUCH_END, this.on_touch_end, this);
  }

  switch_mode(to?: Game_Mode|null) {
    let from = this.current_mode;
    from?.on_exit();
    this.current_mode = to;
    to?.on_enter();
  }

  on_key_down(event: EventKeyboard) {
    /* Handle Special Case: common interactions */
    const key_code = event.keyCode;
    switch (key_code) {
      case KeyCode.TAB:
        this.switch_mode(this.current_mode.next);
        break;
      default:
        this.current_mode.handle_key_down(event);
        break;
    }
  }

  on_mouse_down(event: EventMouse) {
    this.current_mode.handle_mouse_down(event);
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