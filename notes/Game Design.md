## Twaddle

- Puzzle Type of *Poly* = Sokoban + Tile-Match

## Ideas

- 暂时将这些受控制的多个骨牌称为Poly.

- 被锁链链接的Poly

- Sokobond: cut the chain.

- 镜像Poly

- 冰块+篝火，限制通关时间
  - 尽可能不要用在不同文化中有误解的符号

  - 使用一些更加原始的表达方式

- 小车Poly，被锁定在轨道上

- Beginning in the middle: 玩家已经解锁了一半关卡

- Projectile Shooter

- 结合Sokoban游戏有角色移动的特点和Tile-Match Game直接旋转方块的特点
  - 启发: 马里奥奥德赛, 附身的行为, 尤其是可以拖长的毛毛虫

- Poly有力量限制
  - 3方格的Poly相比2方格的Poly可以进行更多的操作

- Polyominoes

  ![image-20230128123827144](Game%20Design.assets/image-20230128123827144.png)

- 起始场景定在水族馆

- 世界背景是所有的陆生生物都有智慧，海洋生物被保护在水族馆里

- 一座猫头鹰和松鼠夫妻合开的水族馆

- 小动物在死去后会变成Poly，但变身时间过程会变得不可控

- 故事关于死亡，关于情感



## Inspires

#### *English Country Tune*

1.   杠杆(Lever)

     1.   普通杠杆

          <img src="Game%20Design.assets/image-20230108122407085.png" alt="image-20230108122407085" style="zoom:50%;" />

     2.   重叠(Overlapped)杠杆

          <img src="Game%20Design.assets/image-20230108123617466.png" alt="image-20230108123617466" style="zoom:50%;" />

2.   



#### *Sokobond*

1.   Torn Apart

     <img src="Game%20Design.assets/sokobond-torn_part.gif" alt="sokobond-torn_part" style="zoom: 25%;" />

2.   



## 怪物远征

1.   带探索地区的迷雾

     <img src="Game%20Design.assets/image-20230311121354486.png" alt="image-20230311121354486" style="zoom: 25%;" />

2.   推箱子

     1.   Monomino 🔁 Domino

          <img src="Game%20Design.assets/image-20230311130412809.png" alt="image-20230311130412809" style="zoom:25%;" />

     2.   

3.   路

     1.   双连通路

          <img src="Game%20Design.assets/image-20230311121914901.png" alt="image-20230311121914901" style="zoom:25%;" />

     2.   四连通路

          <img src="Game%20Design.assets/image-20230311122833086.png" alt="image-20230311122833086" style="zoom:25%;" />

     3.   

4.   桥

     1.   2格桥

          <img src="Game%20Design.assets/image-20230311125617605.png" alt="image-20230311125617605" style="zoom:25%;" />

     2.   3格桥

          <img src="Game%20Design.assets/image-20230311125207905.png" alt="image-20230311125207905" style="zoom:25%;" />

     3.   木筏

          <img src="Game%20Design.assets/image-20230311131537133.png" alt="image-20230311131537133" style="zoom:25%;" />

5.   墙

     1.   Domino墙

          <img src="Game%20Design.assets/image-20230311132935411.png" alt="image-20230311132935411" style="zoom:25%;" />

     2.   L-Tromino墙

          <img src="Game%20Design.assets/image-20230311132512957.png" alt="image-20230311132512957" style="zoom: 25%;" />

     3.   

     4.   

#### A good snow man is hard to build

1.   雪人大小与路径关系

     <img src="Game%20Design.assets/image-20230311134237335.png" alt="image-20230311134237335" style="zoom:25%;" />

2.   挤占其他雪球的路径

     <img src="Game%20Design.assets/image-20230311135043360.png" alt="image-20230311135043360" style="zoom:25%;" />

3.   

## Bonfire Peak

#### 目标

将私人物品(Belongings)放入篝火(Bonfire)中

#### 货箱

1.   玩家不能将多个骨牌分开举起

2.   栈的抽象

     <img src="Game%20Design.assets/image-20230311204948034.png" alt="image-20230311204948034" style="zoom:33%;" />

3.   

#### 移动

​	举起箱子后主角和箱子的方块会被视为一个整体，移动模式发生了变化

1.   倒退

     <img src="Game%20Design.assets/image-20230311200545356.png" alt="image-20230311200545356" style="zoom:33%;" />

2.   旋转

     <img src="Game%20Design.assets/image-20230311202255681.png" alt="image-20230311202255681" style="zoom:33%;" />

     旋转时箱子会有碰撞行为

3.   “跳跃” / “击掌”

     玩家没有跳跃行为，但越过间隙时箱子会碰撞同高度处间隔格子处的物品

     <img src="Game%20Design.assets/image-20230311202744748.png" alt="image-20230311202744748" style="zoom: 33%;" />

#### 多格骨牌的应用

1.   造“桥”

     1.   有高度差的隐性造桥

          <img src="Game%20Design.assets/image-20230311203154887.png" alt="image-20230311203154887" style="zoom:50%;" />

     2.   不连通的显性造桥

          <img src="Game%20Design.assets/image-20230311203743002.png" alt="image-20230311203743002" style="zoom:50%;" />

2.   “梯子”

     <img src="Game%20Design.assets/image-20230311213804454.png" alt="image-20230311213804454" style="zoom:33%;" />

     *Crate Expectation*

3.   



