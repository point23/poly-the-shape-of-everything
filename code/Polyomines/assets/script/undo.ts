import { $, clone_all_slots, compare_all_slots, Pid, String_Builder } from "./Const";
import { clone_ued, copy_ued } from "./entity";
import { Entity_Manager } from "./Entity_Manager";
import { Game_Entity, Undoable_Entity_Data } from "./Game_Entity";

export class Undo_Handler {
    manager: Entity_Manager = null;
    // pending_actions: Undo_Action[] = [];
    undo_records: Undo_Record[] = [];
    old_entity_state = new Map<string, Undoable_Entity_Data>();
    dirty: boolean = false;
    enabled: boolean = true;;
}

export class Undo_Record {
    // gameplay_time: number;
    // actions: Undo_Action[] = [];
    transaction: string = "";
    checkpoint: boolean = false;;
}

enum Undo_Action_Type {
    CHANGE,
    CREATION,
    DESTRUCTION,
    OCEAN_CHANGE,
}

// export class Undo_Action {
//     entity_id: Pid;
//     type: Undo_Action_Type;
// }

export function undo_mark_beginning(manager: Entity_Manager) {
    if ($.doing_undo == false) return;
    const undo = manager.undo_handler;

    // undo.pending_actions = [];

    for (let e of manager.all_entities) {
        if (e.scheduled_for_destruction) continue;

        const clone = clone_ued(e);
        undo.old_entity_state.set(`${e.id}`, clone);
    }
}

export function undo_end_frame(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (!undo.enabled) return;

    undo.dirty = false;
    const transaction = scan_for_changed_entities(manager);
    if (transaction.length == 0) return;
    undo.dirty = true;

    const record = new Undo_Record();
    record.checkpoint = $.take($.S_next_undo_record_is_checkpoint);

    record.transaction = transaction;
    undo.undo_records.push(record);

    console.log(undo.undo_records);
    // clear_current_undo_frame(undo);
}

export function really_do_one_undo(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (undo.undo_records.length == 0) return;

    const record = undo.undo_records.pop();
    really_do_one_undo_record(manager, record, false);
}

// ==== private functions ==== 
function scan_for_changed_entities(manager: Entity_Manager): string {
    function scan_one_entity(e: Game_Entity) {
        // @todo Handle if e_old or e_new doesn't exist
        type ued = Undoable_Entity_Data;
        function increment_pack_count() {
            if (slot_count == 0) {
                builder.append(e.id.digit_0);
                builder.append(e.id.digit_1);
                slot_count_cursor = builder.get_cursor();
                builder.append(0); // Placeholder
            }
            slot_count += 1;
        }

        function diff_entity(e_old: ued, e_new: ued) {
            function compare_item(it_idx: number) {
                const slot_old = e_old.memory[it_idx];
                const slot_new = e_new.memory[it_idx];
                const differing: boolean = slot_old != slot_new;
                if (differing) {
                    increment_pack_count();

                    builder.append(it_idx);
                    builder.append(slot_old);
                    builder.append(slot_new);
                }
            }
            //#SCOPE

            for (let i = 0; i < e_old.memory.length; i++) {
                compare_item(i);
            }
        }
        //#SCOPE

        if (e.scheduled_for_destruction) return;

        const e_old = undo.old_entity_state.get(`${e.id}`);

        let slot_count = 0;
        let slot_count_cursor = 0;

        diff_entity(e_old, e.undoable);
        if (slot_count != 0) {
            builder.set(slot_count_cursor, slot_count);
            count += 1;

            copy_ued(e.undoable, e_old)
        }
    }
    //#SCOPE

    let count: number = 0;
    const undo = manager.undo_handler;
    const builder = new String_Builder();
    builder.append(0); // Placeholder
    builder.append(0); // Placeholder
    for (let e of manager.all_entities) { scan_one_entity(e); }
    builder.set(0, Undo_Action_Type.CHANGE);
    builder.set(1, count);
    return builder.to_string(' ');
}

function really_do_one_undo_record(manager: Entity_Manager, record: Undo_Record, is_redo: boolean) {
    function get_number(): number {
        return Number(remaining[idx++]);
    }

    function get_pid(): Pid {
        let digit_0 = get_number();
        let digit_1 = get_number();

        return Pid.clone(digit_0, digit_1);
    }

    function do_entity_changes(num_entities: number) {
        while (num_entities--) {
            function apply_diff(num_slots: number) {
                while (num_slots--) {
                    let member_idx = get_number();
                    let slot_old = get_number();
                    let slot_new = get_number();
                    console.log(`i: ${member_idx}, o: ${slot_old}, n ${slot_new}`);
                    cached_ued.memory[member_idx] = slot_old;
                }
            }
            //#SCOPE

            const entity_id = get_pid();
            const num_slots = get_number();

            const e_dest = manager.find(entity_id);
            const cached_ued = undo.old_entity_state.get(`${entity_id}`);

            apply_diff(num_slots);

            console.log(e_dest.undoable);
            console.log(cached_ued);
            copy_ued(cached_ued, e_dest.undoable);
            console.log(e_dest.undoable);

            manager.move_entity(e_dest, e_dest.position);
            manager.rotate_entity(e_dest, e_dest.rotation);
        }
    }
    //#SCOPE

    const undo = manager.undo_handler;
    const remaining = record.transaction.split(' ');
    let idx = 0;
    while (idx < remaining.length) {
        let action = get_number();

        switch (action) {
            case Undo_Action_Type.CHANGE: {
                let num_entities = get_number();
                do_entity_changes(num_entities);
            } break;
        }
    }
}

function clear_current_undo_frame(undo: Undo_Handler) {
}