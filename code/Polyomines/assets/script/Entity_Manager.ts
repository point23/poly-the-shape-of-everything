import {_decorator, CCString, Component, computeRatioByType, FogInfo, instantiate, Node, Prefab, profiler, Quat, Vec2, Vec3} from 'cc';

import {Entity_Info, Game_Entity} from './entities/Game_Entity_Base';
import {Game_Board} from './Game_Board';

const {ccclass, property} = _decorator;

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

  async load_entities(entities_info: any[]): Promise<Game_Entity[]> {
    let newly_generated_entities: Game_Entity[] = [];

    for (let i = 0; i < entities_info.length; i++) {
      let info = new Entity_Info(entities_info[i]);

      let node: Node = instantiate(this.entity_prefab_map[info.prefab]);
      node.setParent(this.entities_parent_node);

      let entity = node.getComponent(Game_Entity);

      await this.game_board.local2world(info.local_pos).then((world_pos) => {
        info.world_pos = world_pos;

        entity.info = info;
        this.entities.push(entity);
        newly_generated_entities.push(entity);
      });
    }

    return Promise.resolve(newly_generated_entities);
  }

  /** TODO Entity Pool */
  retrive(entity: Game_Entity) {
    const idx = this.entities.indexOf(entity);
    this.entities.splice(idx, 1);
    entity.node.destroy();
  }

  entities_info(): any {
    let entities_info = [];

    for (let entity of this.entities) {
      let info = {
        local_pos: {
          x: entity.info.local_pos.x,
          y: entity.info.local_pos.y,
          z: entity.info.local_pos.z,
        },
        prefab: entity.prefab,
        direction: entity.info.direction,
        poly_type: entity.poly_type,
      };
      entities_info.push(info);
    }
    return entities_info;
  }
}
