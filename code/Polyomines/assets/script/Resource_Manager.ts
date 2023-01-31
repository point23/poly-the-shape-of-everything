import {_decorator, Component,} from 'cc';
import fs from 'fs-extra';
import {Const} from './Const';

import {Debug_Console} from './Debug_Console';
import {Level_Config} from './Main';

const {ccclass} = _decorator;

@ccclass('Resource_Manager')
export class Resource_Manager extends Component {
  public static instance: Resource_Manager;
  public static Settle(instance: Resource_Manager) {
    Resource_Manager.instance = instance;
  }

  current_level_config: Level_Config;
  current_level_name: string;

  load_level(level_name: string): Promise<Level_Config> {
    this.current_level_name = level_name;
    const root_path = Const.Data_Path;
    const file_name: string = `${root_path}/${level_name}.json`;
    let level_config: Level_Config;
    try {
      (level_config = fs.readJson(file_name));
      this.current_level_config = level_config;
      return Promise.resolve(level_config);
    } catch (err) {
      console.log(err);
    }
  }

  save_level(level_config: Level_Config) {
    this.current_level_config = level_config;
    const root_path = Const.Data_Path;
    const level_name = this.current_level_name;
    const file_name = `${root_path}/${level_name}.json`;
    fs.writeJson(file_name, level_config)
        .then(() => {Debug_Console.Info('Saved')})
        .catch((err: Error) => {console.error(err)});
  };
}