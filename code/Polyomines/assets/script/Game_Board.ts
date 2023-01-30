import {_decorator, Component, instantiate, MeshRenderer, Node, Prefab, Size, Vec2, Vec3} from 'cc';
import {Const} from './Const';

const {ccclass, property} = _decorator;

export type Game_Board_Info = {
  grid_size: {width: number, height: number};
}

export type Coord = {
  x: number; y: number;
}|Vec2;

/**
 * Main Purpose:
 * - Draw debug info on invalid squares.
 *  - Show grids.
 *  - Transform from board-coords to world-position.
 */
@ccclass('Game_Board')
export class Game_Board extends Component {
  @property(Node) squares_layout: Node;
  @property(Prefab) square_prefab: Prefab;

  grid_size: Size;
  squares: Node[] = [];

  public show_grid(game_board_info: Game_Board_Info) {
    const grid_size = new Size(
        game_board_info.grid_size.width, game_board_info.grid_size.height);
    const square_size = Const.Game_Board_Square_Size;
    const origin_pos = Const.Game_Board_Orgin_Pos;

    this.grid_size = grid_size;
    let cols = grid_size.width;
    let rows = grid_size.height;
    let step_z = square_size;
    let step_x = square_size;
    let pos_x = origin_pos.x;

    for (let row = 0; row < rows; row++) {
      let pos_z = origin_pos.z;

      for (let col = 0; col < cols; col++) {
        let square: Node = instantiate(this.square_prefab);

        square.setParent(this.squares_layout);
        square.setPosition(new Vec3(pos_x, 0, pos_z));

        this.squares.push(square);

        pos_z += step_z;
      }
      pos_x += step_x;
    }
  }

  /* FIXME Refact this to a .then().catch() form */
  public coord2world(coord: Coord): {succeed: boolean, pos: Vec3} {
    if (coord.x > this.grid_size.width || coord.y > this.grid_size.height) {
      return {succeed: false, pos: Vec3.ZERO};
    }

    const square_size = Const.Game_Board_Square_Size;
    const half_square_size = Const.Game_Board_Half_Square_Size;
    let pos = new Vec3(
        coord.y * square_size, half_square_size, coord.x * square_size);
    return {succeed: true, pos: pos};
  }

  public world2coord(pos: Vec3): {succeed: boolean, coord: Vec2} {
    const square_size = Const.Game_Board_Square_Size;
    const origin_pos = Const.Game_Board_Orgin_Pos;
    const delta = pos.subtract(origin_pos);
    let succeed = false;
    let x = delta.z / square_size;
    let y = delta.x / square_size;
    if (x < this.grid_size.x && y < this.grid_size.y && delta.z >= 0 &&
        delta.x >= 0) {
      succeed = true;
    }
    return {succeed: succeed, coord: new Vec2(x, y)};
  }
}
