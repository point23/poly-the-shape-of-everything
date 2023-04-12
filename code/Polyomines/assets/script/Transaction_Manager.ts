import { Component, math, _decorator } from 'cc';
import { $$, Const, Stack } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { debug_print_quad_tree } from './Proximity_Grid';
import { Move_Flags, Move_Transaction, Move_Type, Single_Move, detect_conflicts, is_dirty } from './sokoban';
import { undo_end_frame } from './undo';
const { ccclass, property } = _decorator;

export enum Transaction_Control_Flags {
    CONTROLLER_ROTATE = 1 << 0,
    CONTROLLER_MOVE = 1 << 1,
}

@ccclass('Transaction_Manager')
export class Transaction_Manager extends Component {
    public static instance: Transaction_Manager = null;
    public static Settle(instance: Transaction_Manager) {
        Transaction_Manager.instance = instance;
    }

    get entity_manager(): Entity_Manager {
        return Entity_Manager.current;
    }

    speed_up() {
        const old_i = $$.DURATION_IDX;
        const new_i = math.clamp(old_i - 1, 0, Const.Max_Duration_Idx);
        $$.DURATION_IDX = new_i;

        if ($$.FOR_EDITING)
            Level_Editor.instance.durations.label_current.string = Const.Duration[new_i];
    }

    slow_down() {
        const old_i = $$.DURATION_IDX;
        const new_i = math.clamp(old_i + 1, 0, Const.Max_Duration_Idx);
        $$.DURATION_IDX = new_i;

        if ($$.FOR_EDITING)
            Level_Editor.instance.durations.label_current.string = Const.Duration[new_i];
    }

    control_flags = 0;

    commited_stack: Stack<Move_Transaction> = new Stack<Move_Transaction>();
    issued_stack: Stack<Move_Transaction> = new Stack<Move_Transaction>();

    clear() {
        this.commited_stack.clear();
        this.issued_stack.clear();
    }

    // @note A move that might be able to triger a series of moves
    try_add_new_move(move: Single_Move): boolean {
        const new_transaction = new Move_Transaction(this.entity_manager); // @hack
        if (move.try_add_itself(new_transaction)) {
            this.issued_stack.push(new_transaction);
            return true;
        }
        return false;
    }

    execute() {
        if (this.issued_stack.empty()) return;

        const packed = new Move_Transaction(this.entity_manager);

        const issued: Move_Transaction[] = [];
        while (this.issued_stack.size()) {
            const t = this.issued_stack.pop();
            issued.push(t);
        }

        issued.sort((a, b) => b.piority - a.piority);
        if (issued.length >= 2) console.log(issued); // @note Debug stuff

        for (let transaction of issued) {
            function is_sanity(): boolean {
                for (const move of transaction.moves) {
                    if (!detect_conflicts(transaction, move)) return false;;
                }
                return true;
            }
            //#SCOPE

            if (!is_sanity()) {
                // Reject Current Transaction
                console.log("Something Went Wrong!!!")
                continue;
            }

            // @note Pusher and Supporter should be executed first
            transaction.moves.sort((a, b) => b.piority - a.piority);

            for (const move of transaction.moves) {
                if (move.info.move_type == Move_Type.CONTROLLER_PROC
                    && is_dirty(move, Move_Flags.MOVED)) { // @hack
                    $$.HERO_VISUALLY_MOVING = true;
                }

                move.execute(transaction);
                packed.moves.push(move);
            }
        }

        packed.commit_time = new Date(Date.now());
        this.commited_stack.push(packed);
        this.control_flags = 0;

        undo_end_frame(this.entity_manager);

        if ($$.FOR_EDITING) {
            debug_print_quad_tree(this.entity_manager.proximity_grid.quad_tree);
            Level_Editor.instance.transaction_panel.note_new_transaction();
        }
    }
}