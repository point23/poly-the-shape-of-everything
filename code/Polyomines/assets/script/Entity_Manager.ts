import {_decorator, CCString, Component, instantiate, Node, Prefab, profiler, Quat, Vec2, Vec3} from 'cc';

import {Entity_Info, Entity_Type, Game_Entity} from './entities/Game_Entity_Base';
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
  - Detect conflicts between moves
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

  string2prefab: Map<String, Prefab> = new Map<String, Prefab>();
  game_board: Game_Board;
  string2entity: Map<number, Game_Entity> = new Map<number, Game_Entity>();

  /* TODO Rename it... */
  current_character: Game_Entity = null;

  get entities_iterator(): IterableIterator<Game_Entity> {
    return this.string2entity.values();
  }

  mapping_prefabs() {
    for (let pair of this.list_entities_prefab) {
      this.string2prefab[pair.id] = pair.prefab;
    }
  }

  async load_entities(entities_info: any[]): Promise<Game_Entity[]> {
    let newly_generated_entities: Game_Entity[] = [];

    for (let i = 0; i < entities_info.length; i++) {
      let info = new Entity_Info(entities_info[i]);
      let node: Node = instantiate(this.string2prefab[info.prefab]);
      node.setParent(this.entities_parent_node);

      let entity = node.getComponent(Game_Entity);
      entity.entity_id = Game_Entity.next_id;

      await this.game_board.local2world(info.local_pos).then((world_pos) => {
        info.world_pos = world_pos;

        entity.info = info;
        this.string2entity.set(entity.entity_id, entity);
        newly_generated_entities.push(entity);

        if (entity.entity_type == Entity_Type.CHARACTER) {
          this.current_character = entity;
        }
      });
    }

    return Promise.resolve(newly_generated_entities);
  }

  /** TODO Entity Pool */
  reclaim(_entity: Game_Entity) {
    const entity = this.string2entity.get(_entity.entity_id);
    this.string2entity.delete(entity.entity_id);
    entity.node.destroy();
  }

  entities_info(): any {
    let entities_info = [];

    for (let entity of this.entities_iterator) {
      let info = {
        local_pos: {
          x: entity.info.local_pos.x,
          y: entity.info.local_pos.y,
          z: entity.info.local_pos.z,
        },
        prefab: entity.prefab,
        direction: entity.info.direction,
      };
      entities_info.push(info);
    }
    return entities_info;
  }

  validate_tiling() {
    const map = new Map<string, boolean>();

    for (let entity of this.entities_iterator) {
      for (let pos of entity.occupied_positions) {
        const pos_str = pos.toString();
        if (map.has(pos_str)) {
          map.set(pos_str, true);
        } else {
          map.set(pos_str, false);
        }
      }
    }

    for (let entity of this.entities_iterator) {
      let is_valid = true;
      /* FIXME Don't Calcu it twice -> occupied_positions */
      for (let pos of entity.occupied_positions) {
        if (map.get(pos.toString())) {
          is_valid = false;
        }
      }

      entity.valid = is_valid;
    }
  }
}
