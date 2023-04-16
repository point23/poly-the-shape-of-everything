import { _decorator, Component, Node, Label } from 'cc';
import { Move_Transaction } from '../sokoban';
import { Transaction_Manager } from '../Transaction_Manager';
import { Navigator } from './Navigator';
const { ccclass, property } = _decorator;

@ccclass('Transaction_Panel')
export class Transaction_Panel extends Component {
    @property(Navigator) navigator: Navigator = null;
    @property(Node) singles_panel: Node = null;
    @property([Node]) single_logs: Node[] = [];

    transaction_idx: number = 0;
    num_committed: number = 0;

    show_logs() {
        this.singles_panel.active = true;
    }

    hide_logs() {
        this.singles_panel.active = false;
    }

    show_prev() {
        if (this.transaction_idx == 0) return;

        const transactions = Transaction_Manager.instance.commited_stack;
        const t = transactions.get(--this.transaction_idx);
        this.log(t);
    }

    show_next() {
        const transactions = Transaction_Manager.instance.commited_stack;
        if (this.transaction_idx == transactions.size() - 1) return;

        const t = Transaction_Manager.instance.commited_stack.get(++this.transaction_idx);
        this.log(t);
    }

    note_new_transaction() {
        const transactions = Transaction_Manager.instance.commited_stack;
        // Catch up new t_idx and num of t
        this.transaction_idx = transactions.size() - 1;
        this.num_committed = transactions.size();

        this.log(transactions.peek());
    }

    log(t: Move_Transaction) {
        if (this.singles_panel.active) {
            this.clear_logs();
            const idx = this.transaction_idx;
            this.navigator.label_current.string = `#${idx + 1}`; // @note Let's just start counting at 1...
            t.all_moves.forEach((it, it_idx) => {
                const label = this.single_logs[it_idx].getComponentInChildren(Label);
                label.string = it.debug_info();
                this.single_logs[it_idx].active = true;
            });
        } else {
            this.show_counter();
        }
    }

    show_counter() {
        const i = this.num_committed;
        this.navigator.label_current.string = `${i} committed`;
    }

    clear() {
        this.navigator.clear();
        this.num_committed = 0;
        this.transaction_idx = 0;
    }

    clear_logs() {
        this.single_logs.forEach(it => it.active = false);
    }

    reset_counter() {
        this.num_committed = 0;
        this.show_counter();
    }

    toggle() {
        if (this.singles_panel.active) {
            this.hide_logs();
            this.show_counter();
            // Reset tidx
            const transactions = Transaction_Manager.instance.commited_stack;
            this.transaction_idx = transactions.size() - 1;
        } else {
            this.show_logs();

            if (this.num_committed != 0)
                this.note_new_transaction();
        }
    }
}