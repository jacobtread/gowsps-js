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
    private offset: number = 0;
    private readonly wrapped: DataView;

    constructor(out: ArrayBufferLike) {
        this.wrapped = new DataView(out)
    }

    private m(amount: number) {
        const original = this.offset
        this.offset += amount
        return original
    }

    getVarInt(this: WrappedDataView): number {
        let value = 0, bitOffset = 0, byte = 0
        do {
            if (bitOffset == 35) return 0
            byte = this.getInt8()
            value |= ((byte & 127) << bitOffset)
            bitOffset += 7
        } while ((value & 128) != 0)
        return value
    }

    getInt8(): number {
        return this.wrapped.getInt8(this.offset++);
    }

    getUInt8(): number {
        return this.wrapped.getUint8(this.offset++);
    }

    getInt16(): number {
        return this.wrapped.getInt16(this.m(2))
    }

    getUInt16(): number {
        return this.wrapped.getUint16(this.m(2));
    }

    getInt32(): number {
        return this.wrapped.getInt32(this.m(4))
    }

    getUInt32(): number {
        return this.wrapped.getUint32(this.m(4));
    }

    getFloat32(): number {
        return this.wrapped.getFloat32(this.m(4))
    }

    getFloat64(): number {
        return this.wrapped.getFloat64(this.m(8));
    }

    getBoolean(): boolean {
        return this.getInt8() == 1
    }

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

    putInt8(value: number) {
        this.wrapped.setInt8(this.offset++, value)
    }

    putUInt8(value: number) {
        this.wrapped.setUint8(this.offset++, value)
    }

    putInt16(value: number) {
        this.wrapped.setInt16(this.m(2), value)
    }

    putUInt16(value: number) {
        this.wrapped.setUint16(this.m(2), value)
    }

    putInt32(value: number) {
        this.wrapped.setInt32(this.m(4), value)
    }

    putUInt32(value: number) {
        this.wrapped.setUint32(this.m(4), value)
    }

    putFloat32(value: number) {
        this.wrapped.setFloat32(this.m(4), value)
    }

    putFloat64(value: number) {
        this.wrapped.setFloat64(this.m(8), value)
    }

    putVarInt(value: number) {
        while (value >= 0x80) {
            this.putInt8(value | 0x80)
            value >>= 7
        }
        this.putInt8(value | 0x80)
    }

    putString(value: string) {
        this.putVarInt(value.length)
        for (let i = 0; i < value.length; i++) {
            this.putInt8(value.charCodeAt(i))
        }
    }

    putBoolean(value: boolean) {
        this.putInt8(value ? 1 : 0)
    }
}

type DecoderFunction = () => any
type EncoderFunction = (value: any) => any
type DataSizeFunction = (value: any) => number

export type DecoderFunctions = {
    [key in DataType]: DecoderFunction;
};

export type EncoderFunctions = {
    [key in DataType]: EncoderFunction;
};

export type DataSizeFunctions = {
    [key in DataType]: DataSizeFunction | number
}


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

const dataTypeSize: DataSizeFunctions = {
    [DataType.Int8]: 1,
    [DataType.Int16]: 2,
    [DataType.Int32]: 4,
    [DataType.UInt8]: 1,
    [DataType.UInt16]: 2,
    [DataType.UInt32]: 4,
    [DataType.Float32]: 4,
    [DataType.Float64]: 8,
    [DataType.Boolean]: 1,
    [DataType.VarInt]: (value: number): number => {
        let count = 0
        while (value >= 0x80) {
            count++
            value >>= 7
        }
        return ++count
    },
    [DataType.String]: (value: string): number => {
        const varInt = dataTypeSize[DataType.VarInt] as DataSizeFunction
        let size = varInt(value.length)
        return size + value.length
    },
    [DataType.ByteArray]: (value: Uint8Array): number => {
        const varInt = dataTypeSize[DataType.VarInt] as DataSizeFunction
        let size = varInt(value.length)
        return size + value.length
    },
}


type NumberType = DataType.VarInt | DataType.UInt8 | DataType.UInt16 | DataType.UInt32
    | DataType.Int8 | DataType.Int16 | DataType.Int32 | DataType.Float32 | DataType.Float64;

type ConvertedType<T> = T extends NumberType ? number
    : T extends DataType.String ? string
        : T extends DataType.Boolean ? boolean
            : T extends DataType.ByteArray ? Uint8Array
                : unknown;


interface Identified {
    readonly id: number;
}

export type PacketStruct = Record<string, DataType>;
export type PacketConvertedStruct<Struct extends PacketStruct> = { [Key in keyof Struct]: ConvertedType<Struct[Key]> };

export type IdentifiedPacket<T> = T & Identified

export type StructKey<T extends PacketStruct> = keyof T
export type StructKeys<T extends PacketStruct> = StructKey<T>[]

export type DefinitionField<T extends PacketStruct> = [StructKey<T>, DataType];

export class PacketDefinition<T extends PacketStruct> {

    readonly id: number;

    private readonly fields: DefinitionField<T>[]

    public constructor(id: number, struct: T, keys: StructKeys<T>) {
        this.id = id;
        this.fields = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const type = struct[key];
            this.fields[i] = [key, type];
        }
    }

    decode(dataView: WrappedDataView): T {
        const out: any = {}
        for (let [key, type] of this.fields) {
            out[key] = decodeTypeMap[type].apply(dataView)
        }
        return out
    }

    encode(dataView: WrappedDataView, packet: T) {
        for (let [key, type] of this.fields) {
            const value: any = packet[key]
            encodeTypeMap[type].apply(dataView, [value])
        }
    }

    computeSize(packet: T): number {
        let size = 0;
        for (let [key, type] of this.fields) {
            const dataSize: number | DataSizeFunction = dataTypeSize[type]
            if (typeof dataSize == 'number') {
                size += dataSize
            } else {
                size += dataSize(packet[key])
            }
        }
        return size
    }

    create<K extends PacketConvertedStruct<T>>(data: K): IdentifiedPacket<K> {
        return {
            id: this.id,
            ...data
        }
    }
}
