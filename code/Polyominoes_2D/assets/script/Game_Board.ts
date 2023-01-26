import {_decorator, Component, instantiate, Node, Prefab, RichText} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('Game_Board')
export class Game_Board extends Component {
  @property(Node) public board: Node;
  @property(Prefab) public board_square_prefab: Prefab;
  @property(Number) public square_size: number = 72;
  @property(Number) public half_square_size: number = 36;
  @property(Number) public board_width: number = 8;
  @property(Number) public board_height: number = 8;

  init() {
    let step_x = this.square_size, step_y = this.square_size,
        origin_x =
            -this.board_width / 2 * this.square_size + this.half_square_size,
        origin_y =
            -this.board_height / 2 * this.square_size + this.half_square_size;

    {  // Generate Game Board
      let pos_x = origin_x;
      for (let x = 0; x < 8; x++) {
        let pos_y = origin_y;
        for (let y = 0; y < 8; y++) {
          let square = instantiate(this.board_square_prefab);
          square.setParent(this.board);
          square.setPosition(pos_x, pos_y);

          /* TODO Extract this... */
          let txt = square.getComponentInChildren(RichText);
          txt.string = `(${x},${y})`;
          pos_y += step_y;
        }
        pos_x += step_x;
      }
    }
  }
}
