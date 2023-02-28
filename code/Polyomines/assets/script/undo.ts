import { Game } from "cc";
import { $, clone_all_slots, compare_all_slots, Pid, String_Builder } from "./Const";
import { clone_ued } from "./entity";
import { Entity_Manager } from "./Entity_Manager";
import { Game_Entity, Undoable_Entity_Data } from "./Game_Entity";

export class Undo_Handler {
    manager: Entity_Manager = null;
    pending_actions: Undo_Action[] = [];
    undo_records: Undo_Record[] = [];
    old_entity_state = new Map<Pid, Undoable_Entity_Data>();
    dirty: boolean = false;
    enabled: boolean = true;;
}

export class Undo_Record {
    // gameplay_time: number;
    actions: Undo_Action[] = [];
    transaction: string = "";
    checkpoint: boolean = false;;
}

enum Undo_Action_Type {
    CHANGE,
    CREATION,
    DESTRUCTION,
    OCEAN_CHANGE,
}

export class Undo_Action {
    entity_id: Pid;
    type: Undo_Action_Type;
}

export function undo_mark_beginning(manager: Entity_Manager) {
    if ($.doing_undo == false) return;
    const undo = manager.undo_handler;

    undo.pending_actions = [];

    for (let e of manager.all_entities) {
        if (e.scheduled_for_destruction) continue;

        const clone = clone_ued(e);
        undo.old_entity_state.set(e.id, clone);
    }
}

export function undo_end_frame(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (!undo.enabled) return;

    undo.dirty = false;
    scan_for_changed_entities(manager);
    // if (undo.pending_actions.length == 0) return;

    // undo.dirty = true;

    // @todo Handle creation and destruction...

    // const record = new Undo_Record();
    // record.checkpoint = $.take($.S_next_undo_record_is_checkpoint);

    // record.actions = undo.pending_actions;
    // undo.undo_records.push(record);
    // clear_current_undo_frame(undo);
}

function scan_for_changed_entities(manager: Entity_Manager) {
    function scan_one_entity(e: Game_Entity) {
        type ued = Undoable_Entity_Data;
        function increment_pack_count() {
            if (slot_count == 0) {
                builder.append(e.id);
                slot_count_cursor = builder.get_cursor();
                builder.append(0); // Placeholder
            }
            slot_count += 1;
        }

        function diff_entity(e_old: ued, e_new: ued) {
            function compare_item(item: string | symbol) {
                const slot_old = Reflect.get(e_old, item);
                const slot_new = Reflect.get(e_new, item);
                let differing: boolean = false;
                if (slot_old instanceof Object) {
                    differing = !compare_all_slots(slot_old, slot_new);
                } else {
                    differing = slot_old != slot_new; scan_for_changed_entities
                }

                if (differing) {
                    increment_pack_count();
                    builder.append(item);
                }
            }
            //#SCOPE

            for (let it of Reflect.ownKeys(e_old)) {
                compare_item(it);
            }
        }
        //#SCOPE

        if (e.scheduled_for_destruction) return;

        const e_old = undo.old_entity_state.get(e.id);
        let slot_count = 0;
        let slot_count_cursor = 0;

        diff_entity(e_old, e.undoable);
        if (slot_count != 0) {
            builder.set(slot_count_cursor, slot_count);
            count += 1;

            const clone = clone_ued(e);
            undo.old_entity_state.set(e.id, clone);
        }
    }
    //#SCOPE

    let count: number = 0;
    const undo = manager.undo_handler;
    const builder = new String_Builder();
    builder.append(0); // Placeholder
    for (let e of manager.all_entities) {
        scan_one_entity(e);
    }
    builder.set(0, count);

    const str = builder.to_string();
    const encoder = new TextEncoder();
    console.log(count);
    console.log(encoder.encode(str));
}

function clear_current_undo_frame(undo: Undo_Handler) {
}