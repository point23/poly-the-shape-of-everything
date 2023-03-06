import { Vec3 } from "cc";
import { clone_all_slots } from "./Const";
import { Game_Entity, Serializable_Entity_Data, Undoable_Entity_Data } from "./Game_Entity";

export enum Direction {
    RIGHT,
    FORWARD,
    LEFT,
    BACKWORD,
    UP,
    DOWN,
}

export enum Entity_Type {
    STATIC,
    DYNAMIC,
    HERO,
    AVATAR,
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

export function get_serializable(e: Game_Entity): Serializable_Entity_Data {
    const data = e.undoable;
    return new Serializable_Entity_Data(e.prefab, data.position, data.rotation);
}

export function clone_ued(e: Game_Entity): Undoable_Entity_Data {
    const memory = e.undoable.memory;
    let clone = new Undoable_Entity_Data();
    for (let i = 0; i < memory.length; i++) {
        clone.memory[i] = memory[i];
    }
    return clone;
}

export function copy_ued(s: Undoable_Entity_Data, d: Undoable_Entity_Data) {
    const memory = s.memory;
    for (let i = 0; i < memory.length; i++) {
        d.memory[i] = memory[i];
    }
}

//#region CALCULATION
// @todo Support more types of entity
const polyomino_deltas: Vec3[][][] = [
    /* Monomino */
    [],
    /* Domino */
    [
        /* RIGHT */[new Vec3(1, 0, 0)],
        /* FORWARD */[new Vec3(0, -1, 0)],
        /* LEFT */[new Vec3(-1, 0, 0)],
        /* BACKWARD */[new Vec3(0, 1, 0)],
        /* UP */[new Vec3(0, 0, -1)],
        /* DOWN */[new Vec3(0, 0, 1)],
    ],
];

const direction_to_vec3: Vec3[] = [
    /* RIGHT */ new Vec3(1, 0, 0),
    /* FORWARD */ new Vec3(0, -1, 0),
    /* LEFT */ new Vec3(-1, 0, 0),
    /* BACKWARD */ new Vec3(0, 1, 0),
    /* UP */ new Vec3(0, 0, -1),
    /* DOWN */ new Vec3(0, 0, 1),
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
//#endregion CALCULATION
