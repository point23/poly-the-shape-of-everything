import { _decorator, Component, Prefab, resources, instantiate, Node, CCString, JsonAsset } from 'cc';
import { Debug_Console } from './Debug_Console';
import { Singleton_Manager } from './Singleton_Manager_Base';
import { Const } from './Const';

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

    is_ready: boolean = false;
    current_level_config: any = null;
    current_level_name: string = "";

    mapping_prefabs() {
        this.prefab_pairs.forEach(it => {
            this.prefabs.set(it.id, it.prefab);
        });
    }

    load_level(level_name: string, callback: () => void) {
        this.current_level_name = level_name;
        const root_path = Const.Data_Path;
        const file_path: string = `${root_path}/${level_name}`;

        resources.load(file_path, JsonAsset, (e, asset) => {
            const result = asset.json;
            this.current_level_config = result;
            this.is_ready = true;

            callback();
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
        // const root_path = Const.Data_Path;
        // const level_name = this.current_level_name;
        // const file_path = `${root_path}/${level_name}.json`;

        // fs.writeJson(file_path, level_config)
        //     .then(() => { Debug_Console.Info('Saved.') })
        //     .catch((err: Error) => { console.error(err) });
    };
}