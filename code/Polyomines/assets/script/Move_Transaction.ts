import { _decorator } from 'cc';
import { String_Builder } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Single_Move } from './Single_Move';
import { Transaction_Manager } from './Transaction_Manager';

export class Move_Transaction {
    static serial_idx = 1;
    static get next_id(): number { return Move_Transaction.serial_idx++ };

    id: number;

    duration: number;
    moves: Single_Move[];
    entity_manager: Entity_Manager

    issue_time: Date;
    commit_time: Date;

    public constructor(entity_manager: Entity_Manager) {
        this.issue_time = new Date(Date.now());
        this.id = Move_Transaction.next_id;
        this.duration = Transaction_Manager.instance.duration;
        this.moves = [];
        this.entity_manager = entity_manager;
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('Transaction#').append(this.id);
        builder.append(' commited at ').append(this.commit_time.toISOString());
        builder.append('\n');
        for (let move of this.moves) {
            builder.append('\t- ').append(move.debug_info()).append('\n');
        }
        return builder.to_string();
    }
}
