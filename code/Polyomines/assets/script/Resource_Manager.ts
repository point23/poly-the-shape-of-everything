import { _decorator, Prefab, resources, instantiate, Node, JsonAsset, sys, Component } from 'cc';
import { Const } from './Const';
import { Prefab_Pair } from './ui/Prefab_Pair';

const { ccclass, property } = _decorator;

type Level_Data = {
    id: string,
    name: string,
    successor: string,
}

@ccclass('Resource_Manager')
export class Resource_Manager extends Component {
    public static instance: Resource_Manager;
    public static Settle(instance: Resource_Manager) {
        Resource_Manager.instance = instance;
        instance.mapping_prefabs();
    }

    @property([Prefab_Pair]) prefab_pairs: Prefab_Pair[] = [];
    prefabs: Map<String, Prefab> = new Map<String, Prefab>();
    @property(Node) entities_parent: Node;

    level_id_to_idx: Map<string, number> = new Map(); // @note Level id is the json file name.
    level_idx_to_id: Map<number, string> = new Map(); // @note Level id is the json file name.
    levels: Level_Data[] = []

    current_level_idx = 0;
    current_level_config: any = null;
    get current_level(): any { return this.levels[this.current_level_idx]; }

    set_level_difficulty(d: any) {
        this.current_level_config.difficulty = Number(d);
    }

    mapping_prefabs() {
        this.prefab_pairs.forEach(it => {
            this.prefabs.set(it.id, it.prefab);
        });
    }

    mapping_levels() {
        this.levels.forEach((it, it_idx) => {
            this.level_id_to_idx.set(it.id, it_idx);
            this.level_idx_to_id.set(it_idx, it.id);
        })
    }

    load_levels(caller: any, callback: (any) => void) {
        const file_path: string = `${Const.Data_Path}/levels`;
        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.levels = result.levels;
            this.mapping_levels();

            this.current_level_idx = this.level_id_to_idx.get(result.start);
            this.load_current_level(caller, callback);
        });
    }

    load_succeed_level(caller: any = null, callback: (any) => void = null) {
        this.current_level_idx = this.level_id_to_idx.get(this.current_level.successor);
        this.load_current_level(caller, callback);
    }

    load_prev_level(caller: any = null, callback: (any) => void = null) {
        const num_levels = this.levels.length;
        this.current_level_idx = (this.current_level_idx - 1 + num_levels) % num_levels;
        this.load_current_level(caller, callback);
    }

    load_next_level(caller: any = null, callback: (any) => void = null) {
        const num_levels = this.levels.length;
        this.current_level_idx = (this.current_level_idx + 1) % num_levels;
        this.load_current_level(caller, callback);
    }

    load_current_level(caller: any, callback: (any) => void) {
        const filename = this.current_level.id;
        const file_path: string = `${Const.Data_Path}/${filename}`;

        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.current_level_config = result;

            if (callback != null)
                callback(caller);
        });
    }

    load_level(idx: number, caller: any, callback: (any) => void) {
        this.current_level_idx = idx;
        this.load_current_level(caller, callback);
    }

    instantiate_prefab(name: string): Node {
        let p = this.prefabs.get(name);
        let n = instantiate(p);
        n.setParent(this.entities_parent);
        return n;
    }

    save_level(level_config) {
        this.current_level_config = level_config;
    };

    download_config() {
        if (!sys.isBrowser) return;

        const level_config = this.current_level_config;
        let text_file_as_blob = new Blob([JSON.stringify(level_config)], { type: 'application/json' });
        let download_link = document.createElement("a");
        download_link.download = this.current_level.id;
        download_link.innerHTML = "Download File";

        if (window.webkitURL != null) {
            download_link.href = window.webkitURL.createObjectURL(text_file_as_blob);
        } else {
            download_link.href = window.URL.createObjectURL(text_file_as_blob);
            download_link.style.display = "none";
            document.body.appendChild(download_link);
        }

        download_link.click();
    }
}