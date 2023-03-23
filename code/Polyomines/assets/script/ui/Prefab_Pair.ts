import { _decorator, Component, Node, CCString, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Prefab_Pair')
export class Prefab_Pair {
    @property(CCString) id = '';
    @property(Prefab) prefab = null;
};