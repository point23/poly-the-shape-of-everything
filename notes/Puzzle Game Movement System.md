# Struts

#### Table

```typescript
class Table<Key_Type, Value_Type> {
    allocated: number;
    count: number;
    
    // allocator
    
    keys: Key_Type[];
    values: Value_Type[];
    hashes: number[];
}

// find, remove, add => find and replace
function table_find(table: Table,
                    key: table.Key_Type): table.Value_Type {
    if (!table.allocated) {
        const dummy: tabel.Value_Type;
        return dummy;
    }
    
    let hash = get_hash(key);
    if (hash == 0) hash += 1;
    
    let idx = hash % table.allocated;
    while (table.hashes[idx]) {
        if (table.hashes[idx] == hash) {
            if (table.keys[idx] == key) {
                return table.values[idx];
            }
        }
        idx += 1;
        if (idx >= table.allocated) idx = 0;
    }
    
    const dummy: tabel.Value_Type;
    return dummy;
}

function table_replace(table: Tale,
                       key: table.Key_Type,
                       replacement_item: table.Value_Type): boolean {
}
```

#### Metadata

```typescript
enum Manipulator {
    NONE,
    TRANSLATION,
    ROTATION,
    SCALE,
    RADIUS,
    PIVOT,
    CONE,
    LOCK,
    COUNT,
}


class Ui_Page {
    name: string;
    page_idx: number;
    
    items: Metadata_Item[];
    num_visible_items: number;
    
    // free_page_name: boolean;
}

class Metadata {
    info: Type_Info;
    entity_type: Type;
    
    leaf_items: Metadata_Item[];
    toplevel_items: Metadata_Item[];
    
    metadata_flags: number;
    
    ui_pages: Ui_Page[];
    current_ui_page_idx;
}

enum Metadata_Flags {
    METADATA_TYPE_IS_ONLY_FOR_EDITING,
    METADATA_MESH_SKINNED_ON_GPU,
    METADATA_USE_EDITOR_HANDLE,
    METADATA_CONTAINS_PROATABLE_ID,
    METADATA_TYPE_HAS_DRAGGABLE_FACES,
    METADATA_TYPE_DOES_NOT_UPDATE,
    METADATA_TYPE_DOES_NOT_NEED_MESH_FOR_RAYCAST,
    METADATA_TYPE_ALWAYS_SKIPS_GAME_DISPLAY,
    METADATA_TYPE_CAN_BE_PICKED_UP_BY_PLAYER,
    METADATA_TYPE_IS_ALWAYS_DETAIL,
    METADATA_TYPE_IS_ALWAYS_DYNAMIC,
    METADATA_TYPE_DO_NOT_CLUSTER,
}

class Metadata_Item {
    iofo: Type_Info;
    metadata: Meta_Data;
    byte_offset: number;
    flags: Flags;
    name: string;
    ui_name: string;
    description: string;
    // revision stuff
    ui_manipulator: Manipulator.None;
    page_idx: number;
    page_order: number;
    // imported_from_base_entity: boolean;
}

metadata_per_entity_type: Metadata[];
global_base_entity_metadata: Metadata
```





# Entity

#### Entity Structs

```typescript
class Entity_Manager {
	entity_array: Bucket_Array(Entity, 100);
	universe_name: string;
	
	manager_id: Manager_Id;
	
	next_serial_system: Pid;
	next_serial_gameplay: Pid;
	next_serial_for_current_user: Pid;
	
	proximity_grid: Proximity_Grid;
	
	all_entities: Entity[];
	potentially_visible_entities: Entity[];
	moving_entities: Entity[];
	
	camera: Camera;
	
	active_hero_index: number;
	
	undo_handler: Undo_Handler;
}

function find(manager: Entity_Manager, id: Pid): Entity {
    for (let bucket of manager.entity_array.buckets) {
        bucket.occupied.forEach((it, it_idx) => {
            if (!it) continue;
            
            let e = bucket.data[it_idx];
            if (e.entity_id == id) return e;
        });
    }
    return null;
}

function copy_entity_data(e: Entity, o: Entity) {
    assert(e.entity_type == o.entity_type);
    
    o.entity_flags = e.entity_flags;
    
    let m = get_metadata(e);
    
    for (let item of base_entity_metadatas.toplevel_items) {
        // Compare revision number?
        copy_slot(e, item, o, item);
    }
    
    
    for (let item of m.toplevel_items) {
        // Compare revision number?
        copy_slot(e, item, o, item);
    }
}

function copy_slot (e: Entity, item_e: Metadata_Item, o: Entity, item_o: Metadata_Item) {
    if (Reflection.is_pod(item_e.info)) {
        let source = metadata_slot(e, item_e);
        let dest = metadata_slot(o, item_o);
        
        memcpy(dest, source, item_e.info.runtime_size);
    } else if (item_e.info == type_info(string)) {
        // ...
    }
}

class Entity {
    undoable: Undoable_Entity_Data;
    old_undoable: Undoable_Entity_Data;
    // ...
}

class Undoable_Entity_Data {
    position: Vector3;
    scale: number;
    orientation: Direction;
    
    entity_flags: Entity_Flags;
    entity_name: string;
    
    group_id: Pid;
	supporting_id: Pid;
    supported_by_id: Pid;
    
    bounding_radius: number;
    bounding_center: Vector3;
    
    texture_map: Texture_Map;
    mesh: Mesh;
    materials: Materials[];
    
    failing: boolean;
    dead: boolean;
}
```

Life-circle

```typescript
function schedule_for_destruction (e: Entity) {
	/* implementMe */ undo_note_destroyed_entity(e);
    
    if (e.scheduled_for_destruction) {
        // Doubly-destructed?
    }
    
    e.scheduled_for_destruction = true;
    remove_from_grid(e.entity_manager.proximity_grid, e);
    array_add(e.entity_manager.entities_to_clean_up, e);
    unregister_entity(e.entity_manager, e);
}
```



# Grid

- Proximity Grid 



# Moves, Transactions, Conflicts 

参考资料：

- Jonathon Blow, "Discussion: Puzzle Game Movement Systems, with Sean Barrett.": https://www.youtube.com/watch?v=_tMb7OS2TOU&t=1879s

## 游戏更新的方案

- 实时
- 回合制
- 事件驱动: Async灾难，引发竞争条件（Race-Condition）

## 状态更新与动画渲染的先后关系

场景: 	*Lily Pad & the Guy*

<img src="Puzzle%20Game%20Movement%20System.assets/image-20230111152636121.png" alt="image-20230111152636121" style="zoom:67%;" />

目的：*Juicy the game feel*

1. 存在预先跳上和延迟跳上两种动画渲染。

2. 玩家按键跳转的时机往往不是Lily Pad恰好处于Gap的时机。

   - 抢跳：

     <img src="Puzzle%20Game%20Movement%20System.assets/image-20230111162208808.png" alt="image-20230111162208808" style="zoom:50%;" />

   - 晚跳：

     <img src="Puzzle%20Game%20Movement%20System.assets/image-20230111163429417.png" alt="image-20230111163429417" style="zoom:50%;" />

流程：以抢跳为例

![image-20230111173909003](Puzzle%20Game%20Movement%20System.assets/image-20230111173909003.png)

问题：如何正确渲染玩家穿过Gap的两种情形？

1. 有一个像素点离开时就发生Position更新，调整事件处理顺序
2. Item没有Position属性，只有Grid Unit/Square关于Item的引用.
   - 一个Item可以同时属于多个Square。
3. Item可以占据多个格子。

备注：

​	避免偶然事件

- 游戏世界基于引擎，但对于游戏玩法的计算，我们需要保证连续性，相同（或近似）输入下要有相同的结果，否则容易引起玩家的误解

#### Transaction Struct

```typescript
class Move_Transaction {
	transaction_id;
	entity_manager;
	issue_time;
	commit_time;
	duration = -8 to 8;
	elapsed;
	transaction_flags;
	moves;
}

enum Transaction_Flags {
	PHYSICALLY_MOVED;
	CLOSED;
	PRE_CLOSED;
	DONE;
	DRIVEN_BY_A_CONTROLLER;
	IS_LILY_TRANSACTION;
	CAUSED_CHANGE;
	IS_FALLING_TRANSACTION;
	PLAYER_INITIATED;
	REQUEST_CREATE_UNDO_POINT;
}
```

#### Move Struct

```typescript
class Move {
	move_id;
	entity_id;
	move_info;
	visual_start;
	visual_end;
	?? visual_error;
}

class Move_Info {
	move_type;
	duration = -8 to 8;
	[cached] delta;
	start_position;
	end_position;
	support_info;
	move_flags;
	reaction_direction; // Push or Pull
}

class Support_Info {
	supporter_id;
	supported;
	supporter;
}

enum Move_Type {
	NONE;
	CONTROLLER_PROC;
	TELEPORT;
	STATIONARY;
	PULLED;
	PUSHED;
	LINER_INTERPOLATION;
	SUPPORT;
	VISUAL_SUPPORT;、
	FOLLOWING;
}

enum Move_Flag {
	STRONG_PUSH;
	MOVED_BY_MIRROR;
	...
}
```

#### Process

```typescript
function detect_conflicts(manager: Entity_Manager,
                          transaction: Move_Trsaction) -> conflict {
	for (other of entity_manager.move_transactions) {
    	if (other == trsanction) continue;
    
    	for (single of transaction.single_moves) {
    		for other_move of other.single_moves {
            /*    check if conflicts:
                    occupy the same square?
                    manipulate the same entity?
            */
            }
        }
   }
}

function enact_next_buffered_move(manager: Entity_Manager, first_call = true) {
    // transition_mode == Transition.WAITING_FOR_VIC
    if (!manager.buffered_move.counts) {
        generate_buffered_moves_from_held_keys(manager);
        enact_next_buffered_move(manager, false);
        return;
    }
    
    move = manager.buffered_moves[0];
    
    if (arry_find(manager.falling_entites, move.id)) {
    	// New move won't be consumed as it is falling
    } 
    
    array_ordered_remove_by_idx(manager.buffered_moves, 0);
    
    if (move.action_type != Action_Type.UNDO) {
        let hero = get_active_hero(manager);
        if (hero) {
            let s = `undo at ${hero.pos.fixed(0)}`;
            let report = game_report(s); // FP???
            report.fade_in_time = 0.03;
            report.sustain_time = 0.15;
            report.fade_out_time = 0.07; 
        }
        
        undo_end_frame(manager);
    }
    
    enact_move(manager, move);
}

function enact_move(manager: Entity_Manager, move: Bufferd_Move) {
    // transition_mode == Transition.WAITING_FOR_VIC
   	
    if (currently_recording_test) 
        test_record_one_move(manager, move);
    
    if (move.action_type == Action_Type.UNDO) {
        do_one_undo(manager);
        // post_undo_reevaluate(manager);
        return;
    }
    
    transaction_id = manager.next_transaction_id;
    manager.waiting_on_player_trasaction = transaction_id;
    // force_dragon_move(manager);
    
    if (move.action_type == ACTIVATE) {
        activated = do_activate(manager, transaction_id);
        
        if (!activaed) {
            toggled = toggle_fridenly_dragon(manager, transaction_id);
            if (!toggled) {
                function scuttle_last_undo = (undo: Undo_Handler) => {
                    if (!undo.undo_records.count) return;
                    let record = pop(undo.undo_records); // @todo Free it
                };
                
                scuttle_last_undo(manaer.undo_handler);
            }
        }
        return;
    }
    
    if (move.action_type == MAGIC) {
        used = use_magic (manager, transaction_id);
        if (!used) {
            scuttle_last_undo(manaer.undo_handler);
        }
        return;
    }
    
    guy_id = move.id;
    delta = move.delta;
    // caused_changes = false;
    // some_not_dead = false;
    
    // clones_to_move = get_clones_of(manager, guy_id, can_be_dead:true);
}

function maybe_retire_next_transaction(manager: Entity_Manager): bool {
    let should_do_player_move = true;
    let id = manager.next_transaction_id_to_retire;
    if (id == manager.next_transaction_id_to_retire) {
        return should_do_player_move;
    }
    
    let retired = false;
    should_do_player_move = false;
    for (let id = manager.next_transaction_id_to_retire;
             id < manager.next_transaction_id_to_issue;
             id++) {
        let retired_this_id = true;
        for (let e of manager.moving_entities) {
            v = e.visual_inetrpolation;
            if (v.start_time < 0) {
                continue e; // some jai stuff
            }
            
            if (v.transaction_id == id) {
                retired_this_id = false;
                break;
            }
            
            assert(v.transaction_id != 0);
            assert(v.transaction_id >= manager.next_transaction_id_to_retire)
        }
        
        if (retired_this_id) {
            retired = true;
            
            if (id == next_transaction_id_to_retire)
                manager.next_transaction_id_to_retire + 1;
            if (id == manager.waiting_on_player_transaction) {
                manager.waiting_on_player_transaction = 0;
                should_do_player_move = true;
            }
        }
    }
    
    if (should_do_player_move) {
        if (should_record_undo(manager)) {
            undo_end_frame(manager);
        }
    }
}

should_record_undo(manager: Entity_Manager) {
    let hero = get_active_hero(manager);
    
    if (!hero) return false;
    if (array_find(manager.falling_entities, hero.entity_id)) return false;
    
    return true;
}
```



# Other Undo System

#### Transactions in Database

- Unit of work in DB language.

参考资料:

- Be a Better Dev, "What is a Database Transaction? Be ACID compliant", https://www.youtube.com/watch?v=wHUOeXbZCYA

例子：

| ID   | OP     |
| ---- | ------ |
| 1    | insert |
| 2    | update |

- Either succeed or fail together as a unit.
- Nothing can be partially succeed.

ACID

- Atomic
- Consistency
- Isolation
- Durability

#### Diff

参考资料:

- git-diff: https://git-scm.com/docs/git-diff

  <img src="Puzzle%20Game%20Movement%20System.assets/image-20230210000315047.png" alt="image-20230210000315047" style="zoom:33%;" />

  - when to use: https://luppeng.wordpress.com/2020/10/10/when-to-use-each-of-the-git-diff-algorithms/

- diff-wiki: https://en.wikipedia.org/wiki/Diff

- delta compression: https://ably.com/blog/practical-guide-to-diff-algorithms



# Puzzle Undo System

参考资料：

- Jonathon Blow, "Game Engine Programming Undo system rewrite", https://www.youtube.com/watch?v=PeF-9H6d7Lg&t=3796s

#### Problem

运行时游戏和关卡编辑器都需要Undo, 但两者涉及的数据大相径庭，例如运行时保存了：Failing, Dead等Flag，而编辑器保存了Material。

如果编辑器内得操作也是以Move为单位，Move会有太多的Sub-Class

大跨度的撤回：like C-R to reset a level

- 撤回到某个Major Change: like 推动Block

Undo的节点问题：
- 我们如果基于Command Pattern进行撤回，自动运行的节点变化（如：水流）也需要建立Move
- 而如果我们以Entity的方式进行撤回，则在每一次有角色Move的时候才进行Scan Entities的行为

- 在角色没有结束当前Move时就发生Undo

#### Global variables

```typescript
doing_undo: boolean = false;
next_undo_record_is_check_point: boolean = false;
```


#### Structs

```typescript
class Undo_Handler {
    entity_manager: Entity_Manager;
    
    pending_actions: Undo_Action[];
    undo_records: Undo_Record[];
    
    // @deprecated current_entity_state: Table(Pid, Entity);
    old_entity_table: Table(Pid, Entity);
    
    dirty: boolean;
    enabled: boolean;
} 

class Undo_Action {
    type: Undo_Action_Type;
    entity_id: Pid;
    // union {
    //     move,
    //	   change,
    //     ...
    // }
}

enum Undo_Action_Type {
	CHANGE,
    CREATION,
    DESTRUCTION,
    OCEAN_CHANGE,
}

class Undo_Record {
    gameplay_time: number;
    transaction: string;
    checkpoint: boolean;
    
    editor_info: Undo_Editor_Info;
}

class Undo_Editor_Info {
    description: string;
    entity_type_info: Type_Info;
    entity_id: Pid;
    num_changed;
};

// Create or Destruction
class Entity_Change {
    derived_data_diffed: string;
    entity_type: Type;
}

class Entity_Creation_Or_Destruction {
    entity_type: Entity_Type;
    undoable_data: Undoable_Entity_Data;
 	derived_data_diffed: string;
    is_destruction: boolean;
}

class Creation_Info {
    entity_id: Pid;
	type: Undo_Action_Type;
    serialized_entity_data: string;
}
```

#### Process

Recording:
$$
\begin{aligned}
\\&-undo\space mark\space beginning
\\&-cache\space every\space entity
\\&-record\space undo\space state
\\&-\quad undo\space end\space frame
\\&-\quad\quad FOREACH\space entity:
\\&-\quad\quad\quad scan\space for\space one \space entity
\\&-\quad\quad\quad\quad diff\space entity
\\&-\quad\quad\quad\quad FOREACH\space metadata\space slots:
\\&-\quad\quad\quad\quad\quad base:\space compare\space item
\\&-\quad\quad\quad\quad\quad derived:\space compare\space item
\\&-\quad\quad\quad\quad replace\space cache
\\&-\quad\quad\quad add\space undo\space record
\end{aligned}
$$ {aligned}
Undo:
$$
\begin{aligned}
\\&-do\space on\space undo
\\&-pop\space last\space record 
\\&-really\space do\space one\space undo
\\&-\quad SWITCH\space undo\space action\space type:
\\&-\quad\quad do\space entity\space changes
\\&-\quad\quad\quad FOREACH\space changed\space entity:
\\&-\quad\quad\quad\quad find\space entity
\\&-\quad\quad\quad\quad remove\space it\space from\space grid
\\&-\quad\quad\quad\quad find\space cache
\\&-\quad\quad\quad\quad copy\space cache\space to\space entity
\\&-\quad\quad\quad\quad\quad  FOREACH\space metadata\space slots:
\\&-\quad\quad\quad\quad\quad\quad skip\space new
\\&-\quad\quad\quad\quad\quad\quad copy\space old\space to\space cache
\end{aligned}
$$


#### Diff

```typescript
function reset_undo(undo: Undo_Handler) {
    undo.undo_records.reset();
    undo.current_entity_state.reset();
}

function undo_mark_beginning(manager: Entity_Manager) {
    let undo = manager.undo_handler;
    undo.enabled = true;
    
    array_reset(undo.pending_creations);
    array_reset(undo.pending_destructions);
    
    for (let e of manager.entity_array) {
        if (e.scheduled_for_destruction) continue;
        
        clone = e.clone_via_alloc();
        undo.current_entity_state.add(e.entity_id, clone);
    }
}

function record_eidtor_undo_state(panel: Undo_Panel) {
    let world = get_open_world();
    let manager = world.entity_manager;
    if (world.entity_ids_changed.empty()) return;
    
    let undo = entity_manager.undo_handler;
    
    world.entity_ids_changed.forEach((it, it_idx) => {
        let e = manager.find(it);
        if (!e) continue;
        // ...
    });
    
    undo_end_frame(manager);
    
	// change panel.pending_change_strings
}

function undo_end_frame(manager: Entity_Manager) {
    const undo = manager.undo_handler;
    if (!undo.enabeld) return;
    
   	undo.dirty = true;
    
    scan_for_changed_entities(undo);
    let sum = undo.pending_actions.count;
    if (!sum) return;
    
    undo.dirty = true;
    
    {
        for (let action of pending_actions) {
            if (action.type != Undo_Action_Type.CREATION_OR_DESTRUCTION) continue;
            if (action.creation.is_destruction) continue;
            
            const manager = undo.entity_manager;
            let e = find_entity(manager, action.entity_id);
            
            if (e == null) continue;
            if (e.scheduled_for_destruction) continue;
        }
    }
    
    let record = new Undo_Record();
    record.checkpoint = next_undo_record_is_check_point;
    next_undo_record_is_check_point = false;
    
    // @note The *const* may just implies that 
    // we're calling in some other scope...
    const cs = get_campaign_state();
    record.gameplay_time = cs.current_time;
    // Flags like time_next_lily_update?
    
    record.actions = undo.pending_actions;
    
    array_add(undo.undo_records, record);
    /* implementMe */ clear_current_undo_frame(undo);
}

function scan_for_changed_entities (undo: Undo_Handler) {
    const manager = undo.entity_manager;
    for (let entity of manager.entity_array) {
        scan_one_entity(undo, entity);
    }
}

function scan_one_entity(undo: Undo_Handler,
                         e: Entity, 
                         builder: String_Builder,
                         counter: number) {
	if (entity.scheduled_for_destruection) return;
    
    type Pack_Info = {
        builder: String_Builder;
        slot_count: number;
        slot_count_cursor: Cursor; // String builder cursor?
    };
    
    let old_e = table_find(undo.current_entity_state, e.entity_id);
    let pack_info: Pack_Info;
    pack_info.builder = builder;

    diff_entity(old_e, e, pack_info);

    if (pack_info.slot_count != 0) {
        counter += 1;
        
        // Apply change to the cached entities states
        let clone = clone_entity_vis_alloc(e);
        const succeed = table_replace(undo.current_entity_state, e.entity_id, clone);
        assert(succeed);
    }
}

function diff_entity(old_e: Entity,
                     e_new: Entity,
                     info: Pack_Info) {
    function increment_pack_count = (info: Pack_Info, e: Entity) => {
        if (info.slot_count == 0) {
            put(info.builder, entity_manager_idx_of_type(e.entity_type));
            put(info.bulider, e.entity_id);
           
            info.slot_count_cursor = get_current_cursor(info.builder);
			put(info.builder, 0);  // placeholder
        }
        
        info.slot_count += 1;
    };
    
    function compare_item = (item: Metadata_Item,
                             struct_idx: number,
                             field_idx: number,
                             old_e: Entity,
                             e_new: Entity,
                             info: Pack_Info) => {        
        /* implementMe: metadata_slot */
    	const slot_old = metadata_slot(old_e, item);
		const slot_new = metadata_slot(e_new, item);
		
		const differing = memcmp(slot_old, slot_new);
        if (differing) {
			let bulider = info.builder;
            if (Reflection.is_pod(item.info)) {
            	increment_pack_counts(info, old_e);
                put(builder, struct_idx);
                put(builder, field_idx);
                put(builder, slot_old);
                put(builder, slot_new);
            } else if (item.info.type == Type_Info_Tag.STRING) {
                let s_old = cast_to_string(slot_old);
                let s_new = cast_to_string(slot_new);
            	increment_pack_counts(info, old_e);
                put(builder, struct_idx);
                put(builder, field_idx);
                put(builder, s_old.count);
                put(builder, s_old);
                put(builder, s_new.count);
                put(builder, s_new);
            } else {
                assert(false);
            }
		
		}
	};
    
    const BASE_STRUECT_IDX = 0;
    const DERIVED_STRUECT_IDX = 1;
    	const base_type_idx = entity_manager_idx_of_type(old_e.base_entity_type);
	const base_entity_metadata = metadata_per_entity_type[base_type_idx];
    
    const type_idx = entity_manager_idx_of_type(old_e.entity_type);
	const metadata = metadata_per_entity_type[type_idx];
    
    base_entity_metadata.leat_items.forEach((it, it_idx) => {
		const field_idx = it_idx;
        compare_item(it, 
                     BASE_STRUECT_IDX,
                     field_idx,
                     old_e,
                     e_new,
                     info);
	});
    
	metadata.leat_items.forEach((it, it_idx) => {
		const field_idx = it_idx;
        compare_item(it, 
                     DERIVED_STRUECT_IDX,
                     field_idx,
                     old_e,
                     e_new,
                     info); 
	});
    
    if (info.slot_count != null) {
        slot_count_cursor = info.slot_count;
    }
}
```

#### Do Undo

```typescript
//function play_undo_events_forwards(manager: Entity_Manager) {
//    let undo = manager.undo_handler;
//    for (let it of undo.undo_records) {
//        really_do_one_undo(manager, it, true);
//    }
//}

function do_one_undo(manager: Entity_Manager) {
    let undo  = manager.undo_handler;
    clear_current_undo_frame(undo);
    really_do_one_undo();
}

function really_do_one_undo() {
    let manager = get_entity_manager();
    let undo = manager.undo_handler;
    
    if (!undo.count) return;
    
    record = pop(undo.undo_records);
    really_do_one_undo(manager, record, flase);
}

function really_do_one_undo(manager: Entity_Manager,
                             record: Undo_Record,
                             is_redo: boolean) {
   	let undo = manager.undo_handler;
    let grid = manaager.proximity_grid;

//    // Brutal version
//    for (let e_dest of manager.entity_array) {
//    	let cached = table_find(undo.current_entity_state, e_dest.entity_id);
//        assert(cached);
//        {
//            copy_entity_data(cached, e_dest);
//            {
//                let e = e_dest;
//                let new_position = e.undoable_data.position;
//                move_entity(e, new_position, do_play_sound = false);
//                update_physical_position(e, new_position);
//                e.visual_position = e.position;
//                reset(e.visual_interpolation);
//                sanity_check();
//            }
//        }
//    }
   
    let remaining = record.transactions;
    while (remaining) {
        let action = remaining[0];
        advance(remaining, 1);
        
        switch(action) {
        	case: Undo_Action_Type.CHANGE:
                let num_entities: number;
                get(remaining, num_entities);
                do_entity_changes(manager, num_entities, buffer, is_redo);
                break;
            case : Undo_Action_Type.CREATION:
            case: Undo_Action_Type.DESTRUCTION:
                var entity_id；
                get(remaining, entity_id);
                
                var serialized_size;
                get(remaining, serialized_size);
                
                
                break;
			case: Undo_Action_Type.OCEAN_CHANGE:
                break;
        }
    }
}

function do_entity_changes(manager: Entity_Manager,
                           num_entities: number,
                           buffer: string,
                           apply_forward: boolean) {
    while (num_entities--) {
        var entity_type_idx;
        get(buffer, entity_type_idx);
        var entity_id;
        get(buffer, entity_id);
        var num_slots;
        get(buffer, num_slots);
        
        const undo = manager.undo_handler;
        var e_dest;
        find(manager, entity_id);
        assert(e_dest);
        remove_from_grid(manager.proximity_grid, e_dest);
        
        let entity_type = entity_type_from_idx(entity_type_idx);
       	assert(entity_type == e_dest.entity_type);
        
        let cached = table_find(undo.current_entity_state, e_dest.entity_id);
        assert(cached);
        
        {
            copy_entity_data(cached, e_dest);
            {
                let e = e_dest;
                let new_position = e.undoable_data.position;
                move_entity(e, new_position, do_play_sound = false);
                update_physical_position(e, new_position);
                e.visual_position = e.position;
                reset(e.visual_interpolation);
                sanity_check();
            }
        }
        
        apply_diff(cached, entity_type_idx, num_slots, buffer, apply_forward);
    }
}

apply_diff (e_dest: Entity,
            entity_type_idx: number,
            num_slots: number,
            buffer: string,
            apply_forward: boolean = false) {
    let entity_idx = entity_manager_idx_of_type(e.entity);
    let metadata = metadata_per_entity_type[entity_idx];
    
	for (let i = 0; i < num_slots; i++) {
        var struct_idx;
        get(buffer, struct_idx);
        var member_idx;
        get(buffer, member_idx);

        let metadata: Metadata;
        if (struct_idx == 0) {
            metadata = global_base_entity_metadata;
        } else {
            metadata = metadata_per_type[entity_type_idx];
        }

        let item = metadata.leaf_items[member_idx];
        let slot_dest = metadata_slot(e_dest, item);
        
        let size = item.info.runtime_size;
        if (Refletion.is_pod(item.info)) {
			if (apply_forward) {
                advance(buffer, size); // Skip old
                memcpy(slot_dest, buffer, size);  
                advance(buffer, size); 
            } else {
                memcpy(slot_dest, buffer, size);
                advance(buffer, size); 
                advance(buffer, size); // Skip new
            }
        } else if (item.info.type == Type_Info_Tag.STRING) {
			function discard_string = (buffer: string) => {
                var count;
                get(buffer, count);
                advance(buffer, count);
            };
            
            function extract_string = (buffer: string, dest: string) => {
              	var count;
             	get(buffer, count);
                dest.data = alloc(count);
                memcpy(slot_dest, buffer, count);
                advance(buffer, count);
            };
            
            var str_dest;
            if (apply_forward) {
                discard_string(buffer);
                extract_string(buffer, str_dest);
            } else {
                extract_string(buffer, str_dest);
                discard_string(buffer);
            }
        } else {
            assert(false);
        }
        
    }
}
```

#### Creation / Destruction

```typescript
function undo_note_created_entity(e: Entity) {
	let undo = e.entity_manager.undo_handler;
    if (!handler.enabled) return;
    if (doing_undo) return;
    
    let ecd = note_ecde(e);
    ecd.creation.is_destruction = false;

    old_entity = create_old_entity(undo, e);
    
	array_add(undo.pending_creations, ecd);
}

function undo_note_destroyed_entity(e: Entity) {
    let undo = e.entity_manager.undo_handler;
    if (!handler.enabled) return;
    if (doing_undo) return;
    
    let count = array_unordered_remove(undo.pending_creations, e.entity_id);
    
	for (let it of undo.pending_creations) {
        assert(it.entity_id != e.entity_id);
    }
    for (let it of undo.pending_destructions) {
        assert(it.entity_id != e.entity_id);
    }
    
    let info: Creation_Info;
    info.action = Undo_Action_Type.DESTRUCTION;
    info.entity_id = e.entity_id;
    info.serialized_entity_data = "";
    
	array_add_if_unique(undo.pending_creations, e.entity_id);
    
    if (count) {
        array_add_if_unique(undo.pending_destructions, e.entity_id);
    }
}

// Note entity creation or destruction
function note_ecd(e: Entity): Creation_Info {
    let result: Undo_Action;
    result.entity_id = e.entity_id;
    result.type = Undo_Action_Type.CREATION_OR_DESTRUCTION;
    
    let c = result.creation;
    c.entity_type = e.entity_type;
    
    copy_undoable_data(e.undoable_data, c.undoable_data);
    
    let type_idx = entity_manager_idx_of_type(e.entity_type);
    const default = entity_default_states[type_idx];
    
    let s = diff_entity(e, default, e.derived_pointer);
    c.derived_data_diffed = s;

    return result;
}

function add_entity_creation_or_destruction (builder: String_Builder, manager: Entity_Manager, undo: Undo_Handler, info: Creation_Info) {
    put(builder, info.action);
    put(builder, info.id);
    append(builder, info.serialized_entity_data);
}

function get_old_entity(undo: Undo_Handler, e: Entity): Entity {
    let old_e = table_find(undo.old_entity_table, e.entity_id);
    assert(old_e != null);
    
    return old_e;
}

function create_old_entity(undo: Undo_Handler, e: Entity, optional: false): Entity {
    let old_e = table_find(undo.old_entity_table, e.entity_id);
    if (old_e != null) {
        if (!optional) assert(false);

        return old_e;
    }
    
    let e_copy = new Entity();
    let result = table_add(undo.old_entity_table, e.entity_id, e_copy);
    
    let info = (Type_Info)e.entity_type;
    derived_size = info.runtime_size;
    result.derived_pointer = alloc(derived_size);
    memcpy(result.derived_pointer, e.derived_pointer, derived_size);

    return result;
}

function remove_old_entity(undo: Undo_Handler, id: Pid) {
    let old_e = table_find(undo.old_entity_table, e.entity_id);
    assert(old_e);
    
    if (old_e) {
        free(old_e.derived);
    }
    
    table_clobber_entry(undo.old_entity_table);
}
```



Screenshots

`copy_undoable_data`

![image-20230220223737889](Puzzle%20Game%20Movement%20System.assets/image-20230220223737889.png)

