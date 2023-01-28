# 参考资料：

1. Jonathon Blow, "Discussion: Puzzle Game Movement Systems, with Sean Barrett.", https://www.youtube.com/watch?v=_tMb7OS2TOU&t=1879s. Jan 11, 2023.
2. Be a Better Dev, "What is a Database Transaction? Be ACID compliant", https://www.youtube.com/watch?v=wHUOeXbZCYA. Jan 28, 2023.
3. 



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

​		避免偶然事件：游戏世界基于引擎，但对于游戏玩法的计算，我们需要保证连续性，相同（或近似）输入下要有相同的结果，否则容易引起玩家的误解

## Jon Blow's Impl

Transaction: 以Transaction的形式提交

```ruby
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
	PHYSICALLY_MOVED; // ISSUED
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

```ruby
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

detect_conflicts function: <u>**[TODO] how git check for conflicts**</u>

```ruby
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

- and afterwards we are going to solve those conflicts.

# Database Transactions

> Unit of work in DB language.

#### Example Unit

| ID   | OP     |
| ---- | ------ |
| 1    | insert |
| 2    | update |

- Either succeed or fail together as a unit.
- Nothing can be partially succeed.

#### ACID

- Atomic
- Consistency
- Isolation
- Durability
