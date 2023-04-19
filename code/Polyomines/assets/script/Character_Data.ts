import { _decorator, Component, JsonAsset, resources, SkeletalAnimation, } from 'cc';
import { $$, Const } from './Const';
import { Game_Entity } from './Game_Entity';
import { Game_Input } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
const { ccclass, property } = _decorator;

export enum Animation_Messsage {
    ACTIVATE = "activate",
    INACTIVATE = "inactivate",
}

class Animation_State {
    node: Animation_Node = null;
    duration: number = 0;
    elapsed: number = 0;
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

const default_anim_duration: number = 3;
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

export function per_round_animation_update(entity: Game_Entity) {
    const c = entity.getComponent(Character_Data);
    if (!c) return;

    const input: Game_Input = Input_Manager.instance.game_input;

    const state = c.anim_state;
    const node = c.anim_state.node;
    state.elapsed += 1;

    if (state.elapsed >= state.duration) {
        if (node.name == "run" || node.name == "push") {
            if (!input.keep_pressing_moving_btn()) {
                animate(entity, "stop");
            }
        }

        if (node.name == "landing") {
            animate(entity, "activate");
        }

        if (node.name == "victory") {
            animate(entity, "activate");
        }
    }

    if (state.node.name == "active") {
        if (input.keep_pressing_moving_btn() && input.buffered_player_moves.empty()) {
            animate(entity, "run");
        }
    }
}

export function init_animation_state(entity: Game_Entity, graph: Animation_Graph) {
    const c = entity.getComponent(Character_Data);
    if (!c) return;
    c.anim_state.node = graph.entry;

    const anim = graph.entry.anim;
    c.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
    c.animation.crossFade(anim);
}

export function animate(entity: Game_Entity, msg: string, duration: number = default_anim_duration) {
    const c = entity.getComponent(Character_Data);
    if (!c) return;
    if (!c.anim_state) return;

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