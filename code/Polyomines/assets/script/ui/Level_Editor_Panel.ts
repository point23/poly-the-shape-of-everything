import { _decorator, Component, Node, Button, EventHandler } from 'cc';
import { Contextual_Manager } from '../Contextual_Manager';
import { Level_Editor } from '../Level_Editor';
import { Resource_Manager } from '../Resource_Manager';
import { Button_Group } from './Button_Group';
import { Navigator } from './Navigator';
import { Transaction_Panel } from './Transaction_Panel';
import { Undo_Panel } from './Undo_Panel';
const { ccclass, property } = _decorator;

@ccclass('Level_Editor_Panel')
export class Level_Editor_Panel extends Component {
    @property(Navigator) levels: Navigator = null;
    @property(Navigator) undos: Undo_Panel = null;
    @property(Navigator) transactions: Transaction_Panel = null;
}