## Reference

1. Jonathon Blow, "Discussion: Puzzle Game Movement Systems, with Sean Barrett.", https://www.youtube.com/watch?v=_tMb7OS2TOU&t=1879s. Jan 11, 2023.



## Content

游戏更新的方案：

- 实时
- 回合制
- 事件驱动
  - Async灾难：竞争条件（Race-Condition）


状态更新与动画渲染的先后关系

- [视频号]InsGirl的动态场景：Lily Pad & the Guy

  <img src="Puzzle%20Game%20Movement%20System.assets/image-20230111152636121.png" alt="image-20230111152636121" style="zoom:67%;" />

- 目的：Juicy the game feel

  1. 存在预先跳上和延迟跳上两种动画渲染。

  2. 玩家按键跳转的时机往往不是Lily Pad恰好处于Gap的时机。

     - 抢跳：

       <img src="Puzzle%20Game%20Movement%20System.assets/image-20230111162208808.png" alt="image-20230111162208808" style="zoom:50%;" />

     - 晚跳：

       <img src="Puzzle%20Game%20Movement%20System.assets/image-20230111163429417.png" alt="image-20230111163429417" style="zoom:50%;" />

- 流程：以抢跳为例

  ![image-20230111173909003](Puzzle%20Game%20Movement%20System.assets/image-20230111173909003.png)

- 问题：如何正确渲染玩家穿过Gap的两种情形？

  1. 有一个像素点离开时就发生Position更新，调整事件处理顺序
  2. Item没有Position属性，只有Grid Unit/Square关于Item的引用.
     - 一个Item可以同时属于多个Square。
  3. Item可以占据多个格子。




