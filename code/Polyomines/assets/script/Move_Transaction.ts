import {_decorator} from 'cc';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Move_Info, Single_Move} from './Single_Move';
import {Transaction_Manager} from './Transaction_Manager';

export enum Transaction_Control_Flags {
  CONTROLLER_ROTATE = 1 << 0,
  CONTROLLER_MOVE = 1 << 1,
}

export class Move_Transaction {
  static transaction_id_seq = 0;

  transaction_id: number;
  issue_time: Date;
  commit_time: Date;
  duration: number;
  elapsed: number;
  moves: Single_Move[];

  control_flags = 0;

  public constructor() {
    this.transaction_id = Move_Transaction.transaction_id_seq++;
    this.duration = Transaction_Manager.instance.duration;
    this.moves = [];
  }

  try_add_new_move(move: Single_Move): boolean {
    return move.try_add_it_self(this);
  }

  debug_info(): string {
    let res = '';
    res += 'Transaction#' + this.transaction_id.toString() + '\n';
    for (let move of this.moves) {
      res += '  - ' + move.debug_info() + '\n';
    }
    return res;
  }
}
