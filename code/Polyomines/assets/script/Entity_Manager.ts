import { assert, Game, Vec3 } from 'cc';
import { Const, Pid } from './Const';
import { Debug_Console } from './Debug_Console';
import { Direction, Entity_Type } from './Enums';

import { Entity_Info, Game_Entity } from './Game_Entity';
import { Proximity_Grid, Quad_Tree_Printer } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';


// @hack
function compare(a: Pid, b: Pid): boolean {
    return a.val == b.val;
}


/* NOTE
  - Manage entity pools
  - Get and retrieve entities
  - Move entities
 */
export class Entity_Manager {
    hero: Game_Entity = null;
    proximity_grid: Proximity_Grid;
    entities: Game_Entity[] = [];

    constructor(g: Proximity_Grid) {
        this.proximity_grid = g;
    }

    load_entities(entities_info: any) {
        for (let it of entities_info) {
            let info = new Entity_Info(it);
            const p_name = info.prefab;

            let node = Resource_Manager.instance.load_prefab(p_name);

            assert(node != null, `Fail to load prefab with name: ${p_name}`);

            let entity = node.getComponent(Game_Entity);
            entity.entity_id = Game_Entity.next_id;

            info.world_pos = this.proximity_grid.local2world(info.local_pos);

            entity.info = info;

            this.entities.push(entity);

            if (entity.entity_type == Entity_Type.HERO) {
                this.hero = entity;
            }

            // @hack
            entity.id = new Pid(entity);
            entity.pos = entity.local_pos;
            this.proximity_grid.add_entity(entity);
        }

        // @hack
        // new Quad_Tree_Printer().print(this.proximity_grid.quad_tree);
        let target = this.proximity_grid.point_search(new Vec3(3, 4, 0));
        console.log("==================");
        console.log(target);
    }

    locate(pid: Pid): Game_Entity { // @hack
        for (var e of this.entities) {
            if (compare(e.id, pid)) {
                return e;
            }
        }

        return null;
    }

    // @incomplete
    find(id: number): Game_Entity {
        for (var e of this.entities) {
            if (e.entity_id == id) {
                return e;
            }
        }

        return null;
    }

    reclaim(_entity: Game_Entity) {
        // const entity = this.id2entity.get(_entity.entity_id);
        // this.id2entity.delete(entity.entity_id);
        // entity.node.destroy();
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
                rotation: entity.info.rotation,
            };
            entities_info.push(info);
        }
        return entities_info;
    }

    validate_tiling() {
        const map = new Map<string, boolean>();

        for (let entity of this.entities) {
            for (let pos of entity.occupied_squares()) {
                const pos_str = pos.toString();
                if (map.has(pos_str)) {
                    map.set(pos_str, true);
                } else {
                    map.set(pos_str, false);
                }
            }
        }

        for (let entity of this.entities) {
            let is_valid = true;
            /* FIXME Don't Calcu it twice -> occupied_positions */
            for (let pos of entity.occupied_squares()) {
                if (map.get(pos.toString())) {
                    is_valid = false;
                }
            }

            entity.valid = is_valid;
        }
    }

    locate_entity(target_pos: Vec3): Game_Entity {
        let target: Game_Entity = null;
        for (let entity of this.entities) {
            for (let pos of entity.occupied_squares()) {
                if (pos.equals(target_pos)) {
                    target = entity;
                }
            }
        }
        return target;
    }

    locate_supporter(pos: Vec3): Game_Entity {
        return this.locate_entity(pos.clone().subtract(Vec3.UNIT_Z));
    }

    locate_future_supporters(entity: Game_Entity, dir: Direction) {
        const future_squares = entity.calcu_future_squares(dir);

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
        const squares = entity.occupied_squares();

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
