"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Test = exports.PacketDefinition = exports.WrappedDataView = exports.DataType = exports.BinarySocket = void 0;
var BinarySocket = /** @class */ (function () {
    function BinarySocket(url, config) {
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "config", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "ws", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "eventListeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "packetListeners", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "actors", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        this.url = url;
        this.config = config !== null && config !== void 0 ? config : {};
        this.ws = this.createConnection();
    }
    Object.defineProperty(BinarySocket.prototype, "createConnection", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            var _this = this;
            var ws = new WebSocket(this.url);
            ws.binaryType = 'arraybuffer';
            ws.onopen = function (event) {
                var _a;
                if (ws.readyState === WebSocket.OPEN) {
                    (_a = _this.eventListeners.open) === null || _a === void 0 ? void 0 : _a.call(_this, event);
                }
            };
            ws.onclose = function (event) {
                var _a;
                (_a = _this.eventListeners.closed) === null || _a === void 0 ? void 0 : _a.call(_this, event);
                console.log('Connection closed', event);
                if (_this.config.reconnectTimeout !== undefined) {
                    setTimeout(function () {
                        _this.ws = _this.createConnection();
                        console.debug('Reconnecting socket');
                    }, _this.config.reconnectTimeout);
                }
            };
            ws.onmessage = function (event) { return _this.onMessage(event); };
            return ws;
        }
    });
    Object.defineProperty(BinarySocket.prototype, "onMessage", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (event) {
            var e_1, _a;
            var dv = new WrappedDataView(event.data);
            var packetId = dv.getVarInt();
            var actor = this.actors.get(packetId);
            if (actor) {
                var out = actor.decode(dv);
                var listeners = this.packetListeners[packetId];
                if (listeners) {
                    try {
                        for (var listeners_1 = __values(listeners), listeners_1_1 = listeners_1.next(); !listeners_1_1.done; listeners_1_1 = listeners_1.next()) {
                            var listener = listeners_1_1.value;
                            listener(out);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (listeners_1_1 && !listeners_1_1.done && (_a = listeners_1.return)) _a.call(listeners_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            }
            else {
                console.error("No packet actor defined for ".concat(packetId.toString(16)));
            }
        }
    });
    Object.defineProperty(BinarySocket.prototype, "send", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (packet) {
            var actor = this.actors.get(packet.id);
            if (actor) {
                var out = new ArrayBuffer(actor.computeSize(packet));
                var dv = new WrappedDataView(out);
                actor.encode(dv, packet);
                this.ws.send(out);
            }
        }
    });
    Object.defineProperty(BinarySocket.prototype, "setEventListener", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (name, listener) {
            this.eventListeners[name] = listener;
        }
    });
    Object.defineProperty(BinarySocket.prototype, "definePacket", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (packet) {
            this.actors.set(packet.id, packet);
        }
    });
    Object.defineProperty(BinarySocket.prototype, "addListener", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (definition, handler) {
            var list = this.packetListeners[definition.id];
            if (list) {
                list.push(handler);
            }
            else {
                this.packetListeners[definition.id] = [handler];
            }
        }
    });
    return BinarySocket;
}());
exports.BinarySocket = BinarySocket;
var DataType;
(function (DataType) {
    DataType[DataType["Int8"] = 0] = "Int8";
    DataType[DataType["Int16"] = 1] = "Int16";
    DataType[DataType["Int32"] = 2] = "Int32";
    DataType[DataType["UInt8"] = 3] = "UInt8";
    DataType[DataType["UInt16"] = 4] = "UInt16";
    DataType[DataType["UInt32"] = 5] = "UInt32";
    DataType[DataType["Float32"] = 6] = "Float32";
    DataType[DataType["Float64"] = 7] = "Float64";
    DataType[DataType["Boolean"] = 8] = "Boolean";
    DataType[DataType["VarInt"] = 9] = "VarInt";
    DataType[DataType["String"] = 10] = "String";
    DataType[DataType["ByteArray"] = 11] = "ByteArray";
})(DataType = exports.DataType || (exports.DataType = {}));
/**
 * A wrapper over the {@see DataView} object that counts the length of reads and
 * writes automatically incrementing the offset for the next read. Replaces the
 * set with offset write functions with put functions instead.
 */
var WrappedDataView = /** @class */ (function () {
    function WrappedDataView(out) {
        Object.defineProperty(this, "offset", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "wrapped", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.wrapped = new DataView(out);
    }
    Object.defineProperty(WrappedDataView.prototype, "m", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (amount) {
            var original = this.offset;
            this.offset += amount;
            return original;
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getVarInt", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            var value = 0, bitOffset = 0, byte = 0;
            do {
                if (bitOffset == 35)
                    return 0;
                byte = this.getInt8();
                value |= ((byte & 127) << bitOffset);
                bitOffset += 7;
            } while ((value & 128) != 0);
            return value;
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getInt8", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getInt8(this.offset++);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getUInt8", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getUint8(this.offset++);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getInt16", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getInt16(this.m(2));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getUInt16", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getUint16(this.m(2));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getInt32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getInt32(this.m(4));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getUInt32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getUint32(this.m(4));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getFloat32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getFloat32(this.m(4));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getFloat64", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.wrapped.getFloat64(this.m(8));
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getBoolean", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            return this.getInt8() == 1;
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getString", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            // @ts-ignore
            return String.fromCharCode.apply(null, this.getByteArray());
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "getByteArray", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function () {
            var length = this.getVarInt();
            return new Uint8Array(this.wrapped.buffer, this.m(length), length);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putByteArray", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (array) {
            var e_2, _a;
            try {
                for (var array_1 = __values(array), array_1_1 = array_1.next(); !array_1_1.done; array_1_1 = array_1.next()) {
                    var value = array_1_1.value;
                    this.putInt8(value);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (array_1_1 && !array_1_1.done && (_a = array_1.return)) _a.call(array_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putInt8", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setInt8(this.offset++, value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putUInt8", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setUint8(this.offset++, value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putInt16", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setInt16(this.m(2), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putUInt16", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setUint16(this.m(2), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putInt32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setInt32(this.m(4), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putUInt32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setUint32(this.m(4), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putFloat32", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setFloat32(this.m(4), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putFloat64", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.wrapped.setFloat64(this.m(8), value);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putVarInt", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            while (value >= 0x80) {
                this.putInt8(value | 0x80);
                value >>= 7;
            }
            this.putInt8(value | 0x80);
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putString", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.putVarInt(value.length);
            for (var i = 0; i < value.length; i++) {
                this.putInt8(value.charCodeAt(i));
            }
        }
    });
    Object.defineProperty(WrappedDataView.prototype, "putBoolean", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (value) {
            this.putInt8(value ? 1 : 0);
        }
    });
    return WrappedDataView;
}());
exports.WrappedDataView = WrappedDataView;
var decodeTypeMap = (_a = {},
    _a[DataType.Int8] = WrappedDataView.prototype.getInt8,
    _a[DataType.Int16] = WrappedDataView.prototype.getInt16,
    _a[DataType.Int32] = WrappedDataView.prototype.getInt32,
    _a[DataType.UInt8] = WrappedDataView.prototype.getUInt8,
    _a[DataType.UInt16] = WrappedDataView.prototype.getUInt16,
    _a[DataType.UInt32] = WrappedDataView.prototype.getUInt32,
    _a[DataType.Float32] = WrappedDataView.prototype.getFloat32,
    _a[DataType.Float64] = WrappedDataView.prototype.getFloat64,
    _a[DataType.Boolean] = WrappedDataView.prototype.getBoolean,
    _a[DataType.VarInt] = WrappedDataView.prototype.getVarInt,
    _a[DataType.String] = WrappedDataView.prototype.getString,
    _a[DataType.ByteArray] = WrappedDataView.prototype.getByteArray,
    _a);
var encodeTypeMap = (_b = {},
    _b[DataType.Int8] = WrappedDataView.prototype.putInt8,
    _b[DataType.Int16] = WrappedDataView.prototype.putInt16,
    _b[DataType.Int32] = WrappedDataView.prototype.putInt32,
    _b[DataType.UInt8] = WrappedDataView.prototype.putUInt8,
    _b[DataType.UInt16] = WrappedDataView.prototype.putUInt16,
    _b[DataType.UInt32] = WrappedDataView.prototype.putUInt32,
    _b[DataType.Float32] = WrappedDataView.prototype.putFloat32,
    _b[DataType.Float64] = WrappedDataView.prototype.putFloat64,
    _b[DataType.Boolean] = WrappedDataView.prototype.putBoolean,
    _b[DataType.VarInt] = WrappedDataView.prototype.putVarInt,
    _b[DataType.String] = WrappedDataView.prototype.putString,
    _b[DataType.ByteArray] = WrappedDataView.prototype.putByteArray,
    _b);
var dataTypeSize = (_c = {},
    _c[DataType.Int8] = 1,
    _c[DataType.Int16] = 2,
    _c[DataType.Int32] = 4,
    _c[DataType.UInt8] = 1,
    _c[DataType.UInt16] = 2,
    _c[DataType.UInt32] = 4,
    _c[DataType.Float32] = 4,
    _c[DataType.Float64] = 8,
    _c[DataType.Boolean] = 1,
    _c[DataType.VarInt] = function (value) {
        var count = 0;
        while (value >= 0x80) {
            count++;
            value >>= 7;
        }
        return ++count;
    },
    _c[DataType.String] = function (value) {
        var varInt = dataTypeSize[DataType.VarInt];
        var size = varInt(value.length);
        return size + value.length;
    },
    _c[DataType.ByteArray] = function (value) {
        var varInt = dataTypeSize[DataType.VarInt];
        var size = varInt(value.length);
        return size + value.length;
    },
    _c);
var PacketDefinition = /** @class */ (function () {
    function PacketDefinition(id, struct, keys) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "fields", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.id = id;
        this.fields = new Array(keys.length);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var type = struct[key];
            this.fields[i] = [key, type];
        }
    }
    Object.defineProperty(PacketDefinition.prototype, "decode", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (dataView) {
            var e_3, _a;
            var out = {};
            try {
                for (var _b = __values(this.fields), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], type = _d[1];
                    out[key] = decodeTypeMap[type].apply(dataView);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return out;
        }
    });
    Object.defineProperty(PacketDefinition.prototype, "encode", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (dataView, packet) {
            var e_4, _a;
            try {
                for (var _b = __values(this.fields), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], type = _d[1];
                    var value = packet[key];
                    encodeTypeMap[type].apply(dataView, [value]);
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    });
    Object.defineProperty(PacketDefinition.prototype, "computeSize", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (packet) {
            var e_5, _a;
            var size = 0;
            try {
                for (var _b = __values(this.fields), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], type = _d[1];
                    var dataSize = dataTypeSize[type];
                    if (typeof dataSize == 'number') {
                        size += dataSize;
                    }
                    else {
                        size += dataSize(packet[key]);
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
            return size;
        }
    });
    Object.defineProperty(PacketDefinition.prototype, "create", {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function (data) {
            return __assign({ id: this.id }, data);
        }
    });
    return PacketDefinition;
}());
exports.PacketDefinition = PacketDefinition;
var TestPacket = new PacketDefinition(0x02, {
    name: DataType.String,
    user: DataType.UInt8
}, ['name', 'user']);
function Test() {
    var socket = new BinarySocket('ws://localhost:8080/ws');
    socket.definePacket(TestPacket);
    socket.addListener(TestPacket, function (_a) {
        var user = _a.user, name = _a.name;
        console.log(user, name);
    });
    socket.setEventListener('open', function () {
        socket.send(TestPacket.create({
            user: 2,
            name: 'Test User'
        }));
    });
}
exports.Test = Test;
Test();
//# sourceMappingURL=index.js.map