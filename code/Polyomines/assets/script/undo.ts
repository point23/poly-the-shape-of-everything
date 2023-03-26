import { $, Stack, String_Builder } from "./Const";
import { Entity_Manager } from "./Entity_Manager";
import {
    clone_undoable_data,
    copy_undoable_data,
    Game_Entity,
    note_entity_is_invalid,
    note_entity_is_valid,
    Serializable_Entity_Data,
    Undoable_Entity_Data
} from "./Game_Entity";
import { Level_Editor } from "./Level_Editor";
import { debug_print_quad_tree } from "./Proximity_Grid";

export class Undo_Handler {
    manager: Entity_Manager = null;
    pending_creations: CD_Action[] = [];
    pending_destructions: CD_Action[] = [];
    undo_records: Stack<Undo_Record> = new Stack<Undo_Record>;
    redo_records: Stack<Undo_Record> = new Stack<Undo_Record>;

    old_entity_state = new Map<number, Undoable_Entity_Data>();
    dirty: boolean = false;
    enabled: boolean = true;;
}

export class Undo_Record {
    // gameplay_time: number;
    // checkpoint: boolean = false;
    transaction: string = '';
}

export enum Undo_Action_Type {
    CHANGE,
    CREATION,
    DESTRUCTION,
    OCEAN_CHANGE,
}

export class CD_Action {
    // type: Undo_Action_Type;
    entity_id: number = 0;
    serialized_data: string = '';
}

// ==== public functions ==== 
export function undo_mark_beginning(manager: Entity_Manager) {
    if ($.doing_undo == false) return;
    const undo = manager.undo_handler;

    clear_current_undo_frame(undo);
    undo.pending_creations = [];
    undo.pending_destructions = [];

    for (let e of manager.all_entities) {
        if (e.scheduled_for_destruction) continue;

        const clone = clone_undoable_data(e);
        undo.old_entity_state.set(e.id, clone);
    }
}

// function record_creations_or_destructions(record: Undo_Record, builder: String_Builder) {

// }

export function undo_end_frame(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (!undo.enabled) return;

    undo.dirty = false;
    const builder = scan_for_changed_entities(manager);

    // Reset redo stack
    undo.redo_records.clear();

    const record = new Undo_Record();
    // record.checkpoint = $.take($.S_next_undo_record_is_checkpoint);

    // Count changes
    let num_changes = Number(builder.get(1));
    if (num_changes == 0) builder.clear(); // Apprantly we don't want the useless '0 0' prefix... 

    num_changes += undo.pending_creations.length;
    num_changes += undo.pending_destructions.length;
    if (num_changes == 0)
        return;

    undo.dirty = true;

    if (undo.pending_creations.length != 0) {
        builder.append(Undo_Action_Type.CREATION);
        builder.append(undo.pending_creations.length);
        for (let action of undo.pending_creations) {
            builder.append(action.serialized_data);
        }
        undo.pending_creations = [];
    }

    if (undo.pending_destructions.length != 0) {
        builder.append(Undo_Action_Type.DESTRUCTION);
        builder.append(undo.pending_destructions.length);
        for (let action of undo.pending_destructions) {
            builder.append(action.serialized_data);
        }
        undo.pending_destructions = [];
    }

    if (manager.for_editing)
        Level_Editor.instance.show_undo_changes(num_changes);

    record.transaction = builder.to_string(' '); // @hack
    undo.undo_records.push(record);
}

export function do_one_undo(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (undo.undo_records.empty()) return;

    const record = undo.undo_records.pop();
    really_do_one_undo(manager, record, false);
    undo.redo_records.push(record);

    debug_print_quad_tree(manager.proximity_grid.quad_tree);
}

export function do_one_redo(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (undo.redo_records.empty()) return;

    const record = undo.redo_records.pop();
    really_do_one_undo(manager, record, true);
    undo.undo_records.push(record);

    debug_print_quad_tree(manager.proximity_grid.quad_tree);
}

export function note_entity_creation(m: Entity_Manager, e: Game_Entity) {
    const undo = m.undo_handler;

    let action = new CD_Action();
    action.serialized_data = get_cd_data(e);

    undo.pending_creations.push(action);
}

export function note_entity_destruction(m: Entity_Manager, e: Game_Entity) {
    const undo = m.undo_handler;

    let action = new CD_Action();
    action.serialized_data = get_cd_data(e);

    undo.pending_destructions.push(action);
}

// ==== private functions ==== 
function get_cd_data(e: Game_Entity): string {
    // @todo Maybe create a Pack_Info object, so that we can increment pack 
    // count by ref, so that we can extract this function...
    type ued = Undoable_Entity_Data;
    function increment_pack_count() {
        if (slot_count == 0) {
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

    const builder = new String_Builder();
    builder.append(e.id);
    builder.append(e.prefab);

    let slot_count = 0;
    let slot_count_cursor = 0;
    diff_entity(e.undoable, Undoable_Entity_Data.default);
    if (slot_count != 0) {
        builder.set(slot_count_cursor, slot_count);
    }

    return builder.to_string(' ');
}

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

        const e_old = undo.old_entity_state.get(e.id);
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

function really_do_one_undo(manager: Entity_Manager, record: Undo_Record, is_redo: boolean) {
    function take_number(): number {
        return Number(remaining[idx++]);
    }

    function take_string(): string {
        return remaining[idx++];
    }

    function apply_diff(num_slots: number, consume: boolean, cached_ued: Undoable_Entity_Data) {
        while (num_slots--) {
            let member_idx = take_number();
            let slot_old = take_number();
            let slot_new = take_number();
            if (!consume) {
                if (is_redo) {
                    cached_ued.memory[member_idx] = slot_new;
                } else {
                    cached_ued.memory[member_idx] = slot_old;
                }
            }

        }
    }

    function update_entity_edit_cover(e: Game_Entity) {
        if (e.is_valid) {
            note_entity_is_valid(e);
        } else {
            note_entity_is_invalid(e);
        }
    }

    function do_entity_changes(num_entities: number) {
        while (num_entities--) {
            const entity_id = take_number();
            const num_slots = take_number();

            const e_dest = manager.find(entity_id);
            const cached_ued = undo.old_entity_state.get(entity_id);

            const related_to_cd_action: boolean = !e_dest || !cached_ued; // @hack
            apply_diff(num_slots, related_to_cd_action, cached_ued);
            if (related_to_cd_action) return;

            manager.proximity_grid.remove_entity(e_dest);
            copy_undoable_data(cached_ued, e_dest.undoable);

            update_entity_edit_cover(e_dest);

            manager.rotate_entity(e_dest, e_dest.rotation);
            manager.move_entity(e_dest, e_dest.position);
        }
    }

    function do_entity_creations_or_destructions(num_entities: number, is_creation: boolean) {
        while (num_entities--) {
            const entity_id = take_number();
            const prefab = take_string();
            const num_slots = take_number();

            if (is_creation) {
                const info = new Serializable_Entity_Data(prefab);
                manager.load_entity(info, entity_id);

                { // @todo Clean it up..., here's a lot of duplicates...
                    const e_dest = manager.find(entity_id);
                    const ued = manager.undo_handler.old_entity_state.get(entity_id);
                    apply_diff(num_slots, false, ued);
                    manager.proximity_grid.remove_entity(e_dest);
                    copy_undoable_data(ued, e_dest.undoable);

                    update_entity_edit_cover(e_dest);

                    manager.rotate_entity(e_dest, e_dest.rotation);
                    manager.move_entity(e_dest, e_dest.position);
                }
            } else {
                apply_diff(num_slots, true, null);
                manager.reclaim(manager.find(entity_id));
            }
        }
    }
    //#SCOPE

    const undo = manager.undo_handler;
    const remaining = record.transaction.split(' ');
    let idx = 0;

    // Count changes
    let num_changes = 0;

    while (idx < remaining.length) {
        let action = take_number();

        switch (action) {
            case Undo_Action_Type.CHANGE: {
                let num_entities = take_number();
                num_changes += num_entities;

                do_entity_changes(num_entities);
            } break;

            case Undo_Action_Type.CREATION: {
                let num_entities = take_number();
                num_changes += num_entities;

                do_entity_creations_or_destructions(num_entities, is_redo);
            } break;

            case Undo_Action_Type.DESTRUCTION: {
                let num_entities = take_number();
                num_changes += num_entities;

                do_entity_creations_or_destructions(num_entities, !is_redo);
            } break;
        }
    }

    if (manager.for_editing)
        Level_Editor.instance.show_undo_changes(num_changes);
}

function clear_current_undo_frame(undo: Undo_Handler) {
    undo.undo_records.clear();
    undo.redo_records.clear();
}