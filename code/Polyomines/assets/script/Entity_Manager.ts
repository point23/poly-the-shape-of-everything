import { assert, Vec3 } from 'cc';
import { Pid } from './Const';
import { Direction, Entity_Type } from './Enums';
import { calcu_entity_future_squares, Entity_Serializable, Game_Entity, get_entity_squares } from './Game_Entity';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';

// @hack
function compare(a: Pid, b: Pid): boolean {
    return a.val == b.val;
}

/* 
 @note
  - Manage entity pools
  - Get and retrieve entities
  - Move entities
 */
export class Entity_Manager {
    active_hero: Game_Entity = null;
    proximity_grid: Proximity_Grid;
    all_entities: Game_Entity[] = [];

    constructor(g: Proximity_Grid) {
        this.proximity_grid = g;
    }

    load_entities(entities_info: any) {
        for (let info of entities_info) {
            this.load_entity(info);
        }
    }

    load_entity(info: any): Game_Entity {
        const prefab: string = info.prefab;
        const node = Resource_Manager.instance.instantiate_prefab(prefab);
        assert(node != null, `Failed to instantiate prefab: ${prefab}`);

        const entity = node.getComponent(Game_Entity);
        entity.id = new Pid(entity);
        entity.prefab = prefab;
        this.proximity_grid.move_entity(entity, info.position);
        this.proximity_grid.rotate_entity(entity, info.rotation);
        this.proximity_grid.add_entity(entity);
        this.all_entities.push(entity);

        if (entity.entity_type == Entity_Type.HERO) this.active_hero = entity;
        return entity;
    }

    find(pid: Pid): Game_Entity {
        for (var e of this.all_entities) {
            if (compare(e.id, pid)) {
                return e;
            }
        }
        return null;
    }

    reclaim(entity: Game_Entity) {
        const idx = this.all_entities.indexOf(entity);
        this.all_entities.splice(idx, 1);
        entity.node.destroy();
    }

    get_entities_info(): any {
        let entities_info: Entity_Serializable[] = [];
        for (let entity of this.all_entities) {
            // @todo
            // In our own programming language, we should achive that entity
            // can be treat as *target* type and read its metadata at runtime
            entities_info.push(entity.get_serializable());
        }
        return entities_info;
    }

    locate_entity(target: Vec3): Game_Entity {
        const entities = this.proximity_grid.point_search(target);
        for (let e of entities) {
            if (e.position.z == target.z) return e;
        }
        return null;
    }

    locate_supporter(pos: Vec3): Game_Entity {
        return this.locate_entity(new Vec3(pos).subtract(Vec3.UNIT_Z));
    }

    locate_future_supporters(entity: Game_Entity, dir: Direction) {
        const future_squares = calcu_entity_future_squares(entity, dir);

        const supporters = [];
        for (let pos of future_squares) {
            const supporter = this.locate_supporter(pos);
            if (supporter != null) {
                supporters.push(supporter)
            }
        }

        return supporters;
    }

    locate_supportee(pos: Vec3): Game_Entity {
        return this.locate_entity(pos.clone().add(Vec3.UNIT_Z));
    }

    locate_current_supportees(entity: Game_Entity) {
        const squares = get_entity_squares(entity);

        const supportees = [];
        for (let pos of squares) {
            const supportee = this.locate_supportee(pos);
            if (supportee != null && supportee.entity_type != Entity_Type.STATIC) {
                supportees.push(supportee)
            }
        }

        return supportees;
    }
}