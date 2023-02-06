import {_decorator, Component} from 'cc';
import {Debug_Console} from './Debug_Console';
import {Move_Transaction} from './Move_Transaction';
import {Single_Move} from './Single_Move';
const {ccclass, property} = _decorator;

/**
 * NOTE
 * - Manage transactions
 * - Detect conflicts between moves
 */
@ccclass('Transaction_Manager')
export class Transaction_Manager extends Component {
  public static instance: Transaction_Manager = null;
  public static Settle(instance: Transaction_Manager) {
    Transaction_Manager.instance = instance;

    Transaction_Manager.instance.new_transaction();
  }

  current_transaction_idx: number = -1;
  transactions: Move_Transaction[] = [];
  duration: number = 1;

  get current_transaction(): Move_Transaction {
    return this.transactions[this.current_transaction_idx];
  }

  try_add_new_move(move: Single_Move) {
    this.current_transaction.try_add_new_move(move);
  }

  new_transaction() {
    this.transactions[++this.current_transaction_idx] = new Move_Transaction();
  }

  async execute_async() {
    if (this.current_transaction.moves.length == 0) return;

    for (let move of this.current_transaction.moves) {
      move.execute_async();
    }

    Debug_Console.Info(this.current_transaction.debug_info());
    this.new_transaction();
  }
}