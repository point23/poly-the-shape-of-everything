import { _decorator, AnimationClip, Component, JsonAsset, resources, SkeletalAnimation, } from 'cc';
import { $$, Const } from './Const';
const { ccclass, property } = _decorator;

export enum Animation_Messsage {
    ACTIVATE = "activate",
    INACTIVATE = "inactivate",
}

class Animation_Node {
    name: string = "";
    anim: string = "";
    arcs: Animation_Arc[] = [];

    constructor(info: any) {
        this.name = info.name;
        this.anim = info.anim;
    }
}

class Animation_Arc {
    destination: Animation_Node = null;
    on: string = "";

    constructor(dest: Animation_Node, message: string) {
        this.destination = dest;
        this.on = message;
    }
}

export class Animation_Graph {
    available: boolean = false;
    entry: Animation_Node = null;
    nodes: Map<string, Animation_Node> = new Map();
}

export const human_animation_graph: Animation_Graph = new Animation_Graph();

export function make_human_animation_graph() {
    const file_path: string = `${Const.DATA_PATH}/human_animation_graph`;
    resources.load(file_path, JsonAsset, (e, asset) => {
        const graph = human_animation_graph;
        const g = asset.json;

        console.log(g);

        for (let n of g.nodes) {
            const node = new Animation_Node(n);
            graph.nodes.set(node.name, node);
        }

        for (let a of g.arcs) {
            const source = graph.nodes.get(a.from);
            const dest = graph.nodes.get(a.to);
            const message = a.on;

            const arc = new Animation_Arc(dest, message);
            source.arcs.push(arc);
        }

        graph.entry = graph.nodes.get(g.entry);
        graph.available = true;
    });
}

export function animate(hero: Hero_Entity_Data, msg: Animation_Messsage) {
    if (!hero.anim_state) return;

    const arc = hero.anim_state.arcs.find((i) => i.on == msg);
    const dest = arc?.destination;

    if (!dest) return;

    const anim = dest.anim;
    hero.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
    hero.animation.crossFade(anim);
}

@ccclass('Hero_Entity_Data')
export class Hero_Entity_Data extends Component {
    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    anim_state: Animation_Node = null;
}