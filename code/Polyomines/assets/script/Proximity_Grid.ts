import { _decorator, MeshRenderer, Node, Quat, Size, Vec3, assert, Game } from 'cc';

import { Const, Pid, String_Builder } from './Const';
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

interface Visitor<T> {
    visit_tree_node(n: Tree_Node): T;
}

import fs from 'fs-extra'; // @hack
export class Quad_Tree_Printer implements Visitor<string> {
    indent_count: number;

    constructor() {
        this.indent_count = 0;
    }

    print(n: Tree_Node) {
        let tree = n.accept(this);
        const root_path = Const.Data_Path;
        const file_path = `${root_path}/quad_tree.txt`;
        fs.outputFile(file_path, tree).catch((err: Error) => { console.error(err) });
    }

    visualize(pos: Vec3, vals: Node_Val[], children: Tree_Node[]): string {
        function build_indent(count: number): string {
            let builder_i = new String_Builder();
            for (let i = 0; i < count; i++) {
                builder_i.append("\t");
            }
            return builder_i.to_string();
        }

        let indent = build_indent(this.indent_count);
        let builder = new String_Builder();
        builder.append(indent).append("( p: ").append(`(${pos.x},${pos.y})\n`);
        builder.append(indent).append("  v: [");
        for (let it of vals) {
            builder.append(`${it.id.val} `);
        }
        builder.append("]\n");
        builder.append(indent).append("  c: [\n");
        for (let i = 1; i <= 4; i++) {
            let it = children[i];
            this.indent_count += 1;
            if (it == null) {
                builder.append(indent).append("null\n");
            } else {
                builder.append(it.accept(this)).append("\n");
            }
            this.indent_count -= 1;
        }
        builder.append(indent).append("])")
        return builder.to_string();
    }

    visit_tree_node(n: Tree_Node): string {
        return this.visualize(n.values[0].pos, n.values, n.children);
    }
}

type Node_Val = {
    id: Pid;
    pos: Vec3;
};

class Region {
    bounds: [number, number, number, number];
    get l(): number { return this.bounds[0]; }
    get r(): number { return this.bounds[1]; }
    get b(): number { return this.bounds[2]; }
    get t(): number { return this.bounds[3]; }

    constructor(l: number, r: number, b: number, t: number) {
        this.bounds = [l, r, b, t];
    }
}

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

    region_search(region: Region): Tree_Node[] {
        function search_until(p: Tree_Node, l: number, r: number, b: number, t: number) {
            function found() {
                search_result.push(p);
            }

            function in_region(xc: number, yc: number): boolean {
                return (l <= xc && xc <= r) && (b <= yc && yc <= t);
            }

            function overlaps(lp: number, rp: number, bp: number, tp: number): boolean {
                return (l <= rp) && (r >= lp) && (b <= tp) && (t >= bp);
            }
            //#SCOPE

            const x = p.x;
            const y = p.y;
            if (in_region(x, y)) found();
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
        //#SCOPE

        let search_result: Tree_Node[] = [];
        search_until(this, region.l, region.r, region.b, region.t);
        return search_result;
    }

    point_search(p: Vec3): Tree_Node {
        let r: Tree_Node = this;
        const kx = p.x;
        const ky = p.y;
        const rx = r.x;
        const ry = r.y;
        let quadrant = this.compare(rx, ry, kx, ky);
        while (r.children[quadrant] != null) {
            r = r.children[quadrant];
            const rx = r.x;
            const ry = r.y;
            quadrant = this.compare(rx, ry, kx, ky);
        }
        if (quadrant == Quadrant.ORIGIN) {
            return r;
        }
        return null;
    }

    insert(k: Node_Val) {
        let r: Tree_Node = this;
        const kx = k.pos.x;
        const ky = k.pos.y;
        const rx = r.x;
        const ry = r.y;
        let quadrant = this.compare(rx, ry, kx, ky);
        while (r.children[quadrant] != null) {
            r = r.children[quadrant];
            const rx = r.x;
            const ry = r.y;
            quadrant = this.compare(rx, ry, kx, ky);
        }
        if (quadrant == Quadrant.ORIGIN) {
            r.values.push(k);
            return;
        }
        r.children[quadrant] = new Tree_Node(k);
    }

    compare(rx: number, ry: number, kx: number, ky: number): Quadrant {
        if (kx == rx && ky == ry) return Quadrant.ORIGIN;
        if (kx <= rx && ky <= ry) return Quadrant.SW;
        if (kx >= rx && ky >= ry) return Quadrant.NE;
        if (kx <= rx && ky >= ry) return Quadrant.NW;
        if (kx >= rx && ky <= ry) return Quadrant.SE;
    }

    // @note Visitor pattern
    accept<T>(v: Visitor<T>): T {
        return v.visit_tree_node(this);
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

    point_search(p: Vec3): Pid[] {
        let res = this.quad_tree.point_search(p);
        return res.values.map(v => v.id);
    }

    region_search(r: Region): Game_Entity[] {
        let res = [];
        const nodes = this.quad_tree.region_search(r);
        for (let node of nodes) {
            res.concat(node.values);
        }
        return res;
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