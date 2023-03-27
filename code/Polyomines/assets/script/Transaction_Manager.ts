import { Component, math, _decorator } from 'cc';
import { Const, Stack } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { debug_print_quad_tree } from './Proximity_Grid';
import { Move_Transaction, Single_Move, sanity_check } from './sokoban';
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
        this.duration_idx = math.clamp(this.#duration_idx - 1, 0, Const.Max_Duration_Idx);
    }

    slow_down() {
        this.duration_idx = math.clamp(this.#duration_idx + 1, 0, Const.Max_Duration_Idx);
    }

    #duration_idx: number = 1;
    get duration_idx(): number {
        return this.#duration_idx;
    }

    set duration_idx(d: number) {
        this.#duration_idx = d;
        Level_Editor.instance.durations.label_current.string = Const.Duration[d];
    }

    control_flags = 0;

    commited_stack: Stack<Move_Transaction> = new Stack<Move_Transaction>();
    issued_stack: Stack<Move_Transaction> = new Stack<Move_Transaction>();

    clear() {
        this.commited_stack.clear();
        this.issued_stack.clear();
    }

    // @note A move that might be able to triger a series of moves
    try_add_new_move(move: Single_Move) {
        const new_transaction = new Move_Transaction(this.entity_manager); // @hack
        if (move.try_add_itself(new_transaction)) {
            this.issued_stack.push(new_transaction);
        }
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
                    if (!sanity_check(transaction, move)) return false;;
                }
                return true;
            }
            //#SCOPE

            if (!is_sanity()) {
                // Reject Current Transaction
                console.log("Something Went Wrong!!!")
                continue;
            }

            for (const move of transaction.moves) {
                move.execute(transaction);
                packed.moves.push(move);
            }
        }

        packed.commit_time = new Date(Date.now());
        this.commited_stack.push(packed);
        this.control_flags = 0;

        if (this.entity_manager.pending_win) {
            Level_Editor.instance.load_succeed_level();
            return;
        }

        undo_end_frame(this.entity_manager);
        debug_print_quad_tree(this.entity_manager.proximity_grid.quad_tree);
        Level_Editor.instance.transaction_panel.note_new_transaction();
    }
}