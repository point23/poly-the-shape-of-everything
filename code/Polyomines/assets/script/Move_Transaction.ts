import {_decorator} from 'cc';
import {Single_Move} from './Single_Move';
import {Transaction_Manager} from './Transaction_Manager';

export class Move_Transaction {
  transaction_id: number;
  issue_time: Date;
  commit_time: Date;
  duration: number;
  elapsed: number;
  moves: Single_Move[];

  static transaction_id_seq = 0;

  public constructor() {
    this.transaction_id = Move_Transaction.transaction_id_seq++;
    this.duration = Transaction_Manager.instance.duration;
    this.moves = [];
  }
}
