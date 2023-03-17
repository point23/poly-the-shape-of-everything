import { _decorator, Component, Node } from 'cc';
import { Singleton_Manager } from './Singleton_Manager_Base';
const { ccclass, property } = _decorator;

@ccclass('Level_Manager')
export class Level_Manager extends Singleton_Manager {
    public static instance: Level_Manager;
    public static Settle(instance: Level_Manager) {
        Level_Manager.instance = instance;
    }
}