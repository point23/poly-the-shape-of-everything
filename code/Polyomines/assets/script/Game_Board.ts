import {_decorator, Component, instantiate, MeshRenderer, Node, Prefab, Quat, Size, Vec3} from 'cc';

import {Const} from './Const';

const {ccclass, property} = _decorator;

export type Game_Board_Info = {
  grid_size: {width: number, height: number};
}

/**
 * Main Purpose:
 * - Draw debug info on invalid squares.
 * - Show grids.
 * - Transform from board-coords to world-position.
 */
@ccclass('Game_Board') export class Game_Board extends Component {
  @property(Node) grid: Node = null;

  grid_size: Size;
  squares: Node[] = [];

  public show_grid(game_board_info: Game_Board_Info) {
    const grid_size = new Size(
        game_board_info.grid_size.width, game_board_info.grid_size.height);
    this.grid_size = grid_size;

    const square_size = Const.Game_Board_Square_Size;
    const half_square_size = Const.Game_Board_Half_Square_Size;
    const origin_pos = Const.Game_Board_Orgin_Pos;

    const grid_pos_z =
        origin_pos.z - half_square_size + square_size * grid_size.width / 2;
    const grid_pos_x =
        origin_pos.x - half_square_size + square_size * grid_size.height / 2;
    const grid_pos_y = origin_pos.y - half_square_size;
    const grid_center = new Vec3(grid_pos_x, grid_pos_y, grid_pos_z);

    this.grid.setPosition(grid_center);
    this.grid.setScale(grid_size.height / 10, 1, grid_size.width / 10);

    const renderable = this.grid.getComponent(MeshRenderer);
    const mat = renderable.material;
    mat.setProperty(
        'tilingOffset', new Quat(grid_size.height, grid_size.width, 0, 0));
  }

  public local2world(local_pos: Vec3): Promise<Vec3> {
    if (local_pos.x > this.grid_size.width ||
        local_pos.y > this.grid_size.height) {
      throw new Error('invalid local pos.');
    }

    const square_size = Const.Game_Board_Square_Size;
    // const half_square_size = Const.Game_Board_Half_Square_Size;

    let world_pos = new Vec3(
        local_pos.y * square_size, local_pos.z * square_size,
        local_pos.x * square_size);

    return Promise.resolve(world_pos);
  }

  // public world2local(pos: Vec3): {succeed: boolean, coord: Vec2} {
  //   const square_size = Const.Game_Board_Square_Size;
  //   const origin_pos = Const.Game_Board_Orgin_Pos;
  //   const delta = pos.subtract(origin_pos);
  //   let succeed = false;
  //   let x = delta.z / square_size;
  //   let y = delta.x / square_size;
  //   if (x < this.grid_size.x && y < this.grid_size.y && delta.z >= 0 &&
  //       delta.x >= 0) {
  //     succeed = true;
  //   }
  //   return {succeed: succeed, coord: new Vec2(x, y)};
  // }
}
