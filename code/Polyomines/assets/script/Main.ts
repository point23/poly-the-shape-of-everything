import { _decorator, Component, Node, Input, Label, tween, Color, Material, EventHandler, Button } from 'cc';
import { Audio_Manager } from './Audio_Manager';
import { Camera3D_Controller } from './Camera3D_Controller';
import { $$, Const, Direction } from './Const';
import { Efx_Manager } from './Efx_Manager';
import { Entity_Manager } from './Entity_Manager';
import { Gameplay_Timer } from './Gameplay_Timer';
import { Button_State, Game_Button, Game_Input } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { generate_player_move, maybe_move_trams } from './sokoban';
import { Transaction_Manager } from './Transaction_Manager';
import { Game_Pause_Panel } from './ui/Game_Pause_Panel';
import { Show_Hide_Type, UI_Manager } from './UI_Manager';
import { do_one_undo, Undo_Handler } from './undo';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    static instance: Main;

    @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller = null;
    @property(Resource_Manager) resource_manager: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;
    @property(UI_Manager) ui_manager: UI_Manager = null;
    @property(Input_Manager) input_manager: Input_Manager = null;
    @property(Audio_Manager) audio_manager: Audio_Manager = null;
    @property(Efx_Manager) efx_manager: Efx_Manager = null;

    entity_manager: Entity_Manager = null;

    @property(Label) label_credit_in_title: Label = null;
    @property(Label) label_level_name: Label = null;
    @property(Label) label_press_any_xx_to_start: Label = null;

    @property(Node) title: Node = null;
    @property(Node) dim: Node = null;
    @property(Button) dummy_panel: Button = null;

    @property(Button) btn_options: Button = null;
    @property(Button) btn_hints: Button = null;
    @property(Game_Pause_Panel) game_pause_panel = null;

    @property(Material) hint_mat: Material = null;

    onLoad() {
        this.settle_singletons();
        $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;
        Resource_Manager.instance.load_levels(this, init);
    }

    start() {
        { // Settings
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Main";
            e.handler = "game_pause";
            this.btn_options.clickEvents.push(e);
        }
        { // Hints
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Main";
            e.handler = "show_and_hide_hints";
            this.btn_hints.clickEvents.push(e);
        }

        Gameplay_Timer.run(this, main_loop);
    }

    click_anywhere_to_start() {
        this.ui_manager.hide({
            target: this.title,
            hide_delay: 0,
            hide_duration: 2,
            type: Show_Hide_Type.FADE,
            callback: () => {
                Input_Manager.instance.init();
                Gameplay_Timer.reset();
                $$.IS_RUNNING = true;
            }
        });

        this.audio_manager.end_loop();
        this.dummy_panel.clickEvents = [];
        this.dummy_panel.node.active = false;
        this.label_press_any_xx_to_start.node.active = false;
    }

    game_pause() {
        Audio_Manager.instance.play_sfx(Audio_Manager.instance.click);
        $$.IS_RUNNING = false;
        this.game_pause_panel.node.active = true;
    }

    show_and_hide_hints() {
        function stop_show_hints_immediately() {
            $$.SHOWING_HINTS = false;
            audio.end_sfx();
            hints.forEach(it => { it.node.active = false; });
        }
        //#SCOPE
        const hints = this.entity_manager.hints;
        const audio = Audio_Manager.instance;
        const mat = this.hint_mat;

        Audio_Manager.instance.play_sfx(Audio_Manager.instance.click);
        if ($$.SHOWING_HINTS) return;
        $$.SHOWING_HINTS = true;

        if (hints.length == 0) {
            audio.play_sfx(audio.invalid);
            $$.SHOWING_HINTS = false;
            return;
        }

        audio.play_sfx(audio.show_hints);
        hints.forEach(it => { it.node.active = true; });
        mat.setProperty('mainColor', Const.HINTS_HIDE_COLOR);

        type bind_target = { alpha: number };
        let t = { alpha: 0 };
        tween(t)
            .to(Const.HINTS_DURATION,
                {
                    alpha: Const.HINTS_SHOW_COLOR.a,
                },
                {
                    easing: "cubicOut",
                    onUpdate(b: bind_target) {
                        const color = new Color().set(Const.HINTS_SHOW_COLOR);
                        color.a = b.alpha;
                        mat.setProperty('mainColor', color);

                        if (!$$.IS_RUNNING) {
                            stop_show_hints_immediately();
                        }
                    }
                })
            .delay(0)
            .to(Const.HINTS_DURATION,
                {
                    alpha: 0,
                },
                {
                    easing: "cubicIn",
                    onUpdate(b: bind_target) {
                        const color = new Color().set(Const.HINTS_SHOW_COLOR);
                        color.a = b.alpha;
                        mat.setProperty('mainColor', color);

                        if (!$$.IS_RUNNING) {
                            stop_show_hints_immediately();
                        }
                    }
                })
            .call(() => {
                hints.forEach(it => { it.node.active = false; });
            })
            .start();
    }

    settle_singletons() {
        Main.instance = this;
        Input_Manager.Settle(this.input_manager);
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        UI_Manager.Settle(this.ui_manager);
        Efx_Manager.Settle(this.efx_manager);
        Audio_Manager.Settle(this.audio_manager);
    }
}

function load_level(game: Main, idx: number) {
    clear(game);
    game.resource_manager.load_level(idx, game, init);
}

export function load_succeed_level(game: Main) {
    clear(game);
    game.resource_manager.load_succeed_level(game, init);
}

function reload_current_level(game: Main) {
    clear(game);
    game.resource_manager.load_current_level(game, init);
}

function clear(game: Main) {
    $$.IS_RUNNING = false;
    $$.RELOADING = true;

    const entity_manager = game.entity_manager;
    const input_manager = game.input_manager;

    input_manager.clear();
    entity_manager.all_entities.forEach((it) => { it.node.destroy(); });
    Entity_Manager.current = null;
}

function init(game: Main) {
    function init_ui() {
        if ($$.STARTUP) {
            audio.loop(audio.main_theme);
            $$.STARTUP = false;

            ui.show_and_hide({
                target: game.dim,
                show_delay: 0,
                show_duration: 0,
                hide_delay: 2,
                hide_duration: 1,
                type: Show_Hide_Type.BLINDS,
                callback: () => { }
            });

            ui.show({
                target: game.title,
                show_delay: 3,
                show_duration: 2,
                type: Show_Hide_Type.FADE,
                callback: () => {
                    // @Todo Maybe i should chained them together?

                    ui.typer({
                        label: game.label_credit_in_title,
                        content: "A game by point23",
                        show_delay: 0,
                        duration: 2,
                        hide_delay: Infinity,
                        callback: () => {

                            ui.typer({
                                label: game.label_press_any_xx_to_start,
                                content: "Click anywhere to start",
                                show_delay: 0,
                                duration: 3,
                                hide_delay: Infinity,
                                callback: () => {
                                    { // @Note Click the touch panel
                                        const e = new EventHandler();
                                        e.target = game.node;
                                        e.component = 'Main';
                                        e.handler = 'click_anywhere_to_start';
                                        game.dummy_panel.clickEvents.push(e);
                                        game.dummy_panel.node.active = true;
                                    }
                                },
                            })
                        },
                    });
                }
            });
        } else {
            ui.typer({
                label: game.label_level_name,
                content: resource.current_level.name,
                show_delay: 0,
                duration: 2,
                hide_delay: 1,
                callback: () => { },
            });

            ui.show_and_hide({
                target: game.dim,
                show_delay: 0,
                show_duration: 0,
                hide_delay: 3,
                hide_duration: 1,
                type: Show_Hide_Type.BLINDS,
                callback: () => {
                    Input_Manager.instance.init();
                    Gameplay_Timer.reset();
                    $$.IS_RUNNING = true;
                }
            });
        }
    }

    function init_camera() {
        game.camera3d_controller.update_view(config.camera);
    }

    function init_entities() {
        const grid = new Proximity_Grid(config.grid);

        const entity_manager = new Entity_Manager(grid);

        const undo = new Undo_Handler();
        entity_manager.undo_handler = undo;
        undo.manager = entity_manager;

        entity_manager.load_entities(config.entities);
        Entity_Manager.current = entity_manager;
        game.entity_manager = entity_manager;
    }
    //#SCOPE

    const ui = game.ui_manager;
    const resource = game.resource_manager;
    const audio = game.audio_manager;
    const transaction = game.transaction_manager;
    const config = resource.current_level_config;

    init_ui();
    init_camera();
    init_entities();

    $$.RELOADING = false;

    $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;
    transaction.clear();
}

function main_loop() {
    const transaction_manager = Transaction_Manager.instance;
    const entity_manager = Entity_Manager.current;
    const ui = UI_Manager.instance;
    const game = Main.instance;
    const audio = Audio_Manager.instance;

    process_inputs();
    if (!$$.DOING_UNDO && !$$.RELOADING) {
        maybe_move_trams(transaction_manager);
        transaction_manager.update_transactions();

        if (!$$.SWITCH_TURNED_ON) {
            if (entity_manager.switch_turned_on) {
                $$.SWITCH_TURNED_ON = true;
                audio.play_sfx(Audio_Manager.instance.switch_turned_on);
            }
        } else {
            $$.SWITCH_TURNED_ON = entity_manager.switch_turned_on;
        }

        const pending_enter = entity_manager.entering_other_level;
        if (pending_enter.entering) {
            audio.play_sfx(audio.pending_win);
            $$.IS_RUNNING = false;
            ui.show_and_hide({
                target: game.dim,
                show_delay: 1,
                show_duration: 1,
                hide_delay: 0,
                hide_duration: 0,
                type: Show_Hide_Type.BLINDS,
                callback: () => {
                    load_level(game, pending_enter.idx);
                }
            });
        }

        if (entity_manager.pending_win) {
            Audio_Manager.instance.play_sfx(Audio_Manager.instance.pending_win);
            $$.IS_RUNNING = false;
            ui.show_and_hide({
                target: game.dim,
                show_delay: 1,
                show_duration: 1,
                hide_delay: 0,
                hide_duration: 0,
                type: Show_Hide_Type.BLINDS,
                callback: () => {
                    load_succeed_level(game);
                }
            });
        }
    }
}

function process_inputs() {
    if (!$$.IS_RUNNING) return;

    const entity_manager = Entity_Manager.current;
    const transaction_manager = Transaction_Manager.instance;
    const input: Game_Input = Input_Manager.instance.game_input;
    const game = Main.instance;
    const audio = Audio_Manager.instance;
    const records = input.pending_records;

    if (!(input.button_states.get(Game_Button.UNDO).ended_down)) {
        $$.DOING_UNDO = false;
    }

    records.sort((a: Button_State, b: Button_State) => { return a.counter - b.counter });// @Note a > b if a - b < 0,

    for (let record of input.pending_records) {
        const button = record.button;

        if (button == Game_Button.RESET) {
            $$.RELOADING = true;
            reload_current_level(game);
        }

        if (button == Game_Button.UNDO) {
            $$.DOING_UNDO = true;
            do_one_undo(entity_manager);
        }

        if (button == Game_Button.SWITCH_HERO) {
            if (entity_manager.num_heros == 1) {
                audio.play_sfx(audio.invalid);
            } else {
                entity_manager.switch_hero();
                audio.play_sfx(audio.switch_hero);
            }
        }

        // Move
        if (button == Game_Button.MOVE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 1);
        }
        if (button == Game_Button.MOVE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 1);
        }
        if (button == Game_Button.MOVE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 1);
        }
        if (button == Game_Button.MOVE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 1);
        }

        // Rotate
        if (button == Game_Button.FACE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 0);
        }
        if (button == Game_Button.FACE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 0);
        }
        if (button == Game_Button.FACE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 0);
        }
        if (button == Game_Button.FACE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 0);
        }
    }

    input.pending_records = [];
}