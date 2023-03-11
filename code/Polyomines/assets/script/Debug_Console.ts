import { _decorator, Component, Node, RichText } from 'cc';
const { ccclass, property } = _decorator;

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
    @property(RichText) transactions_txt: RichText;

    static Info(txt: string) {
        Debug_Console.instance.info(txt);
    }

    static Warn(txt: string) {
        Debug_Console.instance.warn(txt);
    }

    static Error(txt: string) {
        Debug_Console.instance.error(txt);
    }

    static Print_Transaction(txt: string) {
        Debug_Console.instance.print_transaction(txt);
    }

    info(txt: string) {
        this.log(Log_Mode.INFO, txt);
    }

    warn(txt: string) {
        this.log(Log_Mode.WARN, txt);
    }

    error(txt: string) {
        this.log(Log_Mode.ERR, txt);
    }

    private log(mode: Log_Mode, txt: string) {
        let color: string = null;
        switch (mode) {
            case Log_Mode.INFO:
                color = '#DBCCB4';
                break;
            case Log_Mode.WARN:
                color = 'yellow';
                break;
            case Log_Mode.ERR:
                color = 'red';
                break;
            default:
                color = 'white';
                break;
        }

        this.log_txt.string = `<color=${color}>${txt}</color>\n`;;
        this.scheduleOnce(() => {
            this.log_txt.string = "";
        }, 10);
    }

    private print_transaction(t: string) {
        this.transactions_txt.string = `< color=white> ${t} </color>\n`;
        this.scheduleOnce(() => {
            this.transactions_txt.string = "";
        }, 10);
    }
}
