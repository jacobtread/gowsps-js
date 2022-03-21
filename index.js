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
    WrappedDataView.prototype.getString = function () {
        var length = this.getVarInt();
        var arr = new Uint8Array(this.wrapped.buffer, this.offset, length);
        // @ts-ignore
        return String.fromCharCode.apply(null, arr);
    };
    WrappedDataView.prototype.getBoolean = function () {
        var value = this.getNumber(NumberType.UInt8);
        this.offset++;
        return value == 1;
    };
    WrappedDataView.prototype.putBoolean = function (value) {
        this.wrapped.setUint8(this.offset, value ? 1 : 0);
        this.offset++;
    };
    WrappedDataView.prototype.putString = function (value) {
        this.putVarInt(value.length);
        for (var i = 0; i < value.length; i++) {
            this.wrapped.setUint8(this.offset, value.charCodeAt(i));
            this.offset++;
        }
    };
    WrappedDataView.prototype.getNumber = function (type) {
        var value;
        switch (type) {
            case NumberType.Int8:
                value = this.wrapped.getInt8(this.offset);
                this.offset += 1;
                break;
            case NumberType.UInt8:
                value = this.wrapped.getUint8(this.offset);
                this.offset += 1;
                break;
            case NumberType.Int16:
                value = this.wrapped.getInt16(this.offset);
                this.offset += 2;
                break;
            case NumberType.UInt16:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 2;
                break;
            case NumberType.Int32:
                value = this.wrapped.getInt32(this.offset);
                this.offset += 4;
                break;
            case NumberType.UInt32:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 4;
                break;
            case NumberType.Float32:
                value = this.wrapped.getFloat32(this.offset);
                this.offset += 4;
                break;
            case NumberType.Float64:
                value = this.wrapped.getFloat64(this.offset);
                this.offset += 8;
                break;
        }
        return value;
    };
    WrappedDataView.prototype.putNumber = function (type, value) {
        switch (type) {
            case NumberType.Int8:
                this.wrapped.setInt8(this.offset, value);
                this.offset += 1;
                break;
            case NumberType.UInt8:
                this.wrapped.setUint8(this.offset, value);
                this.offset += 1;
                break;
            case NumberType.Int16:
                this.wrapped.setInt16(this.offset, value);
                this.offset += 2;
                break;
            case NumberType.UInt16:
                this.wrapped.setUint16(this.offset, value);
                this.offset += 2;
                break;
            case NumberType.Int32:
                this.wrapped.setInt32(this.offset, value);
                this.offset += 4;
                break;
            case NumberType.UInt32:
                this.wrapped.setUint32(this.offset, value);
                this.offset += 4;
                break;
            case NumberType.Float32:
                this.wrapped.setFloat32(this.offset, value);
                this.offset += 4;
                break;
            case NumberType.Float64:
                this.wrapped.setFloat64(this.offset, value);
                this.offset += 8;
                break;
        }
    };
    WrappedDataView.prototype.putVarInt = function (value) {
        var x = 0;
        while (x >= 0x80) {
            this.wrapped.setInt8(this.offset, x | 0x80);
            x >>= 7;
            this.offset++;
        }
        this.wrapped.setInt8(this.offset, x | 0x80);
    };
    WrappedDataView.prototype.getVarInt = function () {
        var value = 0;
        var bitOffset = 0;
        var byte;
        do {
            if (bitOffset == 35)
                return 0;
            byte = this.wrapped.getInt8(this.offset);
            this.offset++;
            value |= ((byte & 127) << bitOffset);
            bitOffset += 7;
        } while ((value & 128) != 0);
        return value;
    };
    return WrappedDataView;
}());
var NumberType;
(function (NumberType) {
    NumberType[NumberType["Int8"] = 0] = "Int8";
    NumberType[NumberType["Int16"] = 1] = "Int16";
    NumberType[NumberType["Int32"] = 2] = "Int32";
    NumberType[NumberType["UInt8"] = 3] = "UInt8";
    NumberType[NumberType["UInt16"] = 4] = "UInt16";
    NumberType[NumberType["UInt32"] = 5] = "UInt32";
    NumberType[NumberType["Float32"] = 6] = "Float32";
    NumberType[NumberType["Float64"] = 7] = "Float64";
})(NumberType || (NumberType = {}));
var BinarySocket = /** @class */ (function () {
    function BinarySocket(url, config) {
        var _a, _b;
        this.listeners = {};
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
        var packetId = dv.getVarInt();
        var name = dv.getString();
        console.log(packetId, name);
    };
    BinarySocket.prototype.pushEvent = function (key, event) {
        var listener = this.listeners[key];
        if (listener !== undefined) {
            listener(event);
        }
    };
    return BinarySocket;
}());
