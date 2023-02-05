import {_decorator} from 'cc';
import {Entity_Manager} from './Entity_Manager';
import {Game_Board} from './Game_Board';
import {Move_Info, Move_Type, Single_Move} from './Single_Move';
import {Transaction_Manager} from './Transaction_Manager';

enum Transaction_Control_Flags {
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
    switch (move.type) {
      case Move_Type.CONTROLLER: {
        if (!(this.control_flags &&
              Transaction_Control_Flags.CONTROLLER_MOVE)) {
          const future_pos = move.entity.logically_move_towards(move.direction);
          if (!Game_Board.instance.validate_pos(future_pos)) {
            return false;
          };

          const other = Entity_Manager.instance.locate_entity(future_pos);
          if (other != null) {
            let move_info = new Move_Info();
            move_info.move_type = Move_Type.PUSHED;
            move_info.direction = move.direction;
            const push_move = new Single_Move(other.entity_id, move_info);

            if (!this.try_add_new_move(push_move)) {
              return false;
            }
          }

          this.moves.push(move);
          this.control_flags |= Transaction_Control_Flags.CONTROLLER_MOVE;
        }

      } break;

      case Move_Type.PUSHED: {
        const future_pos = move.entity.logically_move_towards(move.direction);
        if (!Game_Board.instance.validate_pos(future_pos)) {
          return false
        };

        const other = Entity_Manager.instance.locate_entity(future_pos);
        if (other != null) {
          return false;
        }

        this.moves.push(move);
      } break;
    }

    return true;
  }

  get debug_info(): string {
    let res = '';
    res += 'Transaction#' + this.transaction_id.toString() + '\n';
    for (let move of this.moves) {
      res += '  - ' + move.debug_info + '\n';
    }
    return res;
  }
}
