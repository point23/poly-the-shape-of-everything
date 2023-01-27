System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, input, Input, KeyCode, Node, Quat, Vec3, _dec, _dec2, _class, _class2, _descriptor, _crd, ccclass, property, Swipe_Camera;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      Node = _cc.Node;
      Quat = _cc.Quat;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "b3c61wlrSdPMYT2vFS08hUQ", "Swipe_Camera", undefined);

      __checkObsolete__(['_decorator', 'Component', 'EventKeyboard', 'input', 'Input', 'KeyCode', 'Node', 'Overflow', 'Quat', 'Vec3']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Swipe_Camera", Swipe_Camera = (_dec = ccclass('Swipe_Camera'), _dec2 = property(Node), _dec(_class = (_class2 = class Swipe_Camera extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "camera_base", _descriptor, this);
        }

        onLoad() {
          this.register_event();
        }

        onDestroy() {
          this.unregister_event();
        }

        register_event() {
          input.on(Input.EventType.KEY_DOWN, this.on_key_down, this);
        }

        unregister_event() {
          input.off(Input.EventType.KEY_DOWN, this.on_key_down, this);
        }

        on_key_down(event) {
          let key_code = event.keyCode;

          switch (key_code) {
            case KeyCode.KEY_W:
              this.update_position(Vec3.UNIT_Y);
              break;

            case KeyCode.KEY_S:
              this.update_position(Vec3.UNIT_Y.negative());
              break;

            case KeyCode.KEY_A:
              this.update_position(Vec3.UNIT_Z.negative());
              break;

            case KeyCode.KEY_D:
              this.update_position(Vec3.UNIT_Z);
              break;

            case KeyCode.KEY_Q:
              this.update_position(Vec3.UNIT_X.negative());
              break;

            case KeyCode.KEY_E:
              this.update_position(Vec3.UNIT_X);
              break;
          }
        }

        update_view(info) {
          if (info.position) {
            this.camera_base.setPosition(new Vec3(info.position.x, info.position.y, info.position.z));
          }

          if (info.rotation) {
            let out;
            this.camera_base.setRotation(new Quat(info.rotation.x, info.rotation.y, info.rotation.z, info.rotation.w));
          }
        }

        update_position(delta) {
          console.log(delta);
          let position = this.camera_base.position;
          this.camera_base.setPosition(position.add(delta));
        }

        update_rotation(rotation) {
          this.camera_base.setRotation(rotation);
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "camera_base", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=842309febb77a0166fabf75b0f7acf761ea07fe4.js.map