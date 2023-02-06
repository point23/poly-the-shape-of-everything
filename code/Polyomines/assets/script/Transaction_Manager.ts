import {_decorator, Component} from 'cc';
import {Debug_Console} from './Debug_Console';
import {Move_Transaction} from './Move_Transaction';
import {Single_Move} from './Single_Move';
const {ccclass, property} = _decorator;

export enum Transaction_Control_Flags {
  CONTROLLER_ROTATE = 1 << 0,
  CONTROLLER_MOVE = 1 << 1,
}

export class Transaction_Stack {
  private storage: Move_Transaction[] = [];

  constructor(private capacity: number = Infinity) {}

  empty(): boolean {
    return this.size() == 0;
  }

  size(): number {
    return this.storage.length;
  }

  push(transactiuon: Move_Transaction) {
    if (this.size() === this.capacity) {
      throw Error('Reached max capacity');
    }
    this.storage.push(transactiuon);
  }

  pop(): Move_Transaction {
    return this.storage.pop();
  }

  peek(): Move_Transaction {
    return this.storage[this.size() - 1];
  }
}

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
  }

  duration: number = 1;
  control_flags = 0;

  commited_stack: Transaction_Stack = new Transaction_Stack();
  issued_stack: Transaction_Stack = new Transaction_Stack();
  undo_stack: Transaction_Stack = new Transaction_Stack();

  /* TODO A move that might be able to triger a series of moves */
  try_add_new_move(move: Single_Move) {
    const new_transaction = new Move_Transaction();
    if (move.try_add_itself(new_transaction)) {
      this.issued_stack.push(new_transaction);
    }
  }

  async execute_async() {
    if (this.issued_stack.empty()) return;

    // TODO Detect conflicts

    const packed = new Move_Transaction();

    while (this.issued_stack.size()) {
      const transaction = this.issued_stack.pop();

      for (let move of transaction.moves) {
        move.execute_async();
        packed.moves.push(move);
      }
    }

    packed.commit_time = new Date(Date.now());
    this.commited_stack.push(packed);

    this.control_flags = 0;

    Debug_Console.Info(packed.debug_info());
  }

  undo_async() {
    if (this.commited_stack.empty) return;

    const transaction = this.commited_stack.pop();
    for (let move of transaction.moves) {
      move.undo_async();
    }

    this.undo_stack.push(transaction);
  }
}