System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, find, Size, Game_Board, _dec, _class, _crd, ccclass, property, Main;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      find = _cc.find;
      Size = _cc.Size;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8eeb1JJfflAxIpigFBqMuBI", "Main", undefined);

      __checkObsolete__(['_decorator', 'Component', 'find', 'game', 'Game', 'Mesh', 'MeshRenderer', 'Node', 'profiler', 'Quat', 'Size', 'Vec4']);

      ({
        ccclass,
        property
      } = _decorator);
      Game_Board = class Game_Board {
        constructor(node, grid_size) {
          this.node = void 0;
          this.grid_size = void 0;
          this.node = node;
          this.grid_size = grid_size;
        }

        init() {}

        showGrid() {}

        showAxis() {}

      };

      _export("Main", Main = (_dec = ccclass('Main'), _dec(_class = class Main extends Component {
        constructor(...args) {
          super(...args);
          this.game_board = void 0;
        }

        start() {
          let game_board_node = find('Game_Board');
          this.game_board = new Game_Board(game_board_node, new Size(10, 10));
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=56c8ce25eba8da51b95ba5974b065ea16698ce07.js.map