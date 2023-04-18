import { Component, math, _decorator } from 'cc';
import { $$, Const, Stack, array_remove } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { debug_print_quad_tree } from './Proximity_Grid';
import { Move_Flags, Move_Transaction, Move_Type, Single_Move, detect_conflicts, is_dirty } from './sokoban';
import { undo_end_frame } from './undo';
import { Gameplay_Timer } from './Gameplay_Timer';
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
        const new_i = math.clamp(old_i - 1, 0, Const.MAX_DURATION_IDX);
        $$.DURATION_IDX = new_i;

        if ($$.FOR_EDITING)
            Level_Editor.instance.durations.label_current.string = Const.DURATION_NAMES[new_i];
    }

    slow_down() {
        const old_i = $$.DURATION_IDX;
        const new_i = math.clamp(old_i + 1, 0, Const.MAX_DURATION_IDX);
        $$.DURATION_IDX = new_i;

        if ($$.FOR_EDITING)
            Level_Editor.instance.durations.label_current.string = Const.DURATION_NAMES[new_i];
    }

    control_flags = 0;

    commited_stack: Stack<Move_Transaction> = new Stack<Move_Transaction>();

    issued_transactions: Move_Transaction[] = [];

    clear() {
        this.issued_transactions = [];
        this.commited_stack.clear();
    }

    new_transaction(move: Single_Move, duration: number = 1): boolean {
        const t = new Move_Transaction(this.entity_manager, duration);

        if (move.enact(t)) {
            this.issued_transactions.push(t);
            return true;
        }

        return false;
    }

    update_transactions() {
        if (this.issued_transactions.length == 0) return;

        const issued = this.issued_transactions;
        issued.sort((a, b) => b.piority - a.piority);

        const rejected = detect_conflicts(issued);
        for (let t of rejected) {
            array_remove(issued, t);
            // @ImplementMe Note rejected transactions...
        }

        for (let t of issued) {
            /*  // @Deprecated
             function is_sanity(): boolean {
                 for (const move of t.moves) {
                     if (!detect_conflicts(t, move)) return false;;
                 }
                 return true;
             }
             //#SCOPE
     
             if (!is_sanity()) {
                 // Reject Current Transaction
                 console.log("Something Went Wrong!!!")
                 continue;
             }
     
             // @Note Pusher and Supporter should be executed first
     
     
             for (const move of t.moves) {
                 if (move.info.move_type == Move_Type.CONTROLLER_PROC
                     && is_dirty(move, Move_Flags.MOVED)) { // @Hack
                     $$.HERO_VISUALLY_MOVING = true;
                 }
     
                 packed.moves.push(move);
             } 
            */

            t.update_single_moves();
            if (t.closed) {
                // undo_end_frame(this.entity_manager); // @Deprecated 
                array_remove(issued, t);
                this.commited_stack.push(t);
                if ($$.FOR_EDITING) {
                    debug_print_quad_tree(this.entity_manager.proximity_grid.quad_tree);
                    Level_Editor.instance.transaction_panel.note_new_transaction();
                }
            }
        }

        this.control_flags = 0;
    }
}