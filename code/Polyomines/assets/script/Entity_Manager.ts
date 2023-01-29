import {_decorator, CCString, Component, instantiate, Node, Prefab, profiler} from 'cc';
import {Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

/* FIXME Not complete */
export type Entity_Info = {
  prefab_id: string; coord: {x: number, y: number};
};

@ccclass('Entity_Prefab_Pair')
export class Entity_Prefab_Pair {
  @property(CCString) id = '';
  @property(Prefab) prefab = null;
}

/* NOTE
  - Manage entity pool
  - Get and retrieve entities
  - Detect conflicts between entities
 */
@ccclass('Entity_Manager')
export class Entity_Manager extends Component {
  private entity_prefab_map: Map<String, Prefab> = new Map;

  @property(Game_Board) game_board: Game_Board;

  @property(Node) entities_parent_node: Node;

  @property([Entity_Prefab_Pair])
  list_entities_prefab: Entity_Prefab_Pair[] = [];

  onLoad() {
    // Mapping prefabs
    for (let pair of this.list_entities_prefab) {
      this.entity_prefab_map[pair.id] = pair.prefab;
    }
  }

  load_static_entities(static_entities_info: Entity_Info[]) {
    for (let static_entitie_info of static_entities_info) {
      let entity =
          instantiate(this.entity_prefab_map[static_entitie_info.prefab_id]);
      entity.setParent(this.entities_parent_node);
      let convert_res =
          this.game_board.coord_to_world_position(static_entitie_info.coord);
      if (convert_res.succeed) entity.setPosition(convert_res.pos);
    }
  }
}
