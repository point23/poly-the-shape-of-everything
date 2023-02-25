import { _decorator, Component, Enum, MeshRenderer, SkeletalAnimation, tween, Vec3 } from 'cc';

import { Const, Pid } from './Const';
import { Direction, Entity_Type, Polyomino_Type } from './Enums';
import { Polygon_Entity } from './Polygon_Entity';

const { ccclass, property } = _decorator;


// @implementMe
type Undoable = {
    position: Vec3,
    prefab: string,
    orientation: Direction,
    rotation: Direction,
};

export type Entity_Serializable = {
    prefab: string,
    position: Vec3,
    rotation: Direction,
}

/**
 * NOTE
 * - Rotate to
 * - Face towards
 * - Move to
 */
@ccclass('Game_Entity')
export class Game_Entity extends Component {
    id: Pid;
    position: Vec3;
    prefab: string;
    orientation: Direction;
    rotation: Direction;

    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    @property(MeshRenderer) editing_cover: MeshRenderer = null;
    @property(Polygon_Entity) body: Polygon_Entity = null;
    @property(Polygon_Entity) indicator: Polygon_Entity = null;
    @property({ type: Enum(Polyomino_Type) })
    polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;
    @property({ type: Enum(Entity_Type) })
    entity_type: Entity_Type = Entity_Type.STATIC;

    //#region DEBUG STUFF
    private _valid: boolean = true;
    set valid(is_valid: boolean) {
        this._valid = is_valid;
        const mat = this.editing_cover.material;

        /* @fixme Change them into flags */
        if (is_valid) {
            if (!this.selected) {
                mat.setProperty('mainColor', Const.Cover_Normal_Color);
            } else {
                mat.setProperty('mainColor', Const.Cover_Selected_Color);
            }
        } else {
            mat.setProperty('mainColor', Const.Cover_Invalid_Color);
        }
    }
    get valid(): boolean {
        return this._valid;
    }

    private _selected: boolean = false;
    set selected(is_selected: boolean) {
        this._selected = is_selected;
        const mat = this.editing_cover.material;

        /* @fixme Change them into flags */
        if (is_selected) {
            mat.setProperty('mainColor', Const.Cover_Selected_Color);
        } else {
            if (this.valid) {
                mat.setProperty('mainColor', Const.Cover_Normal_Color);
            } else {
                mat.setProperty('mainColor', Const.Cover_Invalid_Color);
            }
        }
    }
    get selected(): boolean {
        return this._selected;
    }
    //#endregion DEBUG STUFF

    //#region Movement
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
        this.orientation = dir;
        this.indicator.rotate_to(dir);
    }
    //#endregion Movement

    get_serializable(): Entity_Serializable {
        return {
            prefab: this.prefab,
            position: this.position,
            rotation: this.rotation,
        };
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
    let squares = [];
    const future_pos = calcu_entity_future_position(e, dir, step);
    squares.push(future_pos);

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
