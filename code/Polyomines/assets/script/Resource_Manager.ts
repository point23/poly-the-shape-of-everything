import { _decorator, Prefab, resources, instantiate, Node, CCString, JsonAsset, sys } from 'cc';
import { Singleton_Manager } from './Singleton_Manager_Base';
import { Const } from './Const';
import { UI_Manager } from './UI_Manager';

const { ccclass, property } = _decorator;

@ccclass('Prefab_Pair')
export class Prefab_Pair {
    @property(CCString) id = '';
    @property(Prefab) prefab = null;
};

@ccclass('Resource_Manager')
export class Resource_Manager extends Singleton_Manager {
    public static instance: Resource_Manager;
    public static Settle(instance: Resource_Manager) {
        Resource_Manager.instance = instance;
        instance.mapping_prefabs();
    }

    @property([Prefab_Pair]) prefab_pairs: Prefab_Pair[] = [];
    prefabs: Map<String, Prefab> = new Map<String, Prefab>();

    @property(Node) entities_parent: Node;

    levels: any[] = [];
    current_level_idx = 0;
    current_level_config: any = null;
    get num_levels(): number { return this.levels.length; }
    get next_level_idx(): number { return (this.current_level_idx + 1) % this.num_levels; }
    get prev_level_idx(): number { return (this.current_level_idx - 1 + this.num_levels) % this.num_levels; }
    get current_level(): any { return this.levels[this.current_level_idx]; }
    get current_level_name(): string { return this.current_level.name; }

    mapping_prefabs() {
        this.prefab_pairs.forEach(it => {
            this.prefabs.set(it.id, it.prefab);
        });
    }

    load_levels(caller: any, callback: (any) => void) {
        const file_path: string = `${Const.Data_Path}/levels`;
        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.levels = result.levels;

            this.current_level_idx = 0;

            this.load_current_level(caller, callback);
        });
    }

    load_succeed_level(caller: any = null, callback: (any) => void = null) {
        this.current_level_idx = this.current_level.successor;
        this.load_current_level(caller, callback);
    }

    load_prev_level(caller: any = null, callback: (any) => void = null) {
        this.current_level_idx = this.prev_level_idx;
        this.load_current_level(caller, callback);
    }

    load_next_level(caller: any = null, callback: (any) => void = null) {
        this.current_level_idx = this.next_level_idx;
        this.load_current_level(caller, callback);
    }

    load_current_level(caller: any, callback: (any) => void) {
        const level_name = this.current_level_name;
        const file_path: string = `${Const.Data_Path}/${level_name}`;

        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.current_level_config = result;

            if (callback != null)
                callback(caller);
        });
    }

    instantiate_prefab(name: string): Node {
        let p = this.prefabs.get(name);
        let n = instantiate(p);
        n.setParent(this.entities_parent);
        return n;
    }

    save_level(level_config) {
        this.current_level_config = level_config;
        UI_Manager.instance.info_panel.show("Saved.");
    };

    download_config() {
        if (!sys.isBrowser) return;
        const level_config = this.current_level_config;

        let text_file_as_blob = new Blob([JSON.stringify(level_config)], { type: 'application/json' });
        let download_link = document.createElement("a");
        download_link.download = this.current_level_name;
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