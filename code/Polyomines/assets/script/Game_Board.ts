import {_decorator, Component, instantiate, MeshRenderer, Node, Prefab, Size, Vec2, Vec3} from 'cc';

const {ccclass, property} = _decorator;

type Coord = {
  x: number; y: number;
}

/* NOTE
    - Draw debug info
    - show grids
    - Transform from board coords to world position
 */
@ccclass('Game_Board') export class Game_Board extends Component {
  @property(Node) regions: Node;
  @property(Prefab) board_region_prefab: Prefab;

  static region_size = 10;
  static half_region_size = 5;
  static square_size = 1;
  static half_square_size = 0.5;
  static origin_pos = new Vec3(0, 0, 0);

  grid_size: Size;

  public show_grids(grid_size: {width: number, height: number}) {
    this.grid_size = new Size(grid_size.width, grid_size.height);

    let cols = grid_size.width / Game_Board.region_size;
    let rows = grid_size.height / Game_Board.region_size;
    let step_z = Game_Board.region_size;
    let step_x = Game_Board.region_size;
    let pos_x = Game_Board.origin_pos.x + Game_Board.half_region_size -
        Game_Board.half_square_size;

    for (let row = 0; row < rows; row++) {
      let pos_z = Game_Board.origin_pos.z + Game_Board.half_region_size -
          Game_Board.half_square_size;

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
    let pos = new Vec3(
        coord.y * Game_Board.square_size, Game_Board.half_square_size,
        coord.x * Game_Board.square_size);
    return {succeed: true, pos: pos};
  }
}
