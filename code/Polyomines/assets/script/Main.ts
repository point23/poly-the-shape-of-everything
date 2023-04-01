import { _decorator, Component, Node, Input, Label, tween, Color, Material, EventHandler, Button } from 'cc';
import { Audio_Manager } from './Audio_Manager';
import { Camera3D_Controller } from './Camera3D_Controller';
import { $$, Const, Direction } from './Const';
import { Efx_Manager } from './Efx_Manager';
import { Entity_Manager } from './Entity_Manager';
import { ended_down, Game_Button } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { generate_controller_proc, generate_rover_moves_if_switch_turned_on } from './sokoban';
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

    @property(Button) btn_settings: Button = null;
    @property(Button) btn_hints: Button = null;

    @property(Game_Pause_Panel) game_pause_panel = null;

    @property(Material) hint_mat: Material = null;

    onLoad() {
        this.settle_singletons();

        Resource_Manager.instance.load_levels(this, init);
    }

    start() {
        { // Settings
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Main";
            e.handler = "game_pause";
            this.btn_settings.clickEvents.push(e);
        }
        { // Hints
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Main";
            e.handler = "show_and_hide_hints";
            this.btn_hints.clickEvents.push(e);
        }

        this.schedule(this.tick, Const.Tick_Interval);
    }

    get_gameplay_time(): number {
        return this.#round;
    }

    set_gameplay_time(t: number) {
        this.#round = t;
    }

    get ticks_per_loop(): number {
        return Const.Ticks_Per_Loop[this.transaction_manager.duration_idx];
    };

    #round: number = 0;
    #tick: number = 0;
    tick() {
        if ((this.#tick % this.ticks_per_loop) == 0) {
            this.main_loop();
        }
        this.#tick = (this.#tick + 1) % (1 << 16);
    }

    startup: boolean = true;
    switch_turned_on: boolean = false;
    main_loop() {
        // @fixme About Sampling!!!
        if (!$$.IS_RUNNING) return;

        const transaction_manager = Transaction_Manager.instance;
        const game = this;

        this.process_inputs();

        if (!$$.DOING_UNDO && !$$.RELOADING) {
            generate_rover_moves_if_switch_turned_on(transaction_manager, this.#round);
            transaction_manager.execute();
            this.#round = (this.#round + 1) % (1 << 8);

            if (!this.switch_turned_on) { // @note Make some noise when switch is turned on...
                if (this.entity_manager.switch_turned_on) {
                    this.switch_turned_on = true;
                    Audio_Manager.instance.play(Audio_Manager.instance.switch_turned_on);
                }
            } else {
                this.switch_turned_on = this.entity_manager.switch_turned_on;
            }

            const pending_entering = this.entity_manager.entering_other_level;
            if (pending_entering.entering) {
                Audio_Manager.instance.play(Audio_Manager.instance.pending_win);
                $$.IS_RUNNING = false;
                this.ui_manager.show_and_hide({
                    target: game.dim,
                    show_delay: 1,
                    show_duration: 1,
                    hide_delay: 0,
                    hide_duration: 0,
                    type: Show_Hide_Type.BLINDS,
                    callback: () => {
                        load_level(this, pending_entering.idx);
                    }
                });
            }

            if (this.entity_manager.pending_win) {
                Audio_Manager.instance.play(Audio_Manager.instance.pending_win);
                $$.IS_RUNNING = false;
                this.ui_manager.show_and_hide({
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

    process_inputs() {
        if (!$$.IS_RUNNING) return;

        const entity_manager = this.entity_manager;
        const transaction_manager = this.transaction_manager;
        const input = this.input_manager.game_input;
        const game = this;

        if (!ended_down(input.button_states, Game_Button.UNDO))
            $$.DOING_UNDO = false;

        for (let i of input.pending_record) {
            if (i == Game_Button.RESET) {
                $$.RELOADING = true;
                reload_current_level(game);
            }

            if (i == Game_Button.UNDO) {
                $$.DOING_UNDO = true;
                do_one_undo(entity_manager);
                Audio_Manager.instance.play(Audio_Manager.instance.rewind);
            }

            if (i == Game_Button.SWITCH_HERO) {
                if (entity_manager.num_heros == 1) {
                    Audio_Manager.instance.play(Audio_Manager.instance.invalid);
                } else {
                    entity_manager.switch_hero();
                    Audio_Manager.instance.play(Audio_Manager.instance.switch_hero);
                }
            }

            // Move
            if (i == Game_Button.MOVE_BACKWARD) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.BACKWORD, 1);
            }
            if (i == Game_Button.MOVE_FORWARD) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.FORWARD, 1);
            }
            if (i == Game_Button.MOVE_LEFT) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.LEFT, 1);
            }
            if (i == Game_Button.MOVE_RIGHT) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.RIGHT, 1);
            }

            // Rotate
            if (i == Game_Button.FACE_BACKWARD) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.BACKWORD, 0);
            }
            if (i == Game_Button.FACE_FORWARD) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.FORWARD, 0);
            }
            if (i == Game_Button.FACE_LEFT) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.LEFT, 0);
            }
            if (i == Game_Button.FACE_RIGHT) {
                generate_controller_proc(transaction_manager, entity_manager, Direction.RIGHT, 0);
            }
        }

        input.pending_record = [];
    }

    click_anywhere_to_start() {
        this.ui_manager.hide({
            target: this.title,
            hide_delay: 0,
            hide_duration: 2,
            type: Show_Hide_Type.FADE,
            callback: () => {
                $$.IS_RUNNING = true;
                this.set_gameplay_time(0);
                Input_Manager.instance.init();
            }
        });

        this.audio_manager.end_loop();
        this.dummy_panel.clickEvents = [];
        this.dummy_panel.node.active = false;
        this.label_press_any_xx_to_start.node.active = false;
    }

    game_pause() {
        Audio_Manager.instance.play(Audio_Manager.instance.click);
        $$.IS_RUNNING = false;
        this.game_pause_panel.node.active = true;
    }

    #showing_hints: boolean = false;
    show_and_hide_hints() {
        Audio_Manager.instance.play(Audio_Manager.instance.click);
        if (this.#showing_hints) return;
        // VFX?
        const hints = this.entity_manager.hints;
        if (hints.length == 0) {
            Audio_Manager.instance.play(Audio_Manager.instance.invalid);
            return;
        }

        Audio_Manager.instance.play(Audio_Manager.instance.show_hints);
        hints.forEach(it => { it.node.active = true; });
        const mat = this.hint_mat;
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
    game.switch_turned_on = false; // @hack 
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
        if (game.startup) {
            Audio_Manager.instance.loop(Audio_Manager.instance.main_theme);
            game.startup = false;

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
                    // @todo Maybe i should chained them together?

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
                                    { // @note Click the touch panel
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
                    $$.IS_RUNNING = true;
                    game.set_gameplay_time(0);
                    Input_Manager.instance.init();
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
    const transaction = game.transaction_manager;
    const config = resource.current_level_config;

    init_ui();
    init_camera();
    init_entities();

    $$.RELOADING = false;

    transaction.duration_idx = Const.Init_Duration_Idx;
    transaction.clear();
}