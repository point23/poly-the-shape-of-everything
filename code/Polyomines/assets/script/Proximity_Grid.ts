import { _decorator, MeshRenderer, Node, Quat, Size, Vec3, assert } from 'cc';
import { clone_all_slots, Const, String_Builder } from './Const';
import { Game_Entity, get_entity_squares } from './Game_Entity';

enum Quadrant {
    //       NW  |  NE
    //       ____!____
    //           |
    //       SW  |  SE
    ORIGIN,
    NE,
    NW,
    SW,
    SE,
}

interface Visitor<T> {
    visit_tree_node(n: Tree_Node): T;
}

class Quad_Tree_Printer implements Visitor<string> {
    indent_count: number;

    constructor() {
        this.indent_count = 1;
    }

    print(n: Tree_Node) {
        const tree = n.accept(this);
        console.log(tree);
    }

    visualize(pos: Vec3, vals: Game_Entity[], children: Tree_Node[]): string {
        function build_indent(count: number, char: string = "\t"): string {
            let builder_i = new String_Builder();
            for (let i = 0; i < count; i++) {
                if (i < count - 1) {
                    builder_i.append("\t");
                }
                else {
                    builder_i.append(char);
                }
            }
            return builder_i.to_string();
        }
        //#SCOPE

        const root_indent = build_indent(this.indent_count, "====");
        const indent = build_indent(this.indent_count);
        const previous_indent = build_indent(this.indent_count - 1);
        let builder = new String_Builder();
        builder.append(previous_indent).append("{\n");
        builder.append(root_indent).append("  p: ").append(`(${pos.x},${pos.y})\n`);
        builder.append(indent).append("  v: [ ");
        for (let it of vals) {
            builder.append(it.id).append(" ");
        }
        builder.append("]\n");
        builder.append(indent).append("  c: [\n");
        for (let i = 0; i <= 4; i++) {
            let it = children[i];
            this.indent_count += 1;
            switch (i) {
                case 0: builder.append(indent).append("OO:\n"); break;
                case 1: builder.append(indent).append("NE:\n"); break;
                case 2: builder.append(indent).append("NW:\n"); break;
                case 3: builder.append(indent).append("SW:\n"); break;
                case 4: builder.append(indent).append("SE:\n"); break;
            }
            if (it == null) {
                builder.append(indent).append("\tnull\n");
            } else {
                builder.append(it.accept(this)).append("\n");
            }
            this.indent_count -= 1;
        }
        builder.append(indent).append("]\n");
        builder.append(previous_indent).append("}\n");
        return builder.to_string();
    }

    visit_tree_node(n: Tree_Node): string {
        return this.visualize(new Vec3(n.x, n.y), n.values, n.children);
    }
}

class Tree_Node {
    x: number;
    y: number;
    values: Game_Entity[];
    children: [Tree_Node, Tree_Node, Tree_Node, Tree_Node, Tree_Node];

    constructor(k: Game_Entity, kx: number, ky: number) {
        this.x = kx;
        this.y = ky;
        this.values = [k];
        this.children = [null, null, null, null, null];
    }

    // @note Visitor pattern
    accept<T>(v: Visitor<T>): T {
        return v.visit_tree_node(this);
    }
}

function compare(rx: number, ry: number, kx: number, ky: number): number {
    if (kx == rx && ky == ry) return Quadrant.ORIGIN;
    if (kx >= rx && ky >= ry) return Quadrant.NE;
    if (kx <= rx && ky >= ry) return Quadrant.NW;
    if (kx <= rx && ky <= ry) return Quadrant.SW;
    if (kx >= rx && ky <= ry) return Quadrant.SE;
}

function conjugate(quadrant: Quadrant): Quadrant {
    // NE <=> SW; NW <=> SE
    return (quadrant + 1) % 4 + 1;
}

function point_search(r: Tree_Node, p: Vec3): Tree_Node {
    const kx = p.x;
    const ky = p.y;
    const rx = r.x;
    const ry = r.y;
    let quadrant = compare(rx, ry, kx, ky);

    while (r.children[quadrant] != null) {
        r = r.children[quadrant];
        const rx = r.x;
        const ry = r.y;
        quadrant = compare(rx, ry, kx, ky);
    }

    if (quadrant == Quadrant.ORIGIN) return r;

    return null;
}

/* 
    // @implementMe
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

    function region_search(region: Region): Tree_Node[] {
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
            if (p.children[Quadrant.NE] != null && overlaps(x, r, y, t))
                search_until(p.children[Quadrant.NE], x, r, y, t);
            if (p.children[Quadrant.NW] != null && overlaps(l, x, y, t))
                search_until(p.children[Quadrant.NW], l, x, y, t);
            if (p.children[Quadrant.SW] != null && overlaps(l, x, b, y))
                search_until(p.children[Quadrant.SW], l, x, b, y);
            if (p.children[Quadrant.SE] != null && overlaps(x, r, b, y))
                search_until(p.children[Quadrant.SE], x, r, b, y);
        }
        //#SCOPE

        let search_result: Tree_Node[] = [];
        search_until(this, region.l, region.r, region.b, region.t);
        return search_result;
    }
*/

function insert(n: Tree_Node, k: Game_Entity) {
    function insert_once(r: Tree_Node, kx: number, ky: number) {
        const rx = r.x;
        const ry = r.y;
        let quadrant = compare(rx, ry, kx, ky);

        while (r.children[quadrant] != null) {
            r = r.children[quadrant];
            const rx = r.x;
            const ry = r.y;
            quadrant = compare(rx, ry, kx, ky);
        }

        if (quadrant == Quadrant.ORIGIN) {
            r.values.push(k);
            return;
        }

        r.children[quadrant] = new Tree_Node(k, kx, ky);
    }
    //#SCOPE

    for (let square of get_entity_squares(k)) {
        insert_once(n, square.x, square.y);
    }
}

// @incomplete
function remove(n: Tree_Node, k: Game_Entity) {
    function remove_once(kx: number, ky: number) {
        const p = point_search(n, new Vec3(kx, ky));
        if (p == null) return;

        const idx = p.values.indexOf(k);
        if (idx == -1) {
            return;
        }
        p.values.splice(idx, 1);
    }

    for (let square of get_entity_squares(k)) {
        remove_once(square.x, square.y);
    }
}

/*
 @note
 - Draw debug info on invalid squares.
 - Show grids.
 - Transform from board-coords to world-position.
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

    move_entity(e: Game_Entity, p: Vec3) {
        e.physically_move_to(this.local2world(p));
    }

    add_entity(e: Game_Entity) {
        if (this.quad_tree == null) {
            assert(get_entity_squares(e).length == 1);

            this.quad_tree = new Tree_Node(e, e.position.x, e.position.y);
        } else {
            insert(this.quad_tree, e);
        }
    }

    // @todo
    remove_entity(e: Game_Entity) {
        remove(this.quad_tree, e);
    }

    point_search(p: Vec3): Game_Entity {
        const n = point_search(this.quad_tree, p);

        if (n) {
            for (let k of n.values) {
                if (k.position.z == p.z) return k;
            }
        }

        return null;
    }

    /* 
        region_search(r: Region): Game_Entity[] {
            let res = [];
            const nodes = this.quad_tree.region_search(r);
            for (let node of nodes) {
                res.concat(node.values);
            }
            return res;
        }
    
     */

    local2world(local_pos: Vec3): Vec3 {
        // let type = arguments.callee.caller.name;
        // console.log(type);
        const square_size = Const.Game_Board_Square_Size;
        let p = new Vec3;
        clone_all_slots(this.origin, p);
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

//#region DEBUG STUFF
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

export function debug_print_quad_tree(t: Tree_Node) {
    // new Quad_Tree_Printer().print(t);
}
//#endregion DEBUG STUFF