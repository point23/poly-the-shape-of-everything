import { assert, Vec3 } from 'cc';
import { $$, Direction } from './Const';
import {
    Serializable_Entity_Data,
    Game_Entity,
    Undoable_Entity_Data,
    calcu_entity_future_squares,
    Entity_Type,
    get_entity_squares,
    get_serializable,
    clone_undoable_data
} from './Game_Entity';
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
    #serial_idx = 1;
    get #next_id(): number { return this.#serial_idx++ };

    static current: Entity_Manager = null;

    // HERO STUFF
    get active_hero(): Game_Entity {
        return this.heros[this.active_hero_idx];
    };

    active_hero_idx: number = 0;
    heros: Game_Entity[] = [];
    get num_heros(): number { return this.heros.length; }
    switch_hero() {
        const idx = this.active_hero_idx;
        this.active_hero_idx = (idx + 1) % this.num_heros;
        // VFX?
    }

    proximity_grid: Proximity_Grid = null;
    undo_handler: Undo_Handler = null;
    all_entities: Game_Entity[] = [];
    checkpoints: Game_Entity[] = [];

    rovers: Game_Entity[] = [];
    switches: Game_Entity[] = [];
    hints: Game_Entity[] = [];

    get pending_win(): boolean {
        function hero_stands_on_it(checkpoint: Game_Entity, manager: Entity_Manager) {
            for (let e of manager.locate_current_supportees(checkpoint)) {
                if (e.entity_type == Entity_Type.HERO) return true;
            }
        }
        //#SCOPE

        for (let c of this.checkpoints) {
            if (hero_stands_on_it(c, this)) continue;
            return false;
        }
        return true;
    }

    get switch_turned_on(): boolean {
        if (this.switches.length == 0) return false;
        function gem_on_top(s: Game_Entity, manager: Entity_Manager) {
            for (let e of manager.locate_current_supportees(s)) {
                if (e.entity_type == Entity_Type.GEM) return true;
            }
        }
        //#SCOPE

        for (let s of this.switches) {
            if (gem_on_top(s, this)) continue;
            return false;
        }
        return true;
    }

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
            entity.id = this.#next_id;
        else
            entity.id = id;

        entity.undoable = new Undoable_Entity_Data();
        this.rotate_entity(entity, info.rotation);

        if (entity.entity_type == Entity_Type.HINT) {
            this.hints.push(entity);
            if (!$$.HINTS_EDITABLE) {
                this.proximity_grid.move_entity(entity, new Vec3(info.position));
                entity.node.active = false;
                return entity;
            }
        }

        this.move_entity(entity, new Vec3(info.position));
        this.all_entities.push(entity);

        const clone = clone_undoable_data(entity);
        this.undo_handler.old_entity_state.set(entity.id, clone);

        // @note Handle entities with special types
        if (entity.entity_type == Entity_Type.CHECKPOINT) this.checkpoints.push(entity);
        if (entity.entity_type == Entity_Type.HERO) {
            this.heros.push(entity);
        }

        if (entity.entity_type == Entity_Type.ROVER) this.rovers.push(entity);
        if (entity.entity_type == Entity_Type.SWITCH) this.switches.push(entity)

        debug_print_quad_tree(this.proximity_grid.quad_tree);
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

        this.undo_handler.old_entity_state.delete(e.id);
        this.proximity_grid.remove_entity(e);
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

        if (!$$.HINTS_EDITABLE) {
            for (let e of this.hints) {
                entities_info.push(get_serializable(e));
            }
        }

        return entities_info;
    }

    locate_entities(pos: Vec3): Game_Entity[] {
        return this.proximity_grid.point_search(pos);
    }

    locate_supporters(pos: Vec3, depth: number = 1): Game_Entity[] {
        return this.locate_entities(new Vec3(pos).subtract(new Vec3(0, 0, depth)));
    }

    locate_supportees(pos: Vec3): Game_Entity[] {
        return this.locate_entities(pos.clone().add(Vec3.UNIT_Z));
    }

    locate_current_supporters(entity: Game_Entity): Game_Entity[] {
        const supporters = [];
        for (let pos of get_entity_squares(entity)) {
            for (let supporter of this.locate_supporters(pos))
                if (supporter != null) {
                    supporters.push(supporter)
                }
        }
        return supporters;
    }

    locate_future_supporters(entity: Game_Entity, dir: Direction, max_depth: number = 1): Game_Entity[] {
        const squares = calcu_entity_future_squares(entity, dir);

        const supporters = [];
        for (let d = 1; d <= max_depth; d++) {
            for (let pos of squares) {
                for (let supporter of this.locate_supporters(pos, d))
                    if (supporter != null) {
                        supporters.push(supporter)
                    }
            }

            if (supporters.length != 0) return supporters;
        }

        return supporters;
    }

    locate_current_supportees(entity: Game_Entity): Game_Entity[] {
        const squares = get_entity_squares(entity);

        const supportees = [];
        for (let pos of squares) {
            for (let supportee of this.locate_supportees(pos))
                if (supportee != null && supportee.entity_type != Entity_Type.STATIC) {
                    supportees.push(supportee)
                }
        }

        return supportees;
    }
}