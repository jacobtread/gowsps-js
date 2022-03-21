/**
 * A wrapper over the {@see DataView} object that counts the length of reads and
 * writes automatically incrementing the offset for the next read. Replaces the
 * set with offset write functions with put functions instead.
 */
var WrappedDataView = /** @class */ (function () {
    function WrappedDataView(out) {
        this.offset = 0;
        this.wrapped = new DataView(out);
    }
    WrappedDataView.prototype.getField = function (type) {
        switch (type) {
            case DataType.String:
                return this.getString();
            case DataType.ByteArray:
                return this.getByteArray();
            default:
                return this.getNumber(type);
        }
    };
    WrappedDataView.prototype.putField = function (type, value) {
        switch (type) {
            case DataType.String:
                this.putString(value);
                break;
            default:
                this.putNumber(type, value);
        }
    };
    WrappedDataView.prototype.getByteArray = function () {
        var length = this.getNumber(DataType.VarInt);
        return new Uint8Array(this.wrapped.buffer, this.offset, length);
    };
    WrappedDataView.prototype.getString = function () {
        // @ts-ignore
        return String.fromCharCode.apply(null, this.getByteArray());
    };
    WrappedDataView.prototype.getBoolean = function () {
        var value = this.getNumber(DataType.UInt8);
        this.offset++;
        return value == 1;
    };
    WrappedDataView.prototype.putBoolean = function (value) {
        this.wrapped.setUint8(this.offset, value ? 1 : 0);
        this.offset++;
    };
    WrappedDataView.prototype.putString = function (value) {
        this.putNumber(DataType.VarInt, value.length);
        for (var i = 0; i < value.length; i++) {
            this.wrapped.setUint8(this.offset, value.charCodeAt(i));
            this.offset++;
        }
    };
    WrappedDataView.prototype.getNumber = function (type) {
        var value;
        switch (type) {
            case DataType.Int8:
                value = this.wrapped.getInt8(this.offset);
                this.offset += 1;
                break;
            case DataType.UInt8:
                value = this.wrapped.getUint8(this.offset);
                this.offset += 1;
                break;
            case DataType.Int16:
                value = this.wrapped.getInt16(this.offset);
                this.offset += 2;
                break;
            case DataType.UInt16:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 2;
                break;
            case DataType.Int32:
                value = this.wrapped.getInt32(this.offset);
                this.offset += 4;
                break;
            case DataType.UInt32:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 4;
                break;
            case DataType.Float32:
                value = this.wrapped.getFloat32(this.offset);
                this.offset += 4;
                break;
            case DataType.Float64:
                value = this.wrapped.getFloat64(this.offset);
                this.offset += 8;
                break;
            case DataType.VarInt:
                value = 0;
                var bitOffset = 0;
                var byte = void 0;
                do {
                    if (bitOffset == 35)
                        return 0;
                    byte = this.wrapped.getInt8(this.offset);
                    this.offset++;
                    value |= ((byte & 127) << bitOffset);
                    bitOffset += 7;
                } while ((value & 128) != 0);
                break;
            default:
                console.error("Given data type ".concat(type, " which is not a number"));
                value = 0;
                break;
        }
        return value;
    };
    WrappedDataView.prototype.putNumber = function (type, value) {
        switch (type) {
            case DataType.Int8:
                this.wrapped.setInt8(this.offset, value);
                this.offset += 1;
                break;
            case DataType.UInt8:
                this.wrapped.setUint8(this.offset, value);
                this.offset += 1;
                break;
            case DataType.Int16:
                this.wrapped.setInt16(this.offset, value);
                this.offset += 2;
                break;
            case DataType.UInt16:
                this.wrapped.setUint16(this.offset, value);
                this.offset += 2;
                break;
            case DataType.Int32:
                this.wrapped.setInt32(this.offset, value);
                this.offset += 4;
                break;
            case DataType.UInt32:
                this.wrapped.setUint32(this.offset, value);
                this.offset += 4;
                break;
            case DataType.Float32:
                this.wrapped.setFloat32(this.offset, value);
                this.offset += 4;
                break;
            case DataType.Float64:
                this.wrapped.setFloat64(this.offset, value);
                this.offset += 8;
                break;
            case DataType.VarInt:
                var x = 0;
                while (x >= 0x80) {
                    this.putNumber(DataType.Int8, x | 0x80);
                    x >>= 7;
                }
                this.putNumber(DataType.Int8, x | 0x80);
                break;
        }
    };
    return WrappedDataView;
}());
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
    DataType[DataType["VarInt"] = 8] = "VarInt";
    DataType[DataType["String"] = 9] = "String";
    DataType[DataType["ByteArray"] = 10] = "ByteArray";
})(DataType || (DataType = {}));
var BinarySocket = /** @class */ (function () {
    function BinarySocket(url, config) {
        var _a, _b;
        this.listeners = {};
        this.structs = new Map();
        this.url = url;
        if (!config)
            config = {};
        this.config = {
            autoReconnect: (_a = config.autoReconnect) !== null && _a !== void 0 ? _a : false,
            reconnectTimeout: (_b = config.reconnectTimeout) !== null && _b !== void 0 ? _b : 1000
        };
        this.ws = this.createConnection();
    }
    BinarySocket.prototype.createConnection = function () {
        var _this = this;
        var ws = new WebSocket(this.url);
        ws.binaryType = 'arraybuffer';
        ws.onopen = function (event) {
            if (ws.readyState === WebSocket.OPEN) {
                _this.pushEvent('open', event);
            }
        };
        ws.onclose = function (event) {
            _this.pushEvent('closed', event);
            console.log('Connection closed', event);
            if (_this.config.autoReconnect) {
                setTimeout(function () {
                    _this.ws = _this.createConnection();
                    console.debug('Reconnecting socket');
                }, _this.config.reconnectTimeout);
            }
        };
        ws.onmessage = function (event) { return _this.onMessage(event); };
        return ws;
    };
    BinarySocket.prototype.onMessage = function (event) {
        console.log(event.data);
        var dv = new WrappedDataView(event.data);
        var packetId = dv.getNumber(DataType.VarInt);
        var struct = this.structs.get(packetId);
        var out = {};
        if (struct != undefined) {
            for (var _i = 0, struct_1 = struct; _i < struct_1.length; _i++) {
                var _a = struct_1[_i], name_1 = _a.name, type = _a.type;
                out[name_1] = dv.getField(type);
            }
        }
    };
    BinarySocket.prototype.pushEvent = function (key, event) {
        var listener = this.listeners[key];
        if (listener !== undefined) {
            listener(event);
        }
    };
    BinarySocket.prototype.definePacket = function (id, struct) {
        this.structs.set(id, struct);
    };
    return BinarySocket;
}());
