import { _decorator, Component, Node, Input, Label, tween, Color, Material } from 'cc';
import { Audio_Manager } from './Audio_Manager';
import { Camera3D_Controller } from './Camera3D_Controller';
import { $$, Const } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Game_Button } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
import { Proximity_Grid } from './Proximity_Grid';
import { Resource_Manager } from './Resource_Manager';
import { generate_controller_proc, generate_rover_moves_if_switch_turned_on } from './sokoban';
import { Transaction_Manager } from './Transaction_Manager';
import { Show_Hide_Type, UI_Manager } from './UI_Manager';
import { do_one_undo, Undo_Handler } from './undo';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends Component {
    @property(Camera3D_Controller) camera3d_controller: Camera3D_Controller = null;
    @property(Resource_Manager) resource_manager: Resource_Manager = null;
    @property(Transaction_Manager) transaction_manager: Transaction_Manager = null;
    @property(UI_Manager) ui_manager: UI_Manager = null;
    @property(Input_Manager) input_manager: Input_Manager = null;
    @property(Audio_Manager) audio_manager: Audio_Manager = null;

    entity_manager: Entity_Manager = null;

    @property(Label) label_level_name: Label = null;
    @property(Node) title: Node = null;
    @property(Node) dim: Node = null;

    @property(Material) hint_mat: Material = null;

    onLoad() {
        this.settle_singletons();
        Resource_Manager.instance.load_levels(this, init);
    }

    start() {
        this.schedule(this.tick, Const.Tick_Interval);
        this.ui_manager.show_and_hide({
            target: this.title,
            show_delay: 2,
            show_duration: 2,
            hide_delay: 2,
            hide_duration: 2,
            type: Show_Hide_Type.FADE,
            callback: () => {
                Audio_Manager.instance.end_loop();
            }
        });
    }

    get ticks_per_loop(): number {
        return Const.Ticks_Per_Loop[Transaction_Manager.instance.duration_idx];
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
        if (!$$.IS_RUNNING) return;

        const transaction_manager = Transaction_Manager.instance;
        const game = this;

        this.process_inputs();

        if (!$$.DOING_UNDO && !$$.RELOADING) {
            generate_rover_moves_if_switch_turned_on(transaction_manager, this.#round);
            transaction_manager.execute();
            this.#round = (this.#round + 1) % (1 << 16);

            if (!this.switch_turned_on) { // @hack
                if (this.entity_manager.switch_turned_on) {
                    this.switch_turned_on = true;
                    Audio_Manager.instance.play(Audio_Manager.instance.switch_turned_on);
                }
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

        $$.DOING_UNDO = false;
    }

    process_inputs() {
        const entity_manager = this.entity_manager;
        const transaction_manager = this.transaction_manager;
        const input = this.input_manager.game_input;
        const game = this;

        if (!input.availble) return;
        if (input.button_states[Game_Button.RESET]) {
            $$.RELOADING = true;
            load_current_level(game);
        } else if (input.button_states[Game_Button.UNDO]) {
            $$.DOING_UNDO = true;
            do_one_undo(entity_manager);
            Audio_Manager.instance.play(Audio_Manager.instance.rewind);
        } else if (input.button_states[Game_Button.HINTS]) {
            game.show_hints();
        } else if (input.button_states[Game_Button.SWITCH_HERO]) {
            Audio_Manager.instance.play(Audio_Manager.instance.switch_hero);
            entity_manager.switch_hero();
        } else if (input.moved || input.rotated) {
            let direction = 0;
            const step = input.moved ? 1 : 0;

            for (let i = Game_Button.MOVE_LEFT; i <= Game_Button.FACE_BACKWARD; i++) {
                if (input.button_states[i]) {
                    direction = i % 4;
                    break;
                }
            }
            generate_controller_proc(transaction_manager, entity_manager, direction, step);
        }
        input.reset();
    }

    #showing_hints: boolean = false;
    show_hints() {
        if (this.#showing_hints) return;

        // VFX?
        Audio_Manager.instance.secondary_audio.volume = 0.2;
        Audio_Manager.instance.play(Audio_Manager.instance.show_hints);
        const hints = this.entity_manager.hints;

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
                Audio_Manager.instance.secondary_audio.volume = 1;
            })
            .start();
    }

    settle_singletons() {
        Input_Manager.Settle(this.input_manager);
        Resource_Manager.Settle(this.resource_manager);
        Transaction_Manager.Settle(this.transaction_manager);
        UI_Manager.Settle(this.ui_manager);
        Audio_Manager.Settle(this.audio_manager);
    }
}

function load_succeed_level(game: Main) {
    clear(game);
    game.resource_manager.load_succeed_level(game, init);
}

function load_current_level(game: Main) {
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
        } else {
            ui.typer({
                label: game.label_level_name,
                content: resource.current_level.name,
                show_delay: 0,
                duration: 2,
                hide_delay: 1,
                callback: () => { },
            });
        }

        ui.show_and_hide({
            target: game.dim,
            show_delay: 0,
            show_duration: 0,
            hide_delay: 2,
            hide_duration: 1,
            type: Show_Hide_Type.BLINDS,
            callback: () => {
                $$.IS_RUNNING = true;
                Input_Manager.instance.init();
            }
        });
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