import { _decorator, MeshRenderer, Node, Quat, Size, Vec3 } from 'cc';

import { Const, Pid } from './Const';
import { Game_Entity } from './Game_Entity';

// @todo Move it to some where else like serialize?
//  Implement new version of clone with Reflect...
function clone(src: Vec3, dst: Vec3) {
    dst.x = src.y;
    dst.y = src.y;
    dst.z = src.z;
}

// Quad-Tree
enum Quadrant {
    ORIGIN,
    //       NW  |  NE
    //       ____!____
    //           |
    //       SW  |  SE
    NE,
    NW,
    SW,
    SE,
}

type Node_Val = {
    id: Pid;
    pos: Vec3;
};

class Tree_Node {
    x: number;
    y: number;
    values: Node_Val[];
    children: [Tree_Node, Tree_Node, Tree_Node, Tree_Node, Tree_Node];

    constructor(val: Node_Val) {
        this.x = val.pos.x;
        this.y = val.pos.y;
        this.values = [val];
        this.children = [null, null, null, null, null];
    }

    conjugate(quadrant: Quadrant): Quadrant {
        // NE <=> SW; NW <=> SE
        return (quadrant + 1) % 4 + 1;
    }

    region_search(l: number, r: number, b: number, t: number): Tree_Node[] {
        function search_until(p: Tree_Node, l: number, r: number, b: number, t: number) {
            function found(n: Tree_Node) {
                search_result.push(n);
            }

            function in_region(x: number, y: number): boolean {
                return (l <= x && x <= r) && (b <= y && y <= t);
            }

            function overlaps(lp: number, rp: number, bp: number, tp: number) {
                return (l <= rp) && (r >= lp) && (b <= tp) && (t >= bp);
            }

            //#SCOPE
            const x = p.x;
            const y = p.y;
            if (in_region(x, y)) return found(p);
            //       ___ ___   t
            //      |NW |NE |
            //      |___!___|  y
            //      |SW |SE |
            //      |___|___|  b
            //      l   x   r
            if (p.children[Quadrant.NE] != null && overlaps(x, r, y, t)) {
                search_until(p.children[Quadrant.NE], x, r, y, t);
            }

            if (p.children[Quadrant.NW] != null && overlaps(l, x, y, t)) {
                search_until(p.children[Quadrant.NW], l, x, y, t);
            }

            if (p.children[Quadrant.SW] != null && overlaps(l, x, b, y)) {
                search_until(p.children[Quadrant.SW], l, x, b, y);
            }

            if (p.children[Quadrant.SE] != null && overlaps(x, r, b, y)) {
                search_until(p.children[Quadrant.SE], x, r, b, y);
            }
        }

        let search_result: Tree_Node[];
        search_until(this, l, r, b, t);
        return search_result;
    }

    insert(k: Node_Val) {
        function compare(): Quadrant {
            let rx = r.x;
            let ry = r.y;
            if (kx == rx && ky == ry) return Quadrant.ORIGIN;
            if (kx <= rx && ky <= ry) return Quadrant.SW;
            if (kx >= rx && ky >= ry) return Quadrant.NE;
            if (kx <= rx && ky >= ry) return Quadrant.NW;
            if (kx >= rx && ky <= ry) return Quadrant.SE;
        }

        //#SCOPE
        const kx = k.pos.x;
        const ky = k.pos.y;
        let r: Tree_Node = this;
        let quadrant = compare();
        while (r.children[quadrant] != null) {
            r = r.children[quadrant];
            quadrant = compare();
        }
        if (quadrant == Quadrant.ORIGIN) {
            r.values.push(k);
            return;
        }
        r.children[quadrant] = new Tree_Node(k);
    }
}

/**
 * @note
 * - Draw debug info on invalid squares.
 * - Show grids.
 * - Transform from board-coords to world-position.
 */
export class Proximity_Grid {
    origin: Vec3;
    grid_size: Size = Const.Default_Game_Board_Size;
    quad_tree: Tree_Node;

    constructor(info: any) {
        this.grid_size = info.size;
        this.origin = info.origin;
        this.quad_tree = null;
    }

    add_entity(e: Game_Entity) {
        if (this.quad_tree == null) {
            this.quad_tree = new Tree_Node(e);
        } else {
            this.quad_tree.insert(e);
        }
    }

    // @todo
    remove_entity(e: Game_Entity) { }

    local2world(local_pos: Vec3): Vec3 {
        // let type = arguments.callee.caller.name;
        // console.log(type);

        const square_size = Const.Game_Board_Square_Size;
        let p = new Vec3;
        clone(this.origin, p);
        let d = new Vec3(local_pos.y * square_size, local_pos.z * square_size, local_pos.x * square_size);
        return p.add(d);
    }

    verfify_pos(local_pos: Vec3): boolean {
        return local_pos.x >= 0 && local_pos.x < this.grid_size.width
            && local_pos.y >= 0 && local_pos.y < this.grid_size.height;
    }

    /* 
        public world2local(pos: Vec3): { succeed: boolean, coord: Vec2 } {
            const square_size = Const.Game_Board_Square_Size;
            const origin_pos = Const.Game_Board_Orgin_Pos;
            const delta = pos.subtract(origin_pos);
            let succeed = false;
            let x = delta.z / square_size;
            let y = delta.x / square_size;
            if (x < this.grid_size.x && y < this.grid_size.y && delta.z >= 0 &&
                delta.x >= 0) {
                succeed = true;
            }
            return { succeed: succeed, coord: new Vec2(x, y) };
        }
    */
}

export function debug_render_grid(grid: Proximity_Grid, renderer: Node) {
    const square_size = Const.Game_Board_Square_Size;
    const half_square_size = Const.Game_Board_Half_Square_Size;
    const origin_pos = Const.Game_Board_Orgin_Pos;
    const grid_size = grid.grid_size;

    const grid_pos_z = origin_pos.z - half_square_size + square_size * grid_size.width / 2;
    const grid_pos_x = origin_pos.x - half_square_size + square_size * grid_size.height / 2;
    const grid_pos_y = origin_pos.y - half_square_size;
    const grid_center = new Vec3(grid_pos_x, grid_pos_y, grid_pos_z);

    renderer.setPosition(grid_center);
    renderer.setScale(grid_size.height / 10, 1, grid_size.width / 10);

    const renderable = renderer.getComponent(MeshRenderer);
    const mat = renderable.material;
    mat.setProperty('tilingOffset', new Quat(grid_size.height, grid_size.width, 0, 0));
}