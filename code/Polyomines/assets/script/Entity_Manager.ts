import {_decorator, CCString, Component, instantiate, Node, Prefab, profiler, Quat, Vec2, Vec3} from 'cc';

import {Game_Entity} from './entities/Game_Entity_Base';
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

  async load_entities(entities_info): Promise<Game_Entity[]> {
    let newly_generated_entities: Game_Entity[] = [];

    for (let entitie_info of entities_info) {
      const prefab_id = entitie_info.prefab_id;
      const pos_info = entitie_info.position;
      const rot_info = entitie_info.rotation;
      const local_pos: Vec3 = new Vec3(pos_info.x, pos_info.y, pos_info.z);
      const rotation: Quat =
          new Quat(rot_info.x, rot_info.y, rot_info.z, rot_info.w);

      let node: Node = instantiate(this.entity_prefab_map[prefab_id]);
      node.setParent(this.entities_parent_node);

      let entity = node.getComponent(Game_Entity);

      await this.game_board.local2world(local_pos).then((world_pos) => {
        entity.init(world_pos, rotation, local_pos, prefab_id);

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
        position: {
          x: entity.local_pos.x,
          y: entity.local_pos.y,
          z: entity.local_pos.z
        },
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
