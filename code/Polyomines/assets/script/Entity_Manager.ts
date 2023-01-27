import {_decorator, Component, instantiate, Node, Prefab} from 'cc';

import {Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

/* FIXME Not complete */
type Entity_Info = {
  coord: {x: number, y: number};
};

@ccclass('Entity_Manager')
export class Entity_Manager extends Component {
  @property(Prefab) ground_prefab: Prefab;
  @property(Node) grounds: Node;

  @property(Game_Board) game_board: Game_Board;

  generate_grounds(grounds_info: Entity_Info[]) {
    for (let ground_info of grounds_info) {
      let ground = instantiate(this.ground_prefab);
      ground.setParent(this.grounds);
      let convert_res = this.game_board.coordToWorldPosition(ground_info.coord)
      ground.setPosition(convert_res.pos);
    }
  }
}
