# 参考资料：

1. Jonathon Blow, "Discussion: Puzzle Game Movement Systems, with Sean Barrett.", https://www.youtube.com/watch?v=_tMb7OS2TOU&t=1879s. Jan 11, 2023.
2. Be a Better Dev, "What is a Database Transaction? Be ACID compliant", https://www.youtube.com/watch?v=wHUOeXbZCYA. Jan 28, 2023.
3. Jonathon Blow, "Game Engine Programming Undo system rewrite", https://www.youtube.com/watch?v=PeF-9H6d7Lg&t=3796s. Feb 9, 2023.

 

# Grid

- Proximity Grid 



# Moves, Transactions, Conflicts 

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

#### Jon's Implementation

Transaction

```
Move_Transaction {
	transaction_id;
	entity_manager;
	issue_time;
	commit_time;
	duration = -8 to 8;
	elapsed;
	transaction_flags;
	moves;
}

Transaction_Flags {
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

Move

```
Move {
	move_id;
	entity_id;
	move_info;
	visual_start;
	visual_end;
	?? visual_error;
}

Move_Info {
	move_type;
	duration = -8 to 8;
	[cached] delta;
	start_position;
	end_position;
	support_info;
	move_flags;
	reaction_direction; // Push or Pull
}

Support_Info {
	supporter_id;
	supported;
	supporter;
}

Move_Type {
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

Move_Flag {
	STRONG_PUSH;
	MOVED_BY_MIRROR;
	...
}
```

detect_conflicts：

```
detect_conflicts(entity_manager, move_transaction) -> conflict
	for other_transaction of entity_manager.move_transactions:
    	for move of move_transaction.moves:
    		for other_move of other_transaction.moves:
                check if conflicts:
                    occupy the same square?
                    manipulate the same entity?
            end
        end
    end
end
```



# Undo System: in Database, Version Control, Editors...

#### Transactions in Database

> Unit of work in DB language.

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



# Undo System

#### Problem

- 运行时游戏和关卡编辑器都需要Undo, 但两者涉及的数据大相径庭，例如运行时保存了：Failing, Dead等Flag，而编辑器保存了Material。
- 如果编辑器内得操作也是以Move为单位，Move会有太多的Sub-Class
- 大跨度的撤回：like C-R to reset a level；撤回到某个Major Change：like 推动Block。

#### Entity

```typescript
// Entity Manager
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

class Entity {
    undoable: Undoable_Entity_Data;
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



#### Diff

```typescript
// serialize:
diff_entity(e_old, e_new, info) {
	const type_idx = entity_manager_idx_of_type(e_old.entity_type);
	const metadata = metadata_per_entity_type[type_idx];
    
	for (let item of metadata.leaf_item) {
        compare_item(item, e_old, e_new, info);
	}
}

compare_item(item, e_old, e_new, info) {
    	const slot_old = metadata_slot(e_old, item);
		const slot_new = metadata_slot(e_new, item);
		
		const differing = memcmp(slot_old, slot_new);
		if (differing) {
			const field_idx = item.idx;
			info.put(field_idx);
			info.put(slot_old, slot_new);
            
            // console.log(...)
		}
}

// use case:
let e_old = new Game_Entity();
let e_new = new Game_Entity();
info = new String_Builder();
diff_entity(old, new, info);
info.to_string();
```
