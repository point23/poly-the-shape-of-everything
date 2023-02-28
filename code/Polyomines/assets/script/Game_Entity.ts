import { _decorator, Component, Enum, MeshRenderer, SkeletalAnimation, tween, Vec3 } from 'cc';

import { Const, Pid } from './Const';
import { Direction, Polyomino_Type, Entity_Type } from './entity';
import { Polygon_Entity } from './Polygon_Entity';

const { ccclass, property } = _decorator;


// @implementMe
export class Undoable_Entity_Data {
    position: Vec3 = new Vec3(0, 0, 0);
    prefab: string = "";
    orientation: Direction = 0;
    rotation: Direction = 0;
    supporting_id: Pid = Pid.Default;
    supported_by_id: Pid = Pid.Default;

    falling: boolean = false;
    dead: boolean = false;

    constructor() { }
};

export class Serializable_Entity_Data {
    constructor(private prefab: string, private position: Vec3, private rotation: Direction) { }
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
    undoable: Undoable_Entity_Data;
    scheduled_for_destruction: boolean = false;

    get prefab(): string { return this.undoable.prefab };
    get position(): Vec3 { return this.undoable.position };
    get rotation(): Direction { return this.undoable.rotation };
    get orientation(): Direction { return this.undoable.orientation };
    get supporting_id(): Pid { return this.undoable.supporting_id };
    get supported_by_id(): Pid { return this.undoable.supported_by_id };
    get falling(): boolean { return this.undoable.falling };
    get dead(): boolean { return this.undoable.dead };

    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    @property(MeshRenderer) editing_cover: MeshRenderer = null;
    @property(Polygon_Entity) body: Polygon_Entity = null;
    @property(Polygon_Entity) indicator: Polygon_Entity = null;
    @property({ type: Enum(Polyomino_Type) }) polyomino_type: Polyomino_Type = Polyomino_Type.MONOMINO;
    @property({ type: Enum(Entity_Type) }) entity_type: Entity_Type = Entity_Type.STATIC;

    //#region DEBUG STUFF
    private _valid: boolean = true;
    get valid(): boolean { return this._valid; }
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

    private _selected: boolean = false;
    get selected(): boolean { return this._selected; }
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
    //#endregion DEBUG STUFF

    //#region MOVEMENT
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
    //#endregion MOVEMENT
}