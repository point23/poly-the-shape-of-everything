import { _decorator, Component, Enum, MeshRenderer, SkeletalAnimation, tween, Vec3 } from 'cc';

import { Const } from './Const';
import { Direction, Entity_Type, Polyomino_Type } from './Enums';
import { Game_Board } from './Game_Board';
import { Polygon_Entity } from './Polygon_Entity';

const { ccclass, property } = _decorator;

export class Entity_Info {
    prefab: string;
    local_pos: Vec3;
    world_pos: Vec3;
    rotation: Direction;

    public constructor(info: any) {
        this.prefab = info.prefab;
        this.local_pos =
            new Vec3(info.local_pos.x, info.local_pos.y, info.local_pos.z);
        this.rotation = info.rotation;
    }
};

/**
 * NOTE
 * - Rotate to
 * - Face towards
 * - Move to
 */
@ccclass('Game_Entity')
export class Game_Entity extends Component {
    static entity_id_seq: number = 0;
    static get next_id(): number {
        return this.entity_id_seq++;
    }

    //#region Properties
    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    @property(MeshRenderer) editing_cover: MeshRenderer = null;
    @property(Polygon_Entity) body: Polygon_Entity = null;
    @property(Polygon_Entity) indicator: Polygon_Entity = null;

    @property({ type: Enum(Polyomino_Type) })
    polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;

    @property({ type: Enum(Entity_Type) })
    entity_type: Entity_Type = Entity_Type.STATIC;

    direction: Direction = null;
    entity_id: number;
    _info: Entity_Info;

    get info(): Entity_Info {
        return this._info;
    }

    set info(info: Entity_Info) {
        this._info = info;
        this.face_towards(info.rotation);
        this.physically_move_to(info.world_pos);
    }

    get prefab(): string {
        return this._info.prefab;
    }

    get local_pos(): Vec3 {
        return this._info.local_pos;
    }

    get rotation(): Direction {
        return this._info.rotation;
    }

    //#endregion

    //#region TEST
    private _valid: boolean = true;
    set valid(is_valid: boolean) {
        this._valid = is_valid;
        const mat = this.editing_cover.material;

        /* FIXME Change them into flags */
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

        /* FIXME Change them into flags */
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
    //#endregion TEST

    //#region Movement
    async move_to_async(target: Vec3) {
        this._info.local_pos = target.clone();
        let world_pos = Game_Board.instance.local2world(this.local_pos);
        await this.physically_move_to_async(world_pos);
    }

    async move_towards_async(dir: Direction, step: number = 1) {
        this.logically_move_towards(dir, step);
        let world_pos = Game_Board.instance.local2world(this.local_pos);
        // this.animation.getState('walk').speed = 5;
        // this.animation.getState('walk').wrapMode = AnimationClip.WrapMode.Normal;
        // this.animation.play('walk');
        await this.physically_move_to_async(world_pos);
    }

    move_towards(dir: Direction, step: number = 1) {
        this.logically_move_towards(dir, step);
        let world_pos = Game_Board.instance.local2world(this.local_pos);
        this.physically_move_to(world_pos);
    }

    physically_move_to(world_pos: Vec3) {
        this._info.world_pos = world_pos;
        this.node.setPosition(world_pos);
    }

    logically_move_towards(dir: Direction, step: number = 1) {
        const delta = Const.Direction2Vec3[dir].multiplyScalar(step);
        this._info.local_pos = this.local_pos.add(delta);
    }

    async physically_move_to_async(world_pos: Vec3) {
        this._info.world_pos = world_pos;
        tween().target(this.node).to(0.1, { position: world_pos }).start();
    }

    async face_towards_async(dir: Direction) {
        if (this.entity_type != Entity_Type.AVATAR) {
            this._info.rotation = dir;
            await this.body.rotate_to_async(dir);
            this.direction = dir;
            this.indicator.rotate_to(dir);
        } else {
            this.direction = dir;
            this.indicator.rotate_to(dir);
        }
    }

    face_towards(dir: Direction) {
        this.physically_rotate_to(dir);
        if (this.entity_type != Entity_Type.STATIC) {
            this.logically_rotate_to(dir);
        }
    }

    logically_rotate_to(dir: Direction) {
        this.direction = dir;
        this.indicator.rotate_to(dir);
    }

    physically_rotate_to(dir: Direction) {
        this._info.rotation = dir;
        this.body.rotate_to(dir);
    }

    rotate_clockwise_horizontaly() {
        let new_dir: Direction = null;

        switch (this._info.rotation) {
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

        this.face_towards(new_dir);
    }
    //#endregion Movement

    //#region Calculation
    /** TODO Rename it, Support more poly types */
    occupied_squares(): Vec3[] {
        let res: Vec3[] = [];
        res.push(this.local_pos);

        if (this.polyomino_type == Polyomino_Type.MONOMINO) return res;

        for (let delta of
            Const.Polyomino_Deltas[this.polyomino_type][this.rotation]) {
            let o = this.local_pos.clone();
            let p = o.add(delta);
            res.push(p);
        }

        return res;
    }

    calcu_future_pos(dir: Direction, step: number = 1): Vec3 {
        const delta = Const.Direction2Vec3[dir].clone().multiplyScalar(step);
        let current = this.local_pos.clone();
        return current.add(delta);
    }

    calcu_future_squares(dir: Direction, step: number = 1): Vec3[] {
        let res = [];
        const future_pos = this.calcu_future_pos(dir, step);
        res.push(future_pos);

        if (this.polyomino_type == Polyomino_Type.MONOMINO) return res;

        for (let delta of
            Const.Polyomino_Deltas[this.polyomino_type][this.rotation]) {
            let o = future_pos.clone();
            let p = o.add(delta);
            res.push(p);
        }

        return res;
    }
    //#endregion
}