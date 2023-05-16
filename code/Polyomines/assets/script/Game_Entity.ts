import { _decorator, Component, Enum, MeshRenderer, Vec3, Vec4, Quat, ShadowFlow } from 'cc';
import { Const, Direction, String_Builder, vec_add } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Polygon_Entity } from './Polygon_Entity';
import { Resource_Manager } from './Resource_Manager';
import { Visual_Interpolation } from './interpolation';

const { ccclass, property } = _decorator;

type vec3_t = {
    x: number;
    y: number;
    z: number;
};

export enum Entity_Flags {
    INVALID = 1 << 0,
    SELECT = 1 << 1,
    DEAD = 1 << 3,
    FALLING = 1 << 4,
    IN_CONTROL = 1 << 5,
}

export function same_direction(d1: Direction, d2: Direction) {
    return d1 == d2;
}

export function clacu_reversed_direction(d: Direction): Direction {
    for (let i = 0; i < 6; i++) {
        if (reversed_direction(i, d)) return i;
    }
    return 0;
}

export function collinear_direction(d1: Direction, d2: Direction) {
    return same_direction(d1, d2) || reversed_direction(d1, d2);
}

export function orthogonal_direction(d1: Direction, d2: Direction): boolean {
    return !collinear_direction(d1, d2);
}

export function reversed_direction(d1: Direction, d2: Direction): boolean {
    if (same_direction(d1, d2)) return false;
    // @Note We can't use /2 here, cause they're float numbers
    return ((d1 >> 1) == (d2 >> 1));
}

export function calcu_target_direction(d: Direction, delta: number): Direction {
    return (d + delta + 4) % 4; // @Fixme WRONG!!!!!!!
}

export enum Entity_Type {
    // @Note There're actually 2 kinds of derived data
    //      - Rover, Checkpoint: 
    //          There derived types are limited: Speed/Slow Rover, Hero/Dynamic Checkpoint
    //      - Artifact, Hero, Avatar
    //          Their derived types are unlimited: Hero -> Each of the character with totally different ability.

    STATIC,// It means we're not avaliale to  push them
    DYNAMIC,
    HERO, // @Incomplete
    // There're ganna be many possible characters for player to chose
    // The relationship between "derived" part and game entity seems like
    // a Composite Pattern? 
    AVATAR, // @Incomplete 
    // Kinda like cappee in Super Mario: Odyssey
    // Different avatars can have different powers, like chained warms? owls? bats?
    CHECKPOINT, // Possible win? But in a multiple character level, the winning condition
    // is that each of them are stands on a checkpoint entity.
    HINT,
    BRIDGE,
    GATE,
    FENCE,
    TRAM,
    // There are Speed Rover and Slow Rover, with different speed to generate rover moves...
    TRACK,
    SWITCH,
    GEM,
    ENTRANCE,
    MONSTER,
    LOCK,
}

export enum Polyomino_Type {
    /* Monomino:
       _ _ _
      |     |
      |  o  |
      |_ _ _|
     */
    MONOMINO,
    /* Domino:
       _ _ _ _ _ _
      |     |     |
      |  o  |     |
      |_ _ _|_ _ _|
     */
    DOMINO,
    /* Straight-Tromino:
       _ _ _ _ _ _ _ _ _
      |     |     |     |
      |     |  o  |     |
      |_ _ _|_ _ _|_ _ _|
     */
    STRAIGHT_TROMINO,
    /* L-Tromino:
       _ _ _
      |     |
      |     |
      |_ _ _|_ _ _
      |     |     |
      |  o  |     |
      |_ _ _|_ _ _|
     */
    L_TROMINO,
}

export class Serializable_Entity_Data {
    prefab: string = null;
    position: Vec3 = null;
    rotation: Direction = null;

    constructor(prefab: string, position: Vec3 = new Vec3(), rotation: Direction = 0) {
        this.prefab = prefab;
        this.position = position;
        this.rotation = rotation;
    }
}

// @Incomplete
/* 
    Memory:
    S32 [
        0: x,
        1: y,
        2: z,
        3: orientation,
        4: rotation,
        5: flags,
        
        6: Customized_Slot_0_0
        7: Customized_Slot_0_1
        8: Customized_Slot_0_2
        9: Customized_Slot_0_3
        ...
    ]
*/

export class Undoable_Entity_Data {
    static default: Undoable_Entity_Data = new Undoable_Entity_Data();

    constructor(public memory: Int32Array = new Int32Array(10)) { }

    get position(): Vec3 {
        return new Vec3(this.memory[0], this.memory[1], this.memory[2]);
    }

    set position(p: vec3_t) {
        this.memory[0] = p.x;
        this.memory[1] = p.y;
        this.memory[2] = p.z;
    }

    get orientation(): Direction { return this.memory[3]; }
    set orientation(d: number) { this.memory[3] = d % 6; }

    get rotation(): Direction { return this.memory[4]; }
    set rotation(d: number) { this.memory[4] = d % 6; }

    get flags(): number { return this.memory[5]; }
    set flags(f: number) { this.memory[5] = f; }

    get customized_slot_0(): Vec4 {
        return new Vec4(this.memory[6], this.memory[7], this.memory[8], this.memory[9]);
    }

    set customized_slot_0(v: Vec4) {
        this.memory[6] = v.x;
        this.memory[7] = v.y;
        this.memory[8] = v.z;
        this.memory[9] = v.w;
    }
};

@ccclass('Game_Entity')
export class Game_Entity extends Component {
    id: number;
    undoable: Undoable_Entity_Data;
    scheduled_for_destruction: boolean = false;
    prefab: string = "";

    derived_data: any = {};
    interpolation: Visual_Interpolation = null;

    get position(): Vec3 { return this.undoable.position };
    get rotation(): Direction { return this.undoable.rotation };
    get orientation(): Direction { return this.undoable.orientation; };
    get flags(): number { return this.undoable.flags; }

    #visual_position = new Vec3();
    get visual_position(): Vec3 {
        this.node.getWorldPosition(this.#visual_position);
        return this.#visual_position;
    }

    #visual_rotation = new Quat();
    get visual_rotation(): Quat {
        this.node.getWorldRotation(this.#visual_rotation);
        return this.#visual_rotation;
    }


    @property(MeshRenderer) editing_cover: MeshRenderer = null;
    @property(Polygon_Entity) body: Polygon_Entity = null;
    @property(Polygon_Entity) indicator: Polygon_Entity = null;
    @property({ type: Enum(Polyomino_Type) }) polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;
    @property({ type: Enum(Entity_Type) }) entity_type: Entity_Type = Entity_Type.STATIC;

    get is_valid(): boolean { return (this.flags & Entity_Flags.INVALID) == 0; }
    get is_selected(): boolean { return (this.flags & Entity_Flags.SELECT) != 0; }
    get is_falling(): boolean { return (this.flags & Entity_Flags.FALLING) != 0; }
    get is_in_control(): boolean { return (this.flags & Entity_Flags.IN_CONTROL) != 0; }
    get is_dead(): boolean { return (this.flags & Entity_Flags.DEAD) != 0; }

    visually_move_to(world_pos: Vec3) {
        this.node.setPosition(world_pos);
    }

    visually_face_towards(dir: Direction) {
        this.body.rotate_to(Const.DIRECTION2QUAT[dir]);
    }

    visually_rotate_to(quat: Quat) {
        this.body.rotate_to(quat);
    }

    face_towards(dir: Direction) {
        this.visually_face_towards(dir);
        if (this.entity_type != Entity_Type.STATIC) {
            this.logically_rotate_to(dir);
        }
    }

    logically_rotate_to(dir: Direction) {
        this.undoable.orientation = dir;
        this.indicator.rotate_to(Const.DIRECTION2QUAT[dir]);
    }
}

export function is_dervied(t: number): boolean {
    return t == Entity_Type.ENTRANCE || false;
}

export function get_serializable(e: Game_Entity): any {
    const res: any = {
        prefab: e.prefab,
        position: e.position,
        rotation: e.rotation,
    };

    if (e.entity_type == Entity_Type.ENTRANCE) {
        res.derived_data = {
            level_id: Resource_Manager.instance.level_idx_to_id.get(get_entrance_id(e)),
        }
    }

    return res;
}

export function get_serialized_data(e: Game_Entity): string {
    const builder = new String_Builder();
    builder.append(e.prefab);
    builder.append(e.position.x);
    builder.append(e.position.y);
    builder.append(e.position.z);
    builder.append(e.rotation);
    return builder.to_string(' ');
}

export function clone_undoable_data(e: Game_Entity): Undoable_Entity_Data {
    const memory = e.undoable.memory;
    let clone = new Undoable_Entity_Data();
    for (let i = 0; i < memory.length; i++) {
        clone.memory[i] = memory[i];
    }
    return clone;
}

export function copy_undoable_data(s: Undoable_Entity_Data, d: Undoable_Entity_Data) {
    const memory = s.memory;
    for (let i = 0; i < memory.length; i++) {
        d.memory[i] = memory[i];
    }
}

export function note_entity_is_falling(e: Game_Entity) {
    if (!e.is_falling) {
        e.undoable.flags |= Entity_Flags.FALLING;
    }
}

export function note_entity_is_not_falling(e: Game_Entity) {
    if (e.is_falling) {
        e.undoable.flags -= Entity_Flags.FALLING;
    }
}

export function note_entity_is_invalid(e: Game_Entity) {
    if (e.is_valid) {
        e.undoable.flags |= Entity_Flags.INVALID;
    }
    const mat = e.editing_cover.material;
    mat.setProperty('mainColor', Const.Cover_Invalid_Color);
}

export function note_entity_is_valid(e: Game_Entity) {
    if (!e.is_valid) {
        e.undoable.flags -= Entity_Flags.INVALID;
    }
    const mat = e.editing_cover.material;
    const color = e.is_selected ? Const.Cover_Selected_Color : Const.Cover_Normal_Color;
    mat.setProperty('mainColor', color);
}

export function note_entity_is_selected(e: Game_Entity) {
    if (!e.is_selected) {
        e.undoable.flags |= Entity_Flags.SELECT;
    }
    const mat = e.editing_cover.material;
    mat.setProperty('mainColor', Const.Cover_Selected_Color);
}

export function note_entity_is_deselected(e: Game_Entity) {
    if (e.is_selected) {
        e.undoable.flags -= Entity_Flags.SELECT;
    }
    const mat = e.editing_cover.material;
    const color = e.is_valid ? Const.Cover_Normal_Color : Const.Cover_Invalid_Color;
    mat.setProperty('mainColor', color);
}

export function note_entity_is_in_control(e: Game_Entity) {
    if (!e.is_in_control) {
        e.undoable.flags |= Entity_Flags.IN_CONTROL;
    }
}

export function note_entity_is_not_in_control(e: Game_Entity) {
    if (e.is_in_control) {
        e.undoable.flags -= Entity_Flags.IN_CONTROL;
    }
}

export function note_entity_is_dead(e: Game_Entity) {
    if (!e.is_dead) {
        e.undoable.flags |= Entity_Flags.DEAD;
    }
}

export function note_entity_is_revive(e: Game_Entity) {
    if (e.is_dead) {
        e.undoable.flags -= Entity_Flags.DEAD;
    }
}

// === Derived Class ===
// @Todo Maybe we should just simply have some derived class ...
export function get_entrance_id(e: Game_Entity): number {
    if (e.entity_type != Entity_Type.ENTRANCE) return;
    return e.undoable.customized_slot_0.x;
}

export function set_entrance_id(e: Game_Entity, entrance_id: number) {
    if (e.entity_type != Entity_Type.ENTRANCE) return;
    const slot = new Vec4(); // @Optimize
    slot.x = entrance_id;
    e.undoable.customized_slot_0 = slot;
}

export type tram_info = {
    freq: number,
    counter: number,
}

export function get_tram_info(e: Game_Entity): tram_info {
    if (e.entity_type != Entity_Type.TRAM) return;

    return {
        freq: e.undoable.customized_slot_0.x,
        counter: e.undoable.customized_slot_0.y,
    }
}

export function set_tram_info(e: Game_Entity, i: tram_info) {
    if (e.entity_type != Entity_Type.TRAM) return;

    const slot = new Vec4(); // @Optimize
    slot.x = i.freq;
    slot.y = i.counter;
    e.undoable.customized_slot_0 = slot;
}

export type hero_info = {
    is_active: boolean;
}

export function set_hero_info(e: Game_Entity, i: hero_info) {
    if (e.entity_type != Entity_Type.HERO) return;

    const slot = new Vec4(); // @Optimize
    if (i.is_active) {
        slot.x = 1;
    } else {
        // ...
    }
    e.undoable.customized_slot_0 = slot;
}

export function get_hero_info(e: Game_Entity): hero_info {
    if (e.entity_type != Entity_Type.HERO) return;

    return {  // @Optimize
        is_active: e.undoable.customized_slot_0.x == 1,
    }
}

export type monster_info = {
    is_active,
};

export function set_monster_info(e: Game_Entity, i: hero_info) {
    if (e.entity_type != Entity_Type.MONSTER) return;

    const slot = new Vec4(); // @Optimize
    if (i.is_active) {
        slot.x = 1;
    } else {
        // ...
    }
    e.undoable.customized_slot_0 = slot;
}

export function get_monster_info(e: Game_Entity): hero_info {
    if (e.entity_type != Entity_Type.MONSTER) return;

    return {  // @Optimize
        is_active: e.undoable.customized_slot_0.x == 1,
    }
}


// === Calculation === 
// @Todo Support more types of entity
const polyomino_deltas: Vec3[][][] = [
    /* Monomino */
    [],
    /* Domino */
    [
        /* LEFT */[new Vec3(-1, 0, 0)],
        /* RIGHT */[new Vec3(1, 0, 0)],
        /* FORWARD */[new Vec3(0, -1, 0)],
        /* BACKWARD */[new Vec3(0, 1, 0)],
        /* UP */[new Vec3(0, 0, 1)],
        /* DOWN */[new Vec3(0, 0, -1)],
    ],
    /* STRAIGHT_TROMINO */
    [
            /* LEFT */[new Vec3(-1, 0, 0), new Vec3(1, 0, 0)],
            /* RIGHT */[new Vec3(-1, 0, 0), new Vec3(1, 0, 0)],
            /* FORWARD */[new Vec3(0, 1, 0), new Vec3(0, -1, 0)],
            /* BACKWORD */[new Vec3(0, 1, 0), new Vec3(0, -1, 0)],
            /* UP */[new Vec3(0, 0, 1)], // @ImplementMe
            /* DOWN */[new Vec3(0, 0, -1)], // @ImplementMe
    ],
];

// Y -> X
// Z -> Y
// X -> Z
export const DIRECTION_TO_LOGIC_VEC3: Vec3[] = [
    /* LEFT */ new Vec3(-1, 0, 0),
    /* RIGHT */ new Vec3(1, 0, 0),

    /* FORWARD */ new Vec3(0, -1, 0),
    /* BACKWARD */ new Vec3(0, 1, 0),

    /* UP */ new Vec3(0, 0, 1),
    /* DOWN */ new Vec3(0, 0, -1),
];

export const DIRECTION_TO_WORLD_VEC3: Vec3[] = [
    new Vec3(0, 0, -1),
    new Vec3(0, 0, 1),

    new Vec3(-1, 0, 0),
    new Vec3(1, 0, 0),

    new Vec3(0, 1, 0),
    new Vec3(0, -1, 0),
];

export function get_entity_squares(e: Game_Entity): Vec3[] {
    let squares: Vec3[] = [];
    squares.push(new Vec3(e.position));
    if (e.polyomino_type == Polyomino_Type.MONOMINO) return squares;

    for (let delta of polyomino_deltas[e.polyomino_type][e.rotation]) {
        let o = new Vec3(e.position);
        o.add(delta);
        squares.push(o);
    }

    return squares;
}

export function locate_entities_in_target_direction(m: Entity_Manager, e: Game_Entity, d: Direction, step: number = 1): Game_Entity[] {
    const future_squares = calcu_entity_future_squares(e, d, step);
    let result = [];
    for (let pos of future_squares) {
        for (let other of m.locate_entities(pos)) {
            result.push(other);
        }
    }
    return result;
}

export function calcu_entity_future_position(e: Game_Entity, dir: Direction, step: number = 1): Vec3 {
    return vec_add(e.position, new Vec3(DIRECTION_TO_LOGIC_VEC3[dir]).multiplyScalar(step));
}

export function calcu_end_position(p: Vec3, dir: Direction, step: number = 1): Vec3 {
    return vec_add(p, new Vec3(DIRECTION_TO_LOGIC_VEC3[dir]).multiplyScalar(step));
}

export function calcu_entity_future_squares(e: Game_Entity, dir: Direction, step: number = 1): Vec3[] {
    const future_pos = calcu_entity_future_position(e, dir, step);
    let squares = [future_pos];

    if (e.polyomino_type == Polyomino_Type.MONOMINO) return squares;

    for (let delta of polyomino_deltas[e.polyomino_type][e.rotation]) {
        let o = new Vec3(future_pos);
        let p = o.add(delta);
        squares.push(p);
    }
    return squares;
}

export function rotate_clockwise_horizontaly(r: Direction): Direction {
    let new_dir: Direction = null;
    switch (r) {
        case Direction.RIGHT:
            new_dir = Direction.FORWARD;
            break;
        case Direction.FORWARD:
            new_dir = Direction.LEFT;
            break;
        case Direction.LEFT:
            new_dir = Direction.BACKWORD;
            break;
        case Direction.BACKWORD:
            new_dir = Direction.RIGHT;
            break;
    }
    return new_dir;
}

// === Edit Mode === 
export function get_selected_entities(manager: Entity_Manager): Game_Entity[] {
    let res = [];
    for (let e of manager.all_entities) {
        if (e.is_selected) {
            res.push(e);
        }
    }

    return res;
}

export function debug_validate_tiling(manager: Entity_Manager) {
    const map = new Map<string, boolean>();

    // Check if entities are in the same pos
    for (let e of manager.all_entities) {
        // @Fixme What if there several entity in the same square?
        if (e.entity_type == Entity_Type.CHECKPOINT) continue;
        if (e.entity_type == Entity_Type.FENCE) continue;
        if (e.entity_type == Entity_Type.TRACK) continue;
        if (e.entity_type == Entity_Type.BRIDGE) continue;
        if (e.entity_type == Entity_Type.ENTRANCE) continue;
        if (e.entity_type == Entity_Type.SWITCH) continue;

        for (let pos of get_entity_squares(e)) {
            const pos_str = pos.toString();
            if (map.has(pos_str)) {
                map.set(pos_str, true);
            } else {
                map.set(pos_str, false);
            }
        }
    }

    for (let e of manager.by_type.Checkpoint) {
        if (manager.locate_entities(e.position).length == 1) {
            map.set(e.position.toString(), true);
        }
    }

    for (let e of manager.by_type.Switch) {
        if (manager.locate_entities(e.position).length == 1) {
            map.set(e.position.toString(), true);
        }
    }

    for (let e of manager.all_entities) {
        let is_valid = true;
        for (let pos of get_entity_squares(e)) {
            if (map.get(pos.toString())) {
                is_valid = false;
            }
        }

        if (is_valid) {
            note_entity_is_valid(e);
        } else {
            note_entity_is_invalid(e);
        }
    }
}