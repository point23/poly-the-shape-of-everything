import {_decorator, Component, instantiate, Node, Prefab} from 'cc';

const {ccclass, property} = _decorator;

@ccclass('Main')
export class Main extends Component {
  // public transaction_id: number = 0;
  @property(Node) public board: Node;
  @property(Prefab) public board_square_prefab: Prefab;

  public static square_size: number = 72;
  public static half_square_size: number = 36;
  public static board_size: number = 8;

  start() {
    let step_x = Main.square_size, step_y = Main.square_size;

    let pos_x = -Main.board_size / 2 * Main.square_size + Main.half_square_size;
    for (let x = 0; x < 8; x++) {
      let pos_y =
          -Main.board_size / 2 * Main.square_size + Main.half_square_size;
      for (let y = 0; y < 8; y++) {
        let square = instantiate(this.board_square_prefab);
        square.setParent(this.board);
        square.setPosition(pos_x, pos_y);

        pos_y += step_y;
      }
      pos_x += step_x;
    }
  }

  // NOTE this is the only update loop.
  update(deltaTime: number) {}
}