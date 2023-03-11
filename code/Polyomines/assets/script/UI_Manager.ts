import { _decorator, Component, Node } from 'cc';
import { Singleton_Manager } from './Singleton_Manager_Base';
const { ccclass, property } = _decorator;

@ccclass('UI_Manager')
export class UI_Manager extends Singleton_Manager {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }

    @property(Node) winning_panel: Node = null;

    start() {
        this.winning_panel.active = false;
    }

    show_winning() {
        this.winning_panel.active = true;
    }

    hide_winning() {
        this.winning_panel.active = false;
    }
}


