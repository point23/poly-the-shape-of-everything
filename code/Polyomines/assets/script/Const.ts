import {Color, Quat, Vec3} from 'cc';

export class Const {
  /** FIXME Don't use absolute path... */
  static Data_Path: string =
      'A:/code/poly/code/Polyomines/assets/resources/data';
  static Default_Level: string = 'level#001';

  static Tick_Interval: number = 0.1;

  static Game_Board_Square_Size = 1;
  static Game_Board_Half_Square_Size = 0.5;
  static Game_Board_Orgin_Pos = new Vec3(0, 0, 0);

  static Mouse_Jiggling_Interval = 0.01;
  static Double_Click_Time_Interval = 0.25;

  static Cover_Selected_Color = new Color(0, 255, 0, 64);
  static Cover_Invalid_Color = new Color(255, 0, 0, 64);
  static Cover_Normal_Color = new Color(255, 255, 255, 0);

  static RADIUS_45: number = 0.25 * Math.PI;
  static RADIUS_90: number = 0.5 * Math.PI;
  static RADIUS_135: number = 0.75 * Math.PI;
  static RADIUS_180: number = Math.PI;
  static RADIUS_225: number = 1.25 * Math.PI;
  static RADIUS_270: number = 1.5 * Math.PI;
  static RADIUS_315: number = 1.75 * Math.PI;

  static Direction2Quat: Quat[] = [
    /* RIGHT */ new Quat(0, 0, 0, Math.cos(0)),
    /* LEFT */
    new Quat(0, Math.sin(this.RADIUS_90), 0, Math.cos(this.RADIUS_90)),
    /* FORWARD */
    new Quat(0, Math.sin(-this.RADIUS_45), 0, Math.cos(-this.RADIUS_45)),
    /* BACKWARD */
    new Quat(0, Math.sin(this.RADIUS_45), 0, Math.cos(this.RADIUS_45)),
    /* UP */ new Quat(0, 0, 0, 1),
    /* DOWN */ new Quat(0, 0, 0, 1),
  ];

  static Direction2Vec3: Vec3[] = [
    /* RIGHT */ new Vec3(1, 0, 0),
    /* LEFT */ new Vec3(-1, 0, 0),
    /* FORWARD */ new Vec3(0, -1, 0),
    /* BACKWARD */ new Vec3(0, 1, 0),
    /* UP */ new Vec3(0, 0, -1),
    /* DOWN */ new Vec3(0, 0, 1),
  ];

  static Polyomino_Deltas: Vec3[][][] = [
    /* Monomino */
    [],
    /* Domino */
    [
      /* RIGHT */[new Vec3(1, 0, 0)],
      /* LEFT */[new Vec3(-1, 0, 0)],
      /* FORWARD */[new Vec3(0, -1, 0)],
      /* BACKWARD */[new Vec3(0, 1, 0)],
      /* UP */[new Vec3(0, 0, -1)],
      /* DOWN */[new Vec3(0, 0, 1)],
    ],
  ];
}