import { _decorator, Component } from 'cc';
import { Stack } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { Move_Transaction } from './Move_Transaction';
import { debug_print_quad_tree } from './Proximity_Grid';
import { Singleton_Manager } from './Singleton_Manager_Base';
import { Single_Move } from './Single_Move';
import { UI_Manager } from './UI_Manager';
import { do_one_redo, do_one_undo, undo_end_frame, Undo_Record } from './undo';
const { ccclass, property } = _decorator;

export enum Transaction_Control_Flags {
    CONTROLLER_ROTATE = 1 << 0,
    CONTROLLER_MOVE = 1 << 1,
}

type Transaction_Stack = Stack<Move_Transaction>;

/**
 * @note
 * - Manage transactions
 * - Detect conflicts between moves
 */
@ccclass('Transaction_Manager')
export class Transaction_Manager extends Singleton_Manager {
    public static instance: Transaction_Manager = null;
    public static Settle(instance: Transaction_Manager) {
        Transaction_Manager.instance = instance;
    }

    get entity_manager(): Entity_Manager {
        return Entity_Manager.current;
    }
    duration: number = 1;
    control_flags = 0;

    commited_stack: Transaction_Stack = new Stack<Move_Transaction>();
    issued_stack: Transaction_Stack = new Stack<Move_Transaction>();

    // @note A move that might be able to triger a series of moves
    try_add_new_move(move: Single_Move) {
        const new_transaction = new Move_Transaction(this.entity_manager); // @hack
        if (move.try_add_itself(new_transaction)) {
            this.issued_stack.push(new_transaction);
        }
    }

    async execute_async() {
        if (this.issued_stack.empty()) return;

        // @incomplete Detect conflicts
        const packed = new Move_Transaction(this.entity_manager); // @hack

        while (this.issued_stack.size()) {
            const transaction = this.issued_stack.pop();
            for (let move of transaction.moves) {
                await move.execute_async(transaction);

                packed.moves.push(move);
            }
        }

        packed.commit_time = new Date(Date.now());
        this.commited_stack.push(packed);
        this.control_flags = 0;

        debug_print_quad_tree(this.entity_manager.proximity_grid.quad_tree);

        if (this.entity_manager.pending_win) {
            // UI_Manager.instance.show_winning();
            Level_Editor.instance.load_succeed_level();
            return;
        }

        undo_end_frame(this.entity_manager);

        UI_Manager.instance.transaction_panel.note_new_transaction();
    }

    async undo_async() {
        do_one_undo(this.entity_manager);
    }

    async redo_async() {
        do_one_redo(this.entity_manager);
    }
}