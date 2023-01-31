import {Vec3} from 'cc';

export class Const {
  /** FIXME Don't use absolute path... */
  static Data_Path: string =
      'A:/code/poly/code/Polyomines/assets/resources/data';
  static Default_Level: string = 'level#001';

  static Game_Board_Square_Size = 1;
  static Game_Board_Half_Square_Size = 0.5;
  static Game_Board_Orgin_Pos = new Vec3(0, 0, 0);

  static Mouse_Jiggling_Interval = 0.01;
  static Double_Click_Time_Interval = 0.25;

  static Selected_Albedo_Scale = new Vec3(4, 1, 1);
  static Normal_Albedo_Scale = new Vec3(1, 1, 1);
}
