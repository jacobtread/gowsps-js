type OpenFunction = (event: Event) => any
type CloseFunction = (event: Event) => any

interface Listeners {
    open?: OpenFunction,
    closed?: CloseFunction
}

interface Config {
    autoReconnect?: boolean;
    reconnectTimeout?: number;
}

interface AssertedConfig {
    autoReconnect: boolean;
    reconnectTimeout: number;
}

/**
 * A wrapper over the {@see DataView} object that counts the length of reads and
 * writes automatically incrementing the offset for the next read. Replaces the
 * set with offset write functions with put functions instead.
 */
class WrappedDataView {
    private offset: number;
    private wrapped: DataView;

    constructor(out: ArrayBufferLike) {
        this.offset = 0
        this.wrapped = new DataView(out)
    }

    getString(): string {
        const length = this.getVarInt()
        const arr = new Uint8Array(this.wrapped.buffer, this.offset, length)
        // @ts-ignore
        return String.fromCharCode.apply(null, arr);
    }

    getBoolean(): boolean {
        const value = this.getNumber(NumberType.UInt8)
        this.offset++
        return value == 1
    }

    putBoolean(value: boolean): void {
        this.wrapped.setUint8(this.offset, value ? 1 : 0)
        this.offset++
    }

    putString(value: string): void {
        this.putVarInt(value.length)
        for (let i = 0; i < value.length; i++) {
            this.wrapped.setUint8(this.offset, value.charCodeAt(i))
            this.offset++
        }
    }

    getNumber(type: NumberType): number {
        let value: number
        switch (type) {
            case NumberType.Int8:
                value = this.wrapped.getInt8(this.offset);
                this.offset += 1
                break
            case NumberType.UInt8:
                value = this.wrapped.getUint8(this.offset);
                this.offset += 1
                break
            case NumberType.Int16:
                value = this.wrapped.getInt16(this.offset);
                this.offset += 2
                break
            case NumberType.UInt16:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 2
                break
            case NumberType.Int32:
                value = this.wrapped.getInt32(this.offset);
                this.offset += 4
                break
            case NumberType.UInt32:
                value = this.wrapped.getUint16(this.offset);
                this.offset += 4
                break
            case NumberType.Float32:
                value = this.wrapped.getFloat32(this.offset);
                this.offset += 4
                break
            case NumberType.Float64:
                value = this.wrapped.getFloat64(this.offset);
                this.offset += 8
                break
        }
        return value
    }

    putNumber(type: NumberType, value: number): void {
        switch (type) {
            case NumberType.Int8:
                this.wrapped.setInt8(this.offset, value);
                this.offset += 1
                break
            case NumberType.UInt8:
                this.wrapped.setUint8(this.offset, value);
                this.offset += 1
                break
            case NumberType.Int16:
                this.wrapped.setInt16(this.offset, value);
                this.offset += 2
                break
            case NumberType.UInt16:
                this.wrapped.setUint16(this.offset, value);
                this.offset += 2
                break
            case NumberType.Int32:
                this.wrapped.setInt32(this.offset, value);
                this.offset += 4
                break
            case NumberType.UInt32:
                this.wrapped.setUint32(this.offset, value);
                this.offset += 4
                break
            case NumberType.Float32:
                this.wrapped.setFloat32(this.offset, value);
                this.offset += 4
                break
            case NumberType.Float64:
                this.wrapped.setFloat64(this.offset, value);
                this.offset += 8
                break
        }
    }

    putVarInt(value: number): void {
        let x = 0;
        while (x >= 0x80) {
            this.wrapped.setInt8(this.offset, x | 0x80)
            x >>= 7
            this.offset++
        }
        this.wrapped.setInt8(this.offset, x | 0x80)
    }

    getVarInt(): number {
        let value = 0
        let bitOffset = 0
        let byte
        do {
            if (bitOffset == 35) return 0
            byte = this.wrapped.getInt8(this.offset)
            this.offset++
            value |= ((byte & 127) << bitOffset)
            bitOffset += 7
        } while ((value & 128) != 0)
        return value
    }
}

enum NumberType {
    Int8,
    Int16,
    Int32,
    UInt8,
    UInt16,
    UInt32,
    Float32,
    Float64,
}

type EventName = keyof Listeners

class BinarySocket {

    private readonly url: string | URL;
    private readonly config: AssertedConfig;

    private ws: WebSocket;
    private listeners: Listeners = {};

    constructor(url: string | URL, config?: Config) {
        this.url = url;
        if (!config) config = {}
        this.config = {
            autoReconnect: config.autoReconnect ?? false,
            reconnectTimeout: config.reconnectTimeout ?? 1000,
        }
        this.ws = this.createConnection()
    }


    private createConnection(): WebSocket {
        const ws = new WebSocket(this.url)
        ws.binaryType = 'arraybuffer';
        ws.onopen = (event: Event) => {
            if (ws.readyState === WebSocket.OPEN) {
                this.pushEvent('open', event)
            }
        }
        ws.onclose = (event: Event) => {
            this.pushEvent('closed', event)
            console.log('Connection closed', event)
            if (this.config.autoReconnect) {
                setTimeout(() => {
                    this.ws = this.createConnection();
                    console.debug('Reconnecting socket')
                }, this.config.reconnectTimeout)
            }
        }
        ws.onmessage = (event: MessageEvent) => this.onMessage(event)
        return ws
    }

    private onMessage(event: MessageEvent) {
        console.log(event.data)
        const dv = new WrappedDataView(event.data as ArrayBuffer)
        const packetId = dv.getVarInt()
        const name = dv.getString()
        console.log(packetId, name)
    }

    private pushEvent(this: BinarySocket, key: EventName, event: any) {
        const listener = this.listeners[key]
        if (listener !== undefined) {
            listener(event)
        }
    }
}