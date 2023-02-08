import {_decorator, EventKeyboard, KeyCode} from 'cc';

import {Const} from '../Const';
import {Debug_Console} from '../Debug_Console';
import {Entity_Manager} from '../Entity_Manager';
import {Direction} from '../Enums';
import {Controller_Proc_Move, Move_Info, Possess_Move} from '../Single_Move';
import {Transaction_Manager} from '../Transaction_Manager';

import {Game_Mode} from './Game_Mode_Base';

const {ccclass, property} = _decorator;

@ccclass('Test_Run_Mode')
export class Test_Run_Mode extends Game_Mode {
  ticks_per_loop = 1;
  is_shift_down: boolean = false;

  on_enter() {
    Debug_Console.Info('Test Run');

    this.ticks_per_loop =
        Const.Ticks_Per_Loop.get(Transaction_Manager.instance.duration);
    this.schedule(this.tick, Const.Tick_Interval);
  }

  on_exit() {}

  round: number = 0;
  tick() {
    if ((this.round % this.ticks_per_loop) == 0) {
      this.main_loop();
    }

    this.round = (this.round + 1) % 1024;
  }

  main_loop() {
    Transaction_Manager.instance.execute_async();
  }

  handle_key_down(event: EventKeyboard) {
    let key_code = event.keyCode;

    const current_character = Entity_Manager.instance.current_character;
    switch (key_code) {
      case KeyCode.KEY_W: {
        const step = this.is_shift_down ? 0 : 1;
        const target_dir = Direction.BACKWORD;
        const move =
            new Controller_Proc_Move(current_character, target_dir, step);
        Transaction_Manager.instance.try_add_new_move(move);
      } break;

      case KeyCode.KEY_S: {
        const step = this.is_shift_down ? 0 : 1;
        const target_dir = Direction.FORWARD;
        const move =
            new Controller_Proc_Move(current_character, target_dir, step);
        Transaction_Manager.instance.try_add_new_move(move);
      } break;

      case KeyCode.KEY_A: {
        const step = this.is_shift_down ? 0 : 1;
        const target_dir = Direction.LEFT;
        const move =
            new Controller_Proc_Move(current_character, target_dir, step);
        Transaction_Manager.instance.try_add_new_move(move);
      } break;

      case KeyCode.KEY_D: {
        const step = this.is_shift_down ? 0 : 1;
        const target_dir = Direction.RIGHT;
        const move =
            new Controller_Proc_Move(current_character, target_dir, step);
        Transaction_Manager.instance.try_add_new_move(move);
      } break;

      case KeyCode.ENTER: {
        const move = new Possess_Move(current_character);
        Transaction_Manager.instance.try_add_new_move(move);
      } break;

      case KeyCode.DASH: {
        Transaction_Manager.instance.undo_async();
      } break;

      case KeyCode.EQUAL: {
        Transaction_Manager.instance.redo_async();
      } break;

      case KeyCode.SHIFT_LEFT:
      case KeyCode.SHIFT_RIGHT:
        this.is_shift_down = true;
        break;
    }
  }

  handle_key_up(event: EventKeyboard) {
    let keycode: number = event.keyCode;
    switch (keycode) {
      case KeyCode.SHIFT_LEFT:
      case KeyCode.SHIFT_RIGHT:
        this.is_shift_down = false;
        break;
    }
  }
}
