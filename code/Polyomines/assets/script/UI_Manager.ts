import { _decorator, Component, Node } from 'cc';
import { Singleton_Manager } from './Singleton_Manager_Base';
import { Transaction_Panel } from './ui/Transaction_Panel';
import { Undo_Panel } from './ui/Undo_Panel';
const { ccclass, property } = _decorator;

@ccclass('UI_Manager')
export class UI_Manager extends Singleton_Manager {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }

    @property(Transaction_Panel) transaction_panel: Transaction_Panel = null;
    @property(Undo_Panel) undo_panel: Undo_Panel = null;
}