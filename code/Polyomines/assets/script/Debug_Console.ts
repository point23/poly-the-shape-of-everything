import {_decorator, Component, Node, RichText} from 'cc';
const {ccclass, property} = _decorator;

enum Log_Mode {
  INFO,
  WARN,
  ERR,
}

@ccclass('Debug_Console')
export class Debug_Console extends Component {
  public static instance: Debug_Console = null;
  public static Settle(instance: Debug_Console) {
    Debug_Console.instance = instance;
  }

  @property(RichText) log_txt: RichText;

  static Info(txt: string) {
    Debug_Console.instance.Info(txt);
  }

  Info(txt: string) {
    this.log(Log_Mode.INFO, txt);
  }

  Warn(txt: string) {
    this.log(Log_Mode.WARN, txt);
  }

  Error(txt: string) {
    this.log(Log_Mode.ERR, txt);
  }

  private log(mode: Log_Mode, txt: string) {
    let color: string = 'white';
    switch (mode) {
      case Log_Mode.INFO:
        color = 'green';
        break;
      case Log_Mode.WARN:
        color = 'yellow';
        break;
      case Log_Mode.ERR:
        color = 'red';
        break;
    }

    this.log_txt.string = `<color=${color}>${txt}</color>`;
    let delay = 2;
    this.scheduleOnce(() => {
      this.log_txt.string = '';
    }, delay);
  }
}
