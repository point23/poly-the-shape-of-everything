import {_decorator, CCString, Component,} from 'cc';
import fs from 'fs-extra';
import {Const} from './Const';

import {Debug_Console} from './Debug_Console';
import {Level_Config} from './Main';

const {ccclass, property} = _decorator;

@ccclass('Resource_Manager')
export class Resource_Manager extends Component {
  public static instance: Resource_Manager;
  public static Settle(instance: Resource_Manager) {
    Resource_Manager.instance = instance;
  }

  current_level_config: Level_Config;
  current_level_name: string;

  static set Current_Level_Name(level_name: string) {
    Resource_Manager.instance.current_level_name = level_name;
  }

  static get Current_Level_Name(): string {
    return Resource_Manager.instance.current_level_name;
  }

  static set Current_Level_Config(level_config: Level_Config) {
    Resource_Manager.instance.current_level_config = level_config;
  }

  static get Current_Level_Config(): Level_Config {
    return Resource_Manager.instance.current_level_config;
  }

  static Load_Level(level_name: string, callback: any, target: any) {
    Resource_Manager.Current_Level_Name = level_name;
    const root_path = Const.Data_Path;
    const file_name: string = `${root_path}/${level_name}.json`;
    fs.readJson(file_name)
        .then((level_config: Level_Config) => {
          Resource_Manager.Current_Level_Config = level_config;
          callback(target, level_config);
        })
        .catch((err: Error) => {
          console.log(err);
        });
  }

  public static Save_Level(level_config: Level_Config) {
    Resource_Manager.Current_Level_Config = level_config;
    const root_path = Const.Data_Path;
    const level_name = Resource_Manager.Current_Level_Name;
    const file_name = `${root_path}/${level_name}.json`;
    fs.writeJson(file_name, level_config)
        .then(() => {Debug_Console.Info('Saved')})
        .catch((err: Error) => {console.error(err)});
  };
}