import {_decorator, Color, Component, Enum, MeshRenderer, Node, profiler, Quat, renderer, Vec2, Vec3} from 'cc';
import {Debug_Console} from './Debug_Console';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Move_Transaction} from './Move_Transaction';
import {Move_Type, Single_Move} from './Single_Move';
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

  async process_async() {
    if (this.current_transaction.moves.length == 0) return;

    for (let move of this.current_transaction.moves) {
      switch (move.type) {
        case Move_Type.CONTROLLER: {
          const entity = move.entity;
          if (entity.direction == move.direction) {
            await entity.move_towards_async(move.direction);
          } else {
            await entity.face_towards_async(move.direction);
            await entity.move_towards_async(move.direction);
          }
        } break;

        case Move_Type.PUSHED: {
          const entity = move.entity;
          await entity.move_towards_async(move.direction);
        } break;
      }
    }

    Debug_Console.Info(this.current_transaction.debug_info);
    this.new_transaction();
  }
}