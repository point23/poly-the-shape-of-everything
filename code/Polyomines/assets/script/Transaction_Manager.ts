import { _decorator, Component } from 'cc';
import { Contextual_Manager } from './Contextual_Manager';
import { Debug_Console } from './Debug_Console';
import { Entity_Manager } from './Entity_Manager';
import { Move_Transaction } from './Move_Transaction';
import { debug_print_quad_tree } from './Proximity_Grid';
import { Singleton_Manager } from './Singleton_Manager_Base';
import { Single_Move } from './Single_Move';
import { UI_Manager } from './UI_Manager';
import { undo_end_frame } from './undo';
const { ccclass, property } = _decorator;

export enum Transaction_Control_Flags {
    CONTROLLER_ROTATE = 1 << 0,
    CONTROLLER_MOVE = 1 << 1,
}

export class Transaction_Stack {
    private storage: Move_Transaction[] = [];

    constructor(private capacity: number = Infinity) { }

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

    clear() {
        this.storage = [];
    }
}

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

    entity_manager: Entity_Manager;
    duration: number = 1;
    control_flags = 0;

    commited_stack: Transaction_Stack = new Transaction_Stack();
    issued_stack: Transaction_Stack = new Transaction_Stack();
    undo_stack: Transaction_Stack = new Transaction_Stack();

    /* @todo A move that might be able to triger a series of moves */
    try_add_new_move(move: Single_Move) {
        const new_transaction = new Move_Transaction(this.entity_manager); // @hack
        if (move.try_add_itself(new_transaction)) {
            this.issued_stack.push(new_transaction);
            this.undo_stack.clear();
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
            UI_Manager.instance.show_winning();
            Contextual_Manager.instance.switch_mode();
            Contextual_Manager.instance.switch_mode(); // @hack
            return;
        }

        undo_end_frame(this.entity_manager);
        // console.log(this.entity_manager.undo_handler.old_entity_state);
        Debug_Console.Print_Transaction(packed.debug_info());
    }

    /* 
        async undo_async() {
            if (this.commited_stack.empty()) return;
    
            const transaction = this.commited_stack.pop();
            for (let move of transaction.moves) {
                move.undo_async();
            }
    
            this.undo_stack.push(transaction);
        }
    
        async redo_async() {
            if (this.undo_stack.empty()) return;
    
            const transaction = this.undo_stack.pop();
            for (let move of transaction.moves) {
                move.execute_async();
            }
    
            this.commited_stack.push(transaction);
        }
    
     */
}