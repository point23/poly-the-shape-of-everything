import { _decorator } from 'cc';
import { Entity_Manager } from './Entity_Manager';
import { Single_Move } from './Single_Move';
import { Transaction_Manager } from './Transaction_Manager';

export class Move_Transaction {
    static next_transaction_id = 0;

    transaction_id: number;

    duration: number;
    moves: Single_Move[];
    entity_manager: Entity_Manager

    issue_time: Date;
    commit_time: Date;

    public constructor(entity_manager: Entity_Manager) {
        this.issue_time = new Date(Date.now());
        this.transaction_id = Move_Transaction.next_transaction_id++;
        this.duration = Transaction_Manager.instance.duration;
        this.moves = [];
        this.entity_manager = entity_manager;
    }

    debug_info(): string {
        let res = '';
        res += 'Transaction#' + this.transaction_id.toString();
        res += ' commited at ' + this.commit_time.toISOString() + '\n';
        for (let move of this.moves) {
            res += '  - ' + move.debug_info() + '\n';
        }
        return res;
    }
}
