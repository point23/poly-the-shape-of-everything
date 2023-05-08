import { _decorator, Component, Node, Label, tween, Color, Material, EventHandler, Button } from 'cc';
import { Audio_Manager, end_music, end_sfx, play_music, play_sfx } from './Audio_Manager';
import { Camera3D_Controller } from './Camera3D_Controller';
import { $$, Const } from './Const';
import { Efx_Manager } from './Efx_Manager';
import { Entity_Manager } from './Entity_Manager';
import { Gameplay_Timer } from './Gameplay_Timer';
import { Input_Manager } from './input/Input_Manager';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { generate_monster_moves, maybe_move_trams } from './sokoban';
import { Transaction_Manager } from './Transaction_Manager';
import { Game_Pause_Panel } from './ui/Game_Pause_Panel';
import { UI_Manager, fade_in, fade_out, hide_blinds, show_blinds, type } from './UI_Manager';
import { Undo_Handler, undo_end_frame } from './undo';
import { make_human_animation_graph, make_monster_animation_graph } from './Character_Data';
import { init_animations, per_round_animation_update, process_inputs, update_inputs } from './common';
import { Entity_Type } from './Game_Entity';
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
        make_human_animation_graph(); // @Note There're some aync? behaviour inside...
        make_monster_animation_graph(); // @Note There're some aync? behaviour inside...
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

        Gameplay_Timer.run(this, main_loop, [update_inputs]);
    }

    click_anywhere_to_start() {
        const fo = fade_out(this.title, 0, 2);
        fo.on_complete = () => {
            Gameplay_Timer.reset();
            $$.IS_RUNNING = true;
            $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;
        };
        fo.execute();

        end_music();
        this.dummy_panel.clickEvents = [];
        this.dummy_panel.node.active = false;
        this.label_press_any_xx_to_start.node.active = false;
    }

    game_pause() {
        play_sfx("click");
        $$.IS_RUNNING = false;
        this.game_pause_panel.node.active = true;
    }

    reload_current_level() {
        const game = this;

        clear(game);
        game.resource_manager.load_current_level(game, init);
    }

    show_and_hide_hints() {
        function stop_show_hints_immediately() {
            $$.SHOWING_HINTS = false;
            end_sfx();
            hints.forEach(it => { it.node.active = false; });
        }
        //#SCOPE
        const hints = this.entity_manager.by_type.Hint;
        const mat = this.hint_mat;

        play_sfx("click");
        if ($$.SHOWING_HINTS) return;
        $$.SHOWING_HINTS = true;

        if (hints.length == 0) {
            play_sfx("wrong");
            $$.SHOWING_HINTS = false;
            return;
        }

        play_sfx("magic");
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

            play_music("intro");
            $$.STARTUP = false;

            { // Click to start
                const e = new EventHandler();
                e.target = game.node;
                e.component = 'Main';
                e.handler = 'click_anywhere_to_start';
                game.dummy_panel.clickEvents.push(e);
            }

            const hb = hide_blinds(game.dim, 2, 1);
            hb.execute();

            const fi = fade_in(game.title, 3, 2);
            const typer_0 = type(game.label_credit_in_title, "A game by point23.", 0, 2, Infinity);
            const typer_1 = type(game.label_press_any_xx_to_start, "Click anywhere to start", 0, 3, Infinity);
            typer_1.on_complete = () => { game.dummy_panel.node.active = true; };

            fi.successor = typer_0;
            typer_0.successor = typer_1;

            fi.execute();

        } else {
            const typer = type(game.label_level_name, resource.current_level.name, 0, 2, 1);
            const hb = hide_blinds(game.dim, 3, 1);
            hb.on_complete = () => {
                Input_Manager.instance.init();
                Gameplay_Timer.reset();
                $$.IS_RUNNING = true;
                $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;
                init_animations();
            };

            typer.execute();
            hb.execute();
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

    const input = game.input_manager;
    const resource = game.resource_manager;
    const transaction = game.transaction_manager;
    const config = resource.current_level_config;

    init_ui();
    init_camera();
    init_entities();
    init_animations();
    input.init();

    $$.RELOADING = false;

    $$.DURATION_IDX = Const.DEFAULT_DURATION_IDX;
    transaction.clear();
}

function main_loop() {
    const transaction_manager = Transaction_Manager.instance;
    const entity_manager = Entity_Manager.current;
    const game = Main.instance;

    process_inputs();

    if (entity_manager) {
        for (let e of entity_manager?.by_type.Hero) {
            per_round_animation_update(e);
        }

        for (let e of entity_manager.by_type.Monster) {
            per_round_animation_update(e);
        }
    }

    if ($$.IS_RUNNING && !$$.DOING_UNDO && !$$.RELOADING) {
        const pending_enter = entity_manager.entering_other_level;
        if (pending_enter.entering) {
            play_sfx("win!"); // @Todo Maybe there should be another clip for entering?
            $$.IS_RUNNING = false;
            const sb = show_blinds(game.dim, 1, 1);
            sb.on_complete = () => {
                load_level(game, pending_enter.idx);
            };
            sb.execute();
        }

        if (entity_manager.pending_win) {
            play_sfx("win!");
            $$.IS_RUNNING = false;
            const sb = show_blinds(game.dim, 1, 1);
            sb.on_complete = () => {
                load_succeed_level(game);
            };
            sb.execute();
        }

        maybe_move_trams(transaction_manager);
        transaction_manager.update_transactions();

        if (!$$.SWITCH_TURNED_ON) {
            if (entity_manager.switch_turned_on) {
                $$.SWITCH_TURNED_ON = true;
                play_sfx("power");
            }
        } else {
            $$.SWITCH_TURNED_ON = entity_manager.switch_turned_on;
        }
    }

    const now = Gameplay_Timer.get_gameplay_time();
    if ($$.SHOULD_UNDO_AT == now.round) {
        $$.PLAYER_MOVE_NOT_YET_EXECUTED = false;
        undo_end_frame(entity_manager);
    }

    if ($$.SHOULD_GENERATE_MONSTER_MOVE_AT == now.round) {
        generate_monster_moves(transaction_manager, entity_manager);
    }
}