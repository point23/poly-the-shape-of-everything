System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, find, _dec, _class, _crd, ccclass, property, Main;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      find = _cc.find;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8eeb1JJfflAxIpigFBqMuBI", "Main", undefined);

      __checkObsolete__(['_decorator', 'Component', 'find', 'game', 'Game', 'Mesh', 'MeshRenderer', 'Node', 'profiler', 'Quat', 'Size', 'Vec4']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Main", Main = (_dec = ccclass('Main'), _dec(_class = class Main extends Component {
        start() {
          var game_board_node = find('Game_Board');
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=29db4cd4bf79d06f5a538ee8235b3acf46306a32.js.map