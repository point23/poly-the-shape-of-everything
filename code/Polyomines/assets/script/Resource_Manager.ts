import { _decorator, Prefab, resources, instantiate, Node, JsonAsset, sys, Component, TiledUserNodeData } from 'cc';
import { $$, Const } from './Const';
import { Prefab_Pair } from './TIny_Little_Components';

const { ccclass, property } = _decorator;

type Level_Data = {
    id: string,
    name: string,
    successor: string,
    unlock: string,
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

    level_id_to_idx: Map<string, number> = new Map(); // @Note Level id is the json file name.
    level_idx_to_id: Map<number, string> = new Map(); // @Note Level id is the json file name.
    levels: Level_Data[] = [];
    levels_to_test: string[] = [];

    current_level_idx = 0;
    current_level_config: any = null;
    get current_level(): Level_Data { return this.levels[this.current_level_idx]; }

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
        const file_path: string = `${Const.DATA_PATH}/levels`;

        var userData = {
            current_level: null,
            unlocked: ['level#001', 'level#002', 'level#004', 'level#007', 'level#008', 'level#009', 'level#010'],
        };
        { // @Temporary Get user data.
            const i = sys.localStorage.getItem('userData');
            if (i && !$$.FOR_EDITING) {
                userData = JSON.parse(i);
            } else {
                sys.localStorage.setItem('userData', JSON.stringify(userData));
            }
        }

        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.levels = result.levels;
            this.levels_to_test = result.levels_to_test;
            this.mapping_levels();

            var init_level = userData.current_level;
            if (!init_level) init_level = result.start;

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
        const file_path: string = `${Const.DATA_PATH}/${filename}`;

        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.current_level_config = result;

            if (callback != null)
                callback(caller);
        });
    }

    load_level(idx: number, caller: any, callback: (any) => void) {
        this.current_level_idx = idx;

        { // @Note Save user config.
            if (!$$.FOR_EDITING) {
                var userData = JSON.parse(sys.localStorage.getItem('userData'));
                userData.current_level = idx;
                sys.localStorage.setItem('userData', JSON.stringify(userData));
            }
        }

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