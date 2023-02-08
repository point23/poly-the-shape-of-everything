import {_decorator} from 'cc';
import {Single_Move} from './Single_Move';
import {Transaction_Manager} from './Transaction_Manager';

export class Move_Transaction {
  static transaction_id_seq = 0;

  transaction_id: number;
  issue_time: Date;
  commit_time: Date;
  duration: number;
  moves: Single_Move[];

  public constructor() {
    this.issue_time = new Date(Date.now());
    this.transaction_id = Move_Transaction.transaction_id_seq++;
    this.duration = Transaction_Manager.instance.duration;
    this.moves = [];
  }

  debug_info(): string {
    let res = '';
    res += 'Transaction#' + this.transaction_id.toString();
    res += ' commited at ' + this.commit_time.toISOString() + '\n';
    for (let move of this.moves) {
      res += '  - ' + move.debug_info() + '\n';
    }
    return res;
  }
}
