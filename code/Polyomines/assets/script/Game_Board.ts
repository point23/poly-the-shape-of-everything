import {_decorator, Component, instantiate, MeshRenderer, Node, Prefab, Size, Vec2, Vec3} from 'cc';
import {Const} from './Const';

const {ccclass, property} = _decorator;

export type Game_Board_Info = {
  grid_size: {width: number, height: number};
}

export type Coord = {
  x: number; y: number;
}

/**
 * Main Purpose:
 * - Draw debug info on invalid squares.
 *  - Show grids.
 *  - Transform from board-coords to world-position.
 */
@ccclass('Game_Board') export class Game_Board extends Component {
  @property(Node) regions: Node;
  @property(Prefab) board_region_prefab: Prefab;

  grid_size: Size;

  /** FIXME Too much game_board_info */
  public show_grids(game_board_info: Game_Board_Info) {
    const grid_size = new Size(
        game_board_info.grid_size.width, game_board_info.grid_size.height);
    const region_size: number = Const.Game_Board_Region_Size;
    const half_region_size: number = Const.Game_Board_Half_Region_Size;
    const half_square_size = Const.Game_Board_Half_Square_Size;
    const origin_pos = Const.Game_Board_Orgin_Pos;

    this.grid_size = grid_size;
    let cols = grid_size.width / region_size;
    let rows = grid_size.height / region_size;
    let step_z = region_size;
    let step_x = region_size;
    let pos_x = origin_pos.x + half_region_size - half_square_size;

    for (let row = 0; row < rows; row++) {
      let pos_z = origin_pos.z + half_region_size - half_square_size;

      for (let col = 0; col < cols; col++) {
        let region: Node = instantiate(this.board_region_prefab);

        region.setParent(this.regions);
        region.setPosition(new Vec3(pos_x, 0, pos_z));

        pos_z += step_z;
      }

      pos_x += step_x;
    }
  }

  public coord_to_world_position(coord: Coord): {succeed: boolean, pos: Vec3} {
    if (coord.x > this.grid_size.width || coord.y > this.grid_size.height) {
      return {succeed: false, pos: Vec3.ZERO};
    }

    const square_size = Const.Game_Board_Square_Size;
    const half_square_size = Const.Game_Board_Half_Square_Size;
    let pos = new Vec3(
        coord.y * square_size, half_square_size, coord.x * square_size);
    return {succeed: true, pos: pos};
  }
}
