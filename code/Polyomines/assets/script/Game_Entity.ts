import { _decorator, Component, Enum, MeshRenderer, SkeletalAnimation, tween, Vec3, Game } from 'cc';
import { Const, Direction, String_Builder } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Polygon_Entity } from './Polygon_Entity';

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
    // @note We can't use /2 here, cause they're float numbers
    return ((d1 >> 1) == (d2 >> 1));
}

export function calcu_target_direction(d: Direction, delta: number): Direction {
    return (d + delta + 4) % 4;
}

export enum Entity_Type {
    STATIC,// It means we're not avaliale to  push them
    DYNAMIC,
    HERO, // @incomplete
    // There're ganna be many possible characters for player to chose
    // The relationship between "derived" part and game entity seems like
    // a Composite Pattern? 
    AVATAR, // @incomplete 
    // Kinda like cappee in Super Mario: Odyssey
    // Different avatars can have different powers, like chained warms? owls? bats?
    CHECKPOINT, // Possible win? But in a multiple character level, the winning condition
    // is that each of them are stands on a checkpoint entity.
    HINT,
    BRIDGE,
    GATE,
    FENCE,
    ROVER,
    TRACK,
    SWITCH,
    GEM,
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

// @incomplete
/* 
    Memory:
    Int32 [
        0: x,
        1: y,
        2: z,
        3: orientation,
        4: rotation,
        5: flags,
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
};

/**
 * NOTE
 * - Rotate to
 * - Face towards
 * - Move to
 */
@ccclass('Game_Entity')
export class Game_Entity extends Component {
    id: number;
    undoable: Undoable_Entity_Data;
    scheduled_for_destruction: boolean = false;
    prefab: string = "";
    derived_data: any = {}

    get position(): Vec3 { return this.undoable.position };
    get rotation(): Direction { return this.undoable.rotation };
    get orientation(): Direction { return this.undoable.orientation; };
    get flags(): number { return this.undoable.flags; }

    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    @property(MeshRenderer) editing_cover: MeshRenderer = null;
    @property(Polygon_Entity) body: Polygon_Entity = null;
    @property(Polygon_Entity) indicator: Polygon_Entity = null;
    @property({ type: Enum(Polyomino_Type) }) polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;
    @property({ type: Enum(Entity_Type) }) entity_type: Entity_Type = Entity_Type.STATIC;

    get is_valid(): boolean { return (this.flags & Entity_Flags.INVALID) == 0; }
    get is_selected(): boolean { return (this.flags & Entity_Flags.SELECT) != 0; }

    physically_move_to(world_pos: Vec3) {
        this.node.setPosition(world_pos);
    }

    physically_rotate_to(dir: Direction) {
        this.body.rotate_to(dir);
    }

    face_towards(dir: Direction) {
        this.physically_rotate_to(dir);
        if (this.entity_type != Entity_Type.STATIC) {
            this.logically_rotate_to(dir);
        }
    }

    /* 
        async face_towards_async(dir: Direction) {
            if (this.entity_type != Entity_Type.AVATAR) {
                await this.body.rotate_to_async(dir);
                this.direction = dir;
                this.indicator.rotate_to(dir);
            } else {
                this.direction = dir;
                this.indicator.rotate_to(dir);
            }
        }
     */

    async physically_move_to_async(world_pos: Vec3) {
        tween().target(this.node).to(0.1, { position: world_pos }).start();
    }

    async move_to_async(world_pos: Vec3) {
        await this.physically_move_to_async(world_pos);
    }

    logically_rotate_to(dir: Direction) {
        this.indicator.rotate_to(dir);
    }
}

export function is_dervied(t: number): boolean {
    return t == Entity_Type.SWITCH || t == Entity_Type.CHECKPOINT;
}

export function get_serializable(e: Game_Entity): Serializable_Entity_Data {
    const res = {
        prefab: e.prefab,
        position: e.position,
        rotation: e.rotation,
    };

    // if (is_dervied(e.entity_type)) {
    //     res['derived_data'] = e.derived_data;
    // }

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

// === Calculation === 
// @todo Support more types of entity
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
            /* UP */[new Vec3(0, 0, 1)], // @implementMe
            /* DOWN */[new Vec3(0, 0, -1)], // @implementMe
    ],
];

const direction_to_vec3: Vec3[] = [
    /* LEFT */ new Vec3(-1, 0, 0),
    /* RIGHT */ new Vec3(1, 0, 0),
    /* FORWARD */ new Vec3(0, -1, 0),
    /* BACKWARD */ new Vec3(0, 1, 0),
    /* UP */ new Vec3(0, 0, 1),
    /* DOWN */ new Vec3(0, 0, -1),
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
    const delta = direction_to_vec3[dir];
    let o = new Vec3(e.position);
    for (let i = 0; i < step; i++)
        o.add(delta);
    return o;
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

export function debug_validate_tiling(manager: Entity_Manager) {
    const map = new Map<string, boolean>();

    // Check if entities are in the same pos
    for (let e of manager.all_entities) {
        // @fixme What if there several entity in the same square?
        if (e.entity_type == Entity_Type.CHECKPOINT) continue;
        if (e.entity_type == Entity_Type.FENCE) continue;
        if (e.entity_type == Entity_Type.TRACK) continue;
        if (e.entity_type == Entity_Type.BRIDGE) continue;
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

    for (let e of manager.checkpoints) {
        if (manager.locate_entities(e.position).length == 1) {
            map.set(e.position.toString(), true);
        }
    }

    for (let e of manager.switches) {
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