import { getFieldOrder, getType, DefinePacket, PacketField, Packet } from "./packets";

export enum DataType {
    Int8,
    Int16,
    Int32,
    UInt8,
    UInt16,
    UInt32,
    Float32,
    Float64,
    Boolean,
    VarInt,
    String,
    ByteArray
}


/**
 * A wrapper over the {@see DataView} object that counts the length of reads and
 * writes automatically incrementing the offset for the next read. Replaces the
 * set with offset write functions with put functions instead.
 */
export class WrappedDataView {
    private offset: number;
    private wrapped: DataView;

    constructor(out: ArrayBufferLike) {
        this.offset = 0
        this.wrapped = new DataView(out)
    }

    private m(amount: number) {
        const original = this.offset
        this.offset += amount
        return original
    }

    getVarInt(): number {
        let value = 0, bitOffset = 0, byte = 0
        do {
            if (bitOffset == 35) return 0
            byte = this.getInt8()
            value |= ((byte & 127) << bitOffset)
            bitOffset += 7
        } while ((value & 128) != 0)
        return value
    }

    getInt8 = (): number => this.wrapped.getInt8(this.offset++);
    getUInt8 = (): number => this.wrapped.getUint8(this.offset++);

    getInt16 = (): number => this.wrapped.getInt16(this.m(2))
    getUInt16 = (): number => this.wrapped.getUint16(this.m(2));


    getInt32 = (): number => this.wrapped.getInt32(this.m(4))
    getUInt32 = (): number => this.wrapped.getUint32(this.m(4));

    getFloat32 = (): number => this.wrapped.getFloat32(this.m(4))
    getFloat64 = (): number => this.wrapped.getFloat64(this.m(8));

    getBoolean = (): boolean => this.getInt8() == 1

    getString(): string {
        // @ts-ignore
        return String.fromCharCode.apply(null, this.getByteArray());
    }

    getByteArray(): Uint8Array {
        const length = this.getVarInt()
        return new Uint8Array(this.wrapped.buffer, this.m(length), length)
    }

    putByteArray(array: Uint8Array) {
        for (let value of array) {
            this.putInt8(value)
        }
    }

    putInt8 = (value: number) => this.wrapped.setInt8(this.offset++, value)
    putUInt8 = (value: number) => this.wrapped.setUint8(this.offset++, value)

    putInt16 = (value: number) => this.wrapped.setInt16(this.m(2), value)
    putUInt16 = (value: number) => this.wrapped.setUint16(this.m(2), value)

    putInt32 = (value: number) => this.wrapped.setInt32(this.m(4), value)
    putUInt32 = (value: number) => this.wrapped.setUint32(this.m(4), value)

    putFloat32 = (value: number) => this.wrapped.setFloat32(this.m(4), value)
    putFloat64 = (value: number) => this.wrapped.setFloat64(this.m(8), value)

    putVarInt(value: number) {
        let x = 0;
        while (x >= 0x80) {
            this.putInt8(x | 0x80)
            x >>= 7
        }
        this.putInt8(x | 0x80)
    }

    putString(value: string) {
        this.putVarInt(value.length)
        for (let i = 0; i < value.length; i++) {
            this.putInt8(value.charCodeAt(i))
        }
    }

    putBoolean = (value: boolean) => this.putInt8(value ? 1 : 0)
}

type DecoderFunction = () => any
type EncoderFunction = (value: any) => any

export type DecoderFunctions = {
    [key: string]: DecoderFunction;
};

export type EncoderFunctions = {
    [key: string]: EncoderFunction;
};

const decodeTypeMap: DecoderFunctions = {
    [DataType.Int8]: WrappedDataView.prototype.getInt8,
    [DataType.Int16]: WrappedDataView.prototype.getInt16,
    [DataType.Int32]: WrappedDataView.prototype.getInt32,
    [DataType.UInt8]: WrappedDataView.prototype.getUInt8,
    [DataType.UInt16]: WrappedDataView.prototype.getUInt16,
    [DataType.UInt32]: WrappedDataView.prototype.getUInt32,
    [DataType.Float32]: WrappedDataView.prototype.getFloat32,
    [DataType.Float64]: WrappedDataView.prototype.getFloat64,
    [DataType.Boolean]: WrappedDataView.prototype.getBoolean,
    [DataType.VarInt]: WrappedDataView.prototype.getVarInt,
    [DataType.String]: WrappedDataView.prototype.getString,
    [DataType.ByteArray]: WrappedDataView.prototype.getByteArray,
}

const encodeTypeMap: EncoderFunctions = {
    [DataType.Int8]: WrappedDataView.prototype.putInt8,
    [DataType.Int16]: WrappedDataView.prototype.putInt16,
    [DataType.Int32]: WrappedDataView.prototype.putInt32,
    [DataType.UInt8]: WrappedDataView.prototype.putUInt8,
    [DataType.UInt16]: WrappedDataView.prototype.putUInt16,
    [DataType.UInt32]: WrappedDataView.prototype.putUInt32,
    [DataType.Float32]: WrappedDataView.prototype.putFloat32,
    [DataType.Float64]: WrappedDataView.prototype.putFloat64,
    [DataType.Boolean]: WrappedDataView.prototype.putBoolean,
    [DataType.VarInt]: WrappedDataView.prototype.putVarInt,
    [DataType.String]: WrappedDataView.prototype.putString,
    [DataType.ByteArray]: WrappedDataView.prototype.putByteArray,
}

export class PacketActor<T extends Packet> {
    private packet: T;
    private readonly fields: PacketField<T>[];
    private readonly fieldTypes: DataType[] = [];

    constructor(packet: T) {
        this.packet = packet
        this.fields = getFieldOrder(packet)
        for (let i = 0; i < this.fields.length; i++) {
            const name = this.fields[i]
            const type = getType(packet, name as string | symbol)
            this.fieldTypes.push(type)
        }
    }

    decode(dataView: WrappedDataView): T {
        const out = this.packet.constructor.apply(null)
        for (let i = 0; i < this.fields.length; i++) {
            const name: PacketField<T> = this.fields[i]
            const type: DataType = this.fieldTypes[i]
            out[name] = decodeTypeMap[type].apply(dataView)
        }
        return out
    }

    encode(dataView: WrappedDataView, packet: T) {
        for (let i = 0; i < this.fields.length; i++) {
            const name: PacketField<T> = this.fields[i]
            const type: DataType = this.fieldTypes[i]
            const value = packet[name]
            encodeTypeMap[type].apply(dataView, [value])
        }
    }
}
