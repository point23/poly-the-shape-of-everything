## Ocean

### Structs

```typescript
class Flow_Updater extends Game_Entity {
    erasing: boolean = false;
    desired_direction: Direction;
    wave_visual_position: Vec3;
    wave_dir: Vec3;
    particle_group_id;
}
```



### Functions

```typescript
function begin_ocean_pass (manager: Entity_Manager) {
	if (!initted) init();
	
	update_ocean_texture(manager);
}

function draw_ocrean(manager: Entity_Manager, map: Ocean_Map) {
	set_matrix_for_entities(manager, v2(0,0));
	
	// Entity Parameters?
	
	set_shader(shader_ocean);
	bind_global_parameters(manager, current_shader);
	bind_material_parameters(current_shader, material_ocean);
	
	now = get_gameplay_time_float(manager);
	// ocean_t_a
	draw_ocean(map, ocean_t_a, offset, OCEAN_GEOMETRY_Z, 1);
}

function draw_flow_updaters(manager: Entity_Manager, map: Ocean_Map, offset: Vec2) {
    
}
```





## Splash

![image-20230308000155386](Water%20Stuff.assets/image-20230308000155386.png)



```
perform_splash(e: Entity) {
	play_sound(e, "rock_splash");
	
	spawn_particle_group_at(e.entity_manager, e.position, "splash");
}
```

