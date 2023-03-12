import { _decorator, Component, Node, Button, EventHandler } from 'cc';
import { Entity_Edit_Mode } from '../modes/Entity_Edit_Mode';
import { Button_Group } from './Button_Group';
import { Navigator } from './Navigator';
const { ccclass, property } = _decorator;

@ccclass('Level_Editor_Panel')
export class Level_Editor_Panel extends Component {
    @property(Navigator) levels: Navigator = null;
    @property(Button) btn_save: Button = null;
    @property(Button_Group) modes: Button_Group = null;
}