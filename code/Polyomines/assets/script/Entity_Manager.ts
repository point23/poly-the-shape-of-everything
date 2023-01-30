import {_decorator, CCString, Component, instantiate, Node, Prefab, profiler, Quat, Vec2, Vec3} from 'cc';

import {Game_Entity} from './entities/Game_Entity_Base';
import {Coord, Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

/* FIXME Not complete */
export type Entity_Info = {
  prefab_id: string,
  coord: {x: number, y: number},
  rotation: {x: number, y: number, z: number, w: number},
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
  public static instance: Entity_Manager = null;
  public static Settle(instance: Entity_Manager, game_board: Game_Board) {
    Entity_Manager.instance = instance;
    Entity_Manager.instance.game_board = game_board;
    Entity_Manager.instance.mapping_prefabs();
  }

  @property(Node) entities_parent_node: Node;

  @property([Entity_Prefab_Pair])
  list_entities_prefab: Entity_Prefab_Pair[] = [];

  entity_prefab_map: Map<String, Prefab> = new Map;
  game_board: Game_Board;
  entities: Game_Entity[] = [];

  mapping_prefabs() {
    for (let pair of this.list_entities_prefab) {
      this.entity_prefab_map[pair.id] = pair.prefab;
    }
  }

  load_entities(entities_info: Entity_Info[]) {
    for (let entitie_info of entities_info) {
      let node: Node =
          instantiate(this.entity_prefab_map[entitie_info.prefab_id]);
      node.setParent(this.entities_parent_node);

      let entity = node.getComponent(Game_Entity);
      const coord_info = entitie_info.coord;
      const rotation_info = entitie_info.rotation;

      const prefab_id = entitie_info.prefab_id;
      const coord: Vec2 = new Vec2(coord_info.x, coord_info.y);
      const rotation: Quat = new Quat(
          rotation_info.x, rotation_info.y, rotation_info.z, rotation_info.w);
      let position: Vec3;
      let convert_res = this.game_board.coord2world(coord);
      if (convert_res.succeed) {
        position = convert_res.pos;
        entity.init(position, rotation, coord, prefab_id);

        this.entities.push(entity);
      }
    }
  }

  entities_info(): Entity_Info[] {
    let entities_info: Entity_Info[] = [];

    for (let entity of this.entities) {
      let info = {
        coord: {x: entity.coord.x, y: entity.coord.y},
        rotation: {
          x: entity.rotation.x,
          y: entity.rotation.y,
          z: entity.rotation.z,
          w: entity.rotation.w
        },
        prefab_id: entity.prefab_id,
      };
      entities_info.push(info);
    }
    return entities_info;
  }
}
