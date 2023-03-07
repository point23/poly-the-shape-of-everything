import { assert, Vec3 } from 'cc';
import { Serializable_Entity_Data, Game_Entity, Undoable_Entity_Data, calcu_entity_future_squares, Direction, Entity_Type, get_entity_squares, get_serializable } from './Game_Entity';
import { debug_print_quad_tree, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { Undo_Handler } from './undo';

/* 
 @note
  - Manage entity pools
  - Get and retrieve entities
  - Move entities
 */
export class Entity_Manager {
    active_hero: Game_Entity = null;
    proximity_grid: Proximity_Grid;
    undo_handler: Undo_Handler;
    all_entities: Game_Entity[] = [];

    constructor(g: Proximity_Grid) {
        this.proximity_grid = g;
    }

    load_entities(entities_info: any) {
        for (let info of entities_info) {
            this.load_entity(info);
        }
    }

    load_entity(info: any, id: number = null): Game_Entity {
        const prefab: string = info.prefab;
        const node = Resource_Manager.instance.instantiate_prefab(prefab);
        assert(node != null, `Failed to instantiate prefab: ${prefab}`);

        const entity = node.getComponent(Game_Entity);
        entity.prefab = prefab;
        if (id == null)
            entity.id = Game_Entity.next_id;
        else
            entity.id = id;

        entity.undoable = new Undoable_Entity_Data();
        this.rotate_entity(entity, info.rotation);
        this.move_entity(entity, new Vec3(info.position));

        this.all_entities.push(entity);

        if (entity.entity_type == Entity_Type.HERO) this.active_hero = entity;

        // debug_print_quad_tree(this.proximity_grid.quad_tree);
        return entity;
    }

    move_entity(e: Game_Entity, p: Vec3) {
        if (this.find(e.id)) {
            this.proximity_grid.remove_entity(e);
        }

        e.undoable.position = p;
        this.proximity_grid.move_entity(e, p);
        this.proximity_grid.add_entity(e);
    }

    rotate_entity(e: Game_Entity, d: Direction) {
        e.undoable.rotation = d;
        e.undoable.orientation = d;

        e.face_towards(d);
    }

    find(id: number): Game_Entity {
        for (var e of this.all_entities) {
            if (e.id == id) return e;
        }
        return null;
    }

    reclaim(e: Game_Entity) {
        const idx = this.all_entities.indexOf(e);
        this.all_entities.splice(idx, 1);

        this.undo_handler.old_entity_state.delete(`${e.id}`);
        e.node.destroy();
    }

    get_entities_info(): any {
        let entities_info: Serializable_Entity_Data[] = [];
        for (let e of this.all_entities) {
            // @todo
            // In our own programming language, we should achive that entity
            // can be treat as *target* type and read its metadata at runtime
            entities_info.push(get_serializable(e));
        }
        return entities_info;
    }

    locate_entity(target: Vec3): Game_Entity {
        return this.proximity_grid.point_search(target);
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