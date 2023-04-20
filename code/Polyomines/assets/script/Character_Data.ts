import { _decorator, Component, JsonAsset, resources, SkeletalAnimation, } from 'cc';
import { $$, Const } from './Const';
import { Game_Entity } from './Game_Entity';
const { ccclass, property } = _decorator;

export enum Animation_Messsage {
    ACTIVATE = "activate",
    INACTIVATE = "inactivate",
}

type defered_transition = {
    delay: number,
    durtion: number,
    msg: string,
}

class Animation_State {
    node: Animation_Node = null;
    duration: number = 0;
    elapsed: number = 0;

    // Deferred Transition...
    defered_transitions: defered_transition[] = [];
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

const default_anim_duration: number = 3; // @Note 0.01 * 8 * 4 ≈ 0.32s 
export const human_animation_graph: Animation_Graph = new Animation_Graph();

export function make_human_animation_graph() {
    const file_path: string = `${Const.DATA_PATH}/human_animation_graph`;
    resources.load(file_path, JsonAsset, (e, asset) => {
        const graph = human_animation_graph;
        const g = asset.json;

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

export function init_animation_state(entity: Game_Entity, graph: Animation_Graph) {
    const c = entity.getComponent(Character_Data);
    if (!c) return;
    c.anim_state.node = graph.entry;

    const anim = graph.entry.anim;
    c.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
    c.animation.crossFade(anim);
}

export function animate(entity: Game_Entity, msg: string, duration: number = default_anim_duration, delay: number = 0) {
    const c = entity.getComponent(Character_Data);
    if (!c) return;
    if (!c.anim_state) return;

    if (delay != 0) {
        c.anim_state.defered_transitions.push({
            delay: delay,
            durtion: duration,
            msg: msg,
        })
        return;
    }

    const arc = c.anim_state.node.arcs.find((i) => i.on == msg);
    const dest = arc?.destination;
    if (!dest) return;

    const anim = dest.anim;
    c.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
    c.animation.crossFade(anim);

    c.anim_state.node = dest;
    c.anim_state.duration = duration;
    c.anim_state.elapsed = 0;
}

@ccclass('Character_Data')
export class Character_Data extends Component {
    @property(SkeletalAnimation) animation: SkeletalAnimation = null;
    anim_state: Animation_State = new Animation_State();
}