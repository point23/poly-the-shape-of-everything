import { assert, Vec3 } from 'cc';
import { $$, Const, Direction, String_Builder } from './Const';
import { Efx_Manager } from './Efx_Manager';
import {
    Serializable_Entity_Data,
    Game_Entity,
    Undoable_Entity_Data,
    calcu_entity_future_squares,
    Entity_Type,
    get_entity_squares,
    get_serializable,
    clone_undoable_data,
    set_entrance_id as set_entrance_idx,
    get_entrance_id as get_entrance_idx,
    set_tram_info
} from './Game_Entity';
import { debug_print_quad_tree, Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { is_a_board_like_entity } from './sokoban';
import { Undo_Handler } from './undo';
import { animate } from './Character_Data';

/* 
 @Note
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
    get num_heros(): number { return this.heros.length; }
    switch_hero(i: number = -1) {
        let switched: boolean = true;
        let idx = this.active_hero_idx;
        if (i != -1) {
            switched = i != idx;
            idx = i;
        } else {
            idx = (idx + 1) % this.num_heros;
        }

        if (switched) {
            animate(this.active_hero, "inactivate");
            this.active_hero_idx = idx;
            animate(this.active_hero, "activate");
            Efx_Manager.instance.switch_hero_efx(this.active_hero)
        }
    }

    proximity_grid: Proximity_Grid = null;
    undo_handler: Undo_Handler = null;
    all_entities: Game_Entity[] = [];

    get moving_entities(): Game_Entity[] { // @Hack
        const res = []
        for (let e of this.all_entities) {
            if (!e.interpolation) continue;

            res.push(e);
        }
        return res;
    }

    // @Todo Replace it with ".by_type.Hero" ...
    heros: Game_Entity[] = [];
    trams: Game_Entity[] = [];
    switches: Game_Entity[] = [];
    hints: Game_Entity[] = [];
    entrances: Game_Entity[] = [];
    checkpoints: Game_Entity[] = [];

    get entering_other_level(): { entering: boolean, idx: number } {
        let res = {
            entering: false,
            idx: 0,
        };

        for (let s of this.locate_current_supporters(this.active_hero)) {
            if (s.entity_type == Entity_Type.ENTRANCE) {
                res.entering = true;
                res.idx = get_entrance_idx(s);
            }
        }

        return res;
    }

    get pending_win(): boolean {
        function hero_stands_on_it(entity: Game_Entity, manager: Entity_Manager) {
            for (let other of manager.locate_current_supportees(entity)) {
                if (other.entity_type == Entity_Type.HERO) return true;
            }
        }

        function dynamic_stands_on_it(checkpoint: Game_Entity, manager: Entity_Manager) {
            for (let e of manager.locate_current_supportees(checkpoint)) {
                if (e.entity_type == Entity_Type.DYNAMIC) return true;
            }
        }
        //#SCOPE

        if (this.checkpoints.length == 0) return false;

        for (let c of this.checkpoints) {
            if (c.prefab == 'Checkpoint#001') {
                if (hero_stands_on_it(c, this)) continue;
            } else if (c.prefab == 'Checkpoint#002') {
                if (dynamic_stands_on_it(c, this)) continue;
            }
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

        // @Note Handle entities with special types
        if (entity.entity_type == Entity_Type.CHECKPOINT) this.checkpoints.push(entity);
        if (entity.entity_type == Entity_Type.HERO) {
            this.heros.push(entity);
        }

        if (entity.entity_type == Entity_Type.TRAM) {
            this.trams.push(entity);
            if (entity.prefab == 'Rover#001') { // @Hack We had already rename it as tram.
                set_tram_info(entity, { freq: Const.SLOW_TRAM_FREQ, counter: 0, })
            } else {
                set_tram_info(entity, { freq: Const.SPEED_TRAM_FREQ, counter: 0, })
            }
        }

        if (entity.entity_type == Entity_Type.SWITCH) this.switches.push(entity);

        if (entity.entity_type == Entity_Type.ENTRANCE) {
            this.entrances.push(entity);
            if (info.derived_data != undefined && info.derived_data != null) {
                set_entrance_idx(entity, Resource_Manager.instance.level_id_to_idx.get(info.derived_data.level_id));
            }
        }

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

    logically_move_entity(e: Game_Entity, p: Vec3) {
        if (this.find(e.id)) {
            this.proximity_grid.remove_entity(e);
        }
        // console.log(`=== entity: ${e.id}, p: ${p} ===`);

        e.undoable.position = p;
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

    reclaim(e: Game_Entity) { // @Optimize Object Pool?
        const idx = this.all_entities.indexOf(e);
        this.all_entities.splice(idx, 1);

        this.undo_handler.old_entity_state.delete(e.id);
        this.proximity_grid.remove_entity(e);
        e.node.destroy();
    }

    debug_log_target_entities(ids: number[]): string {
        const builder = new String_Builder();
        for (let id of ids) {
            builder.append(` ${id}: `).append(this.find(id)?.position).append('\n');
        }
        return builder.to_string();
    }

    get_entities_info(): any {
        let entities_info: Serializable_Entity_Data[] = [];
        for (let e of this.all_entities) {
            // @Todo
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

    locate_availble_supporters(pos: Vec3, depth: number = 1): Game_Entity[] { // @V 1
        const res = [];
        for (let e of this.locate_entities(new Vec3(pos).subtract(new Vec3(0, 0, depth)))) {
            if (e.entity_type == Entity_Type.FENCE) continue;
            res.push(e);
        }
        return res;
    }

    locate_supporters(pos: Vec3, depth: number = 1): Game_Entity[] {
        return this.locate_entities(new Vec3(pos).subtract(new Vec3(0, 0, depth)));
    }

    locate_current_available_supporters(entity: Game_Entity): Game_Entity[] { // @V 1
        const res = [];
        for (let e of this.locate_current_supporters(entity)) {
            if (e.entity_type == Entity_Type.FENCE) continue;
            res.push(e);
        }
        return res;
    }

    locate_current_supporters(entity: Game_Entity): Game_Entity[] {
        const supporters = [];
        const set = new Set();
        if (is_a_board_like_entity(entity)) {
            // @Note A Board mush have at least one non board supporter!!!
            // supporting stack be like: [DYNAMIC_b, TRACK]
            //    === === ← BRIDGE
            //   |   |///|
            //   |___|___| ← DYNAMIC_b
            //   |   |
            //   |___| ← DYNAMIC_a
            //  Supporter of BRIDGE is DYNAMIC_b

            for (let pos of get_entity_squares(entity)) {
                for (let supporter of this.locate_entities(pos)) {
                    if (supporter.id == entity.id) continue;
                    if (supporter == null) continue;
                    if (set.has(supporter.id)) continue;

                    supporters.push(supporter)
                    set.add(supporter.id);
                }
            }
        } else {
            // @Note Boards as 1 level supporter
            //  support stack be like: [DYNMIC_a, TRACK, DYNMIC_b]
            //    DYNAMIC_b
            //   |_↓_|
            //   |///|
            //    ===  ← TRACK
            //   |   |
            //   |___| ← DYNAMIC_a

            for (let pos of get_entity_squares(entity)) {
                let board_as_supporter = false;
                for (let supporter of this.locate_supporters(pos)) {
                    if (supporter == null) continue;
                    if (set.has(supporter.id)) continue;

                    if (is_a_board_like_entity(supporter)) {
                        board_as_supporter = true;
                    }
                }

                for (let supporter of this.locate_supporters(pos)) {
                    if (supporter == null) continue;
                    if (set.has(supporter.id)) continue;

                    if (board_as_supporter) {
                        if (is_a_board_like_entity(supporter)) {
                            supporters.push(supporter)
                            set.add(supporter.id);
                        } else {
                            // Then this non-board entity is  the supporter of that board
                        }
                    } else {
                        supporters.push(supporter)
                        set.add(supporter.id);
                    }
                }
            }
        }

        return supporters;
    }

    locate_future_available_supporters(entity: Game_Entity, dir: Direction, max_depth: number = 1): Game_Entity[] { // @V 1
        const res = [];
        for (let e of this.locate_future_supporters(entity, dir, max_depth)) {
            if (e.entity_type == Entity_Type.FENCE) continue;
            res.push(e);
        }
        return res;
    }

    locate_future_supporters(entity: Game_Entity, dir: Direction, max_depth: number = 1): Game_Entity[] {
        // @Note Special case: Boards will never showup in a falling move.
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

    locate_supportees(pos: Vec3): Game_Entity[] {
        return this.locate_entities(pos.clone().add(Vec3.UNIT_Z));
    }

    locate_current_supportees(entity: Game_Entity): Game_Entity[] {
        // @Note Boards as 1 level supportee
        // Supporting stack be like: [DYNMIC_a, TRACK, DYNMIC_b]
        //    DYNAMIC_b
        //     ↓  
        //   |   |
        //    ===  ← TRACK
        //   |///|
        //   |___| ← DYNAMIC_a

        const squares = get_entity_squares(entity);
        const set = new Set();
        const supportees = [];

        for (let pos of squares) {
            let exist_one_board = false;

            if (!is_a_board_like_entity(entity)) {
                for (let other of this.locate_entities(pos)) {
                    // @Note Boards are located at the same square as their supportors

                    if (other.id == entity.id) continue;
                    if (is_a_board_like_entity(other)) {
                        if (set.has(other.id)) continue;

                        exist_one_board = true
                        set.add(other.id);
                        supportees.push(other);
                    }
                }
            }

            if (!exist_one_board) {
                for (let supportee of this.locate_supportees(pos)) {
                    if (supportee != null && supportee.entity_type != Entity_Type.STATIC) {
                        if (set.has(supportee.id)) continue;

                        set.add(supportee.id);
                        supportees.push(supportee);
                    }
                }
            }
        }

        return supportees;
    }
}