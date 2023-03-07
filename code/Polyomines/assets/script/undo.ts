import { Vec3 } from "cc";
import { $, clone_all_slots, compare_all_slots, String_Builder } from "./Const";
import { Debug_Console } from "./Debug_Console";
import { Entity_Manager } from "./Entity_Manager";
import { clone_undoable_data, copy_undoable_data, Game_Entity, get_serialized_data, note_entity_is_invalid, note_entity_is_valid, Serializable_Entity_Data, Undoable_Entity_Data } from "./Game_Entity";

export class Undo_Handler {
    manager: Entity_Manager = null;
    pending_creations: Undo_Action[] = [];
    pending_destructions: Undo_Action[] = [];
    undo_records: Undo_Record[] = [];
    old_entity_state = new Map<string, Undoable_Entity_Data>();
    dirty: boolean = false;
    enabled: boolean = true;;
}

export class Undo_Record {
    // gameplay_time: number;
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
    entity_id: number;
    // type: Undo_Action_Type;
    serialized_data: string;
}

export function undo_mark_beginning(manager: Entity_Manager) {
    if ($.doing_undo == false) return;
    const undo = manager.undo_handler;

    clear_current_undo_frame(undo);
    undo.pending_creations = [];
    undo.pending_destructions = [];

    for (let e of manager.all_entities) {
        if (e.scheduled_for_destruction) continue;

        const clone = clone_undoable_data(e);
        undo.old_entity_state.set(`${e.id}`, clone);
    }
}

export function undo_end_frame(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (!undo.enabled) return;

    undo.dirty = false;
    const builder = scan_for_changed_entities(manager);
    if (!builder.size) return;
    undo.dirty = true;

    const record = new Undo_Record();
    record.checkpoint = $.take($.S_next_undo_record_is_checkpoint);

    // @todo Combine them together?
    if (undo.pending_creations.length != 0) {
        builder.append(Undo_Action_Type.CREATION);
        builder.append(undo.pending_creations.length);
        for (let action of undo.pending_creations) {
            builder.append(action.entity_id);
            builder.append(action.serialized_data);
        }
        undo.pending_creations = [];
    }

    if (undo.pending_destructions.length != 0) {
        builder.append(Undo_Action_Type.DESTRUCTION);
        builder.append(undo.pending_destructions.length);
        for (let action of undo.pending_destructions) {
            builder.append(action.entity_id);
            builder.append(action.serialized_data);
        }
        undo.pending_destructions = [];
    }

    record.transaction = builder.to_string(' ');
    undo.undo_records.push(record);
    // console.log(record);
}

export function really_do_one_undo(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (undo.undo_records.length == 0) return;

    const record = undo.undo_records.pop();
    really_do_one_undo_record(manager, record, false);
}

export function note_entity_creation(m: Entity_Manager, e: Game_Entity) {
    const undo = m.undo_handler;

    let action = new Undo_Action();
    action.entity_id = e.id;
    action.serialized_data = get_serialized_data(e);

    const clone = clone_undoable_data(e);
    undo.old_entity_state.set(`${e.id}`, clone);

    undo.pending_creations.push(action);
}

export function note_entity_destruction(m: Entity_Manager, e: Game_Entity) {
    const undo = m.undo_handler;

    let action = new Undo_Action();
    action.entity_id = e.id;
    action.serialized_data = get_serialized_data(e);

    undo.old_entity_state.delete(`${e.id}`);
    undo.pending_destructions.push(action);
}

// ==== private functions ==== 
function scan_for_changed_entities(manager: Entity_Manager): String_Builder {
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
        if (e_old == null) return;

        let slot_count = 0;
        let slot_count_cursor = 0;

        diff_entity(e_old, e.undoable);
        if (slot_count != 0) {
            builder.set(slot_count_cursor, slot_count);
            count += 1;

            copy_undoable_data(e.undoable, e_old)
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
    return builder;
}

function really_do_one_undo_record(manager: Entity_Manager, record: Undo_Record, is_redo: boolean) {
    function get_number(): number {
        return Number(remaining[idx++]);
    }

    function get_string(): string {
        return remaining[idx++];
    }

    function get_vec3(): Vec3 {
        return new Vec3(get_number(), get_number(), get_number());
    }

    function do_entity_changes(num_entities: number) {
        while (num_entities--) {
            function apply_diff(num_slots: number) {
                while (num_slots--) {
                    let member_idx = get_number();
                    let slot_old = get_number();
                    let slot_new = get_number();
                    cached_ued.memory[member_idx] = slot_old;
                }
            }

            function update_entity_edit_cover(e: Game_Entity) {
                if (e.is_valid) {
                    note_entity_is_valid(e);
                } else {
                    note_entity_is_invalid(e);
                }
            }
            //#SCOPE

            const entity_id = get_number();
            const num_slots = get_number();

            const e_dest = manager.find(entity_id);
            const cached_ued = undo.old_entity_state.get(`${entity_id}`);

            if (e_dest == null || cached_ued == null) continue; // @hack

            apply_diff(num_slots);

            copy_undoable_data(cached_ued, e_dest.undoable);

            update_entity_edit_cover(e_dest);
            manager.move_entity(e_dest, e_dest.position);
            manager.rotate_entity(e_dest, e_dest.rotation);
        }
    }

    function do_entity_creations(num_entities: number) {
        while (num_entities--) {
            const entity_id = get_number();
            const prefab = get_string();
            const position = get_vec3();
            const rotation = get_number();
            const info = new Serializable_Entity_Data(prefab, position, rotation);
            manager.load_entity(info, entity_id);
        }
    }

    function do_entity_destructions(num_entities: number) {
        while (num_entities--) {
            const entity_id = get_number();
            const prefab = get_string();   // Consume
            const position = get_vec3();   // Consume
            const rotation = get_number(); // Consume
            // const info = new Serializable_Entity_Data(prefab, position, rotation);
            manager.reclaim(manager.find(entity_id));
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
                Debug_Console.Info(`Undo: ${num_entities}`);
                do_entity_changes(num_entities);
            } break;

            case Undo_Action_Type.CREATION: {
                let num_entities = get_number();
                Debug_Console.Info(`Undo: ${num_entities}`);
                do_entity_destructions(num_entities);
            } break;

            case Undo_Action_Type.DESTRUCTION: {
                let num_entities = get_number();
                Debug_Console.Info(`Undo: ${num_entities}`);
                do_entity_creations(num_entities);
            } break;
        }
    }
}

function clear_current_undo_frame(undo: Undo_Handler) {
    undo.undo_records = [];
}