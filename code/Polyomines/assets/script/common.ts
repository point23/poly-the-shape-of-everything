import { Game, _decorator, } from 'cc';
import { init_animation_state, human_animation_graph, animate, Character_Data, monster_animation_graph, stop_anim, start_anim } from './Character_Data';
import { $$, Const, Direction, array_remove } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { Main } from './Main';
import { Transaction_Manager } from './Transaction_Manager';
import { Game_Input, Game_Button, Button_State, Game_Input_Recorder } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
import { generate_player_action, generate_player_move } from './sokoban';
import { do_one_undo, undo_end_frame } from './undo';
import { Entity_Type, Game_Entity, get_hero_info } from './Game_Entity';
import { Gameplay_Timer } from './Gameplay_Timer';

export function init_animations() {
    const entity_manager = Entity_Manager.current;
    for (let h of entity_manager.by_type.Hero) {
        init_animation_state(h, human_animation_graph);
    }

    animate(entity_manager.active_hero, "activate");

    for (let m of entity_manager.by_type.Monster) {
        init_animation_state(m, monster_animation_graph);
    }
}

export function per_round_animation_update(entity: Game_Entity) {
    if (!human_animation_graph.available) return;
    const c = entity?.getComponent(Character_Data);
    if (!c) return;
    const state = c.anim_state;
    const node = c.anim_state.node;

    for (let t of state.defered_transitions) {
        t.delay -= 1;
        if (t.delay == 0) {
            array_remove(state.defered_transitions, t);
            animate(entity, t.msg, t.durtion);
            return;
        }
    }

    switch (entity.entity_type) {
        case Entity_Type.HERO: {
            // @Note There're some input related animation update.
            const input: Game_Input = Input_Manager.instance.game_input;
            if (!input) return;
            state.elapsed += 1;
            if (state.elapsed >= state.duration) {
                if (node.name == "run" || node.name == "push") {
                    if (!input.keep_pressing_moving_btn()) {
                        animate(entity, "stop");
                    }
                }

                if (node.name == "landing") {
                    animate(entity, "activate");
                }

                if (node.name == "victory") {
                    animate(entity, "activate");
                }

                if (node.name == "action") {
                    animate(entity, "activate");
                }

                if (node.name == "dead") {
                    stop_anim(entity);
                }
            }

            if (state.node.name == "active") {
                if (entity.is_in_control && input.keep_pressing_moving_btn() && input.buffered_player_moves.empty()) {
                    animate(entity, "run");
                }

                if (!get_hero_info(entity)?.is_active) {
                    animate(entity, "inactivate");
                }
            }

            if (state.node.name == "inactive") {
                if (entity.is_in_control && get_hero_info(entity)?.is_active) {
                    animate(entity, "activate");
                }
            }

            if (state.node.name == "dead") {
                if (entity.is_in_control && get_hero_info(entity)?.is_active) {
                    start_anim(entity);
                    animate(entity, "activate");
                }
            }
        } break;

        case Entity_Type.MONSTER: {
            state.elapsed += 1;
            if (state.elapsed >= state.duration) {
                if (node.name == "run" || node.name == "push") {
                    animate(entity, "stop");
                }

                if (node.name == "landing") {
                    animate(entity, "activate");
                }

                if (node.name == "victory") {
                    animate(entity, "activate");
                }

                if (node.name == "action") {
                    animate(entity, "activate");
                }

                if (node.name == "attack") {
                    animate(entity, "activate");
                }
            }

            if (state.node.name == "inactive") {
                if (entity.is_in_control && get_hero_info(entity)?.is_active) {
                    animate(entity, "activate");
                }
            }
        } break;
    }
}

export function update_inputs() {
    Input_Manager.instance.update_inputs();
}

export function process_inputs(recorder?: Game_Input_Recorder) {
    function process_single_button(button: Game_Button) {
        if (!button) return;

        switch (button) {
            case Game_Button.RESET: {
                $$.IS_RUNNING = false;
                $$.RELOADING = true;
                if ($$.FOR_EDITING) {
                    Level_Editor.instance.reload_current_level();
                } else {
                    Main.instance.reload_current_level();
                }
            } break;

            case Game_Button.UNDO: {
                do_one_undo(entity_manager);
            } break;

            case Game_Button.MOVE_BACKWARD: {
                generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 1);
            } break;
            case Game_Button.MOVE_FORWARD: {
                generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 1);
            } break;
            case Game_Button.MOVE_LEFT: {
                generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 1);
            } break;
            case Game_Button.MOVE_RIGHT: {
                generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 1);
            } break;

            case Game_Button.ACTION: {
                generate_player_action(transaction_manager, entity_manager);
            } break;

            case Game_Button.SWITCH_HERO: {
                entity_manager.switch_hero();
                undo_end_frame(entity_manager, true);
            } break;
        }
    }
    //#SCOPE

    if (!$$.IS_RUNNING) return;
    const entity_manager = Entity_Manager.current;
    const transaction_manager = Transaction_Manager.instance;
    if ($$.IS_REPLAYING && recorder) {
        const res = recorder.consume();
        if (res.succeed) {
            console.log(`b: ${res.button}, t: ${Gameplay_Timer.get_gameplay_time().round}`);
        }

        process_single_button(res.button);
    } else {
        const input: Game_Input = Input_Manager.instance.game_input;
        if (!input) return;

        const records = input.pending_records;
        const t_now = Gameplay_Timer.get_gameplay_time();

        if (!(input.button_states.get(Game_Button.UNDO)?.ended_down)) {
            $$.DOING_UNDO = false;
        }

        records.sort((a: Button_State, b: Button_State) => {// @Note a > b if a - b < 0,
            return a.counter - b.counter
        });

        let button_to_process: Game_Button = null;

        // Traverse through all pending records
        for (let record of input.pending_records) {
            const button = record.button;

            // @Note Some priority taste.
            if (button == Game_Button.RESET) {
                button_to_process = button;
            } else if (button == Game_Button.UNDO) {
                if (button_to_process != Game_Button.RESET)
                    button_to_process = button;
            } else {
                input.buffered_player_moves.enqueue(button);
            }
        }
        input.pending_records = [];

        if (!button_to_process
            && !$$.DOING_UNDO
            && !input.buffered_player_moves.empty()
            && !$$.PLAYER_MOVE_NOT_YET_EXECUTED) {

            while (input.buffered_player_moves.size() >= Const.WEIRD_USER_INPUT_COUNTS) { // @Note Handle weird user inputs.
                input.buffered_player_moves.storage.pop(); // @Hack
            }

            button_to_process = input.buffered_player_moves.dequeue();
        }

        if ($$.IS_RECORDING
            && recorder
            && button_to_process) {
            recorder.add(button_to_process, t_now);
        }

        process_single_button(button_to_process);
    }
}