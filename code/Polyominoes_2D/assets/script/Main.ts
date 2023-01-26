import {_decorator, Component, instantiate, Node, Prefab, Quat, Vec3} from 'cc';
import {Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  div(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }
}

enum Rotate_Mode {
  Right,
  Up,
  Left,
  Down,
}

class Domino {
  static Default_Direction: Vector2[] = [
    new Vector2(1, 0), new Vector2(0, 1), new Vector2(-1, 0), new Vector2(0, -1)
  ];
  static Default_Angle: number[] = [0, 90, 180, -90];

  /* NOTE Default form of domino:
        _ _ _   _ _ _
       |     | |     |
       |  o  |c|     |
       |_ _ _| |_ _ _|
       o: origin position
       c: center position
   */
  origin: Vector2;
  rotate_mode: Rotate_Mode;

  /* TODO Better extract rotate_mode as a enum or sth */
  public constructor(origin: Vector2, rotate_mode: Rotate_Mode) {
    this.origin = origin;
    this.rotate_mode = rotate_mode;
  }

  /* TODO A more universal approach is needed */
  get center(): Vector2 {
    return this.origin.add(this.direction.div(2));
  }

  get direction(): Vector2{return Domino.Default_Direction[this.rotate_mode]}

  get angle(): number {
    return Domino.Default_Angle[this.rotate_mode];
  }
};

@ccclass('Main')
export class Main extends Component {
  // Properties
  @property(Game_Board) public game_board: Game_Board;
  @property(Prefab) public domino_prefab: Prefab;

  start() {
    this.game_board.init();
    // {  // Generate Dominoes
    //   let dominos: Domino[] = [
    //     new Domino(new Vector2(3, 3), Rotate_Mode.Up),
    //     new Domino(new Vector2(0, 0), Rotate_Mode.Right),
    //     new Domino(new Vector2(6, 3), Rotate_Mode.Down),
    //     new Domino(new Vector2(5, 7), Rotate_Mode.Left)
    //   ];
    //   console.log(dominos);

    //   for (let domino of dominos) {
    //     let node = instantiate(this.domino_prefab);
    //     let pos_x = origin_x + domino.center.x * step_x,
    //         pos_y = origin_y + domino.center.y * step_y;
    //     node.setParent(this.board);
    //     node.setPosition(pos_x, pos_y);
    //     node.angle = domino.angle;
    //   }
    // }
  }

  // NOTE this is the only update loop.
  update(deltaTime: number) {}
}