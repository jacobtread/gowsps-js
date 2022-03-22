// A function for determining the size of the N object
export type DataSizeFunction<N> = (value: N) => number;
// Either the size as a number or a function which takes the value and returns its size
export type DataSize<N> = number | DataSizeFunction<N>;

/**
 * A simple class for tracking the offset progress. Used to keep track
 * of the view offset for the DataView
 */
export class DataViewTracker {
    // The current offset value
    private offset: number = 0;

    /**
     * Move the offset by more than once place
     *
     * @param amount The amount of places to move by
     * @return The offset before this change
     */
    many(amount: number): number {
        const original = this.offset;
        this.offset += amount
        return original
    }

    /**
     * Move the offset by a single place
     *
     * @return The offset before this change
     */
    one(): number {
        return this.offset++
    }

    /**
     * Resets the offset to its initial value
     */
    reset() {
        this.offset = 0;
    }
}

/**
 * The structure for a custom data type. Includes functions
 * for encoding, decoding and finding the size of values
 * using this data type.
 *
 * @type N The JavaScript type for this DataType
 */
export interface DataType<N> {
    /**
     * A function for calculating the size of this data
     * or the fixed size of this data as a number
     */
    size: DataSize<N>,

    /**
     * This function encodes the provided value using
     * the custom encoding for this data type
     *
     * @param d The data view to encode to
     * @param t The offset tracker instance
     * @param v The value to encode
     */
    encode(d: DataView, t: DataViewTracker, v: N): void;

    /**
     * This function decodes the binary data for this type
     * and returns the javascript type
     *
     * @param d The data view to encode to
     * @param t The offset tracker instance
     */
    decode(d: DataView, t: DataViewTracker): N;
}

// 8-bit signed integer (-128 to 127)
export const Int8: DataType<number> = {
    size: 1,
    encode: (d, t, v) => d.setInt8(t.one(), v),
    decode: (d, t) => d.getInt8(t.one())
}

// 16-bit signed integer (-32768 to 32767)
export const Int16: DataType<number> = {
    size: 2,
    encode: (d, t, v) => d.setInt16(t.many(2), v),
    decode: (d, t) => d.getInt16(t.many(2))
}

// 32-bit signed integer (-2147483648 to 2147483647)
export const Int32: DataType<number> = {
    size: 4,
    encode: (d, t, v) => d.setInt32(t.many(4), v),
    decode: (d, t) => d.getInt32(t.many(4))
}

// 8-bit un-signed integer (0 to 255)
export const UInt8: DataType<number> = {
    size: 1,
    encode: (d, t, v) => d.setUint8(t.one(), v),
    decode: (d, t) => d.getUint8(t.one())
}

// 16-bit un-signed integer (0 to 65535)
export const UInt16: DataType<number> = {
    size: 2,
    encode: (d, t, v) => d.setUint16(t.many(2), v),
    decode: (d, t) => d.getUint16(t.many(2))
}

// 32-bit un-signed integer (0 to 4294967295)
export const UInt32: DataType<number> = {
    size: 4,
    encode: (d, t, v) => d.setUint32(t.many(4), v),
    decode: (d, t) => d.getUint32(t.many(4))
}

// 32-bit floating point (-3.4e+38 to 3.4e+38)
export const Float32: DataType<number> = {
    size: 4,
    encode: (d, t, v) => d.setFloat64(t.many(4), v),
    decode: (d, t) => d.getFloat32(t.many(4))
}

// 64-bit floating point (-1.7e+308 to +1.7e+308)
export const Float64: DataType<number> = {
    size: 8,
    encode: (d, t, v) => d.setFloat64(t.many(8), v),
    decode: (d, t) => d.getFloat64(t.many(8))
}

// Boolean stored as 8-bit integer
export const Bool: DataType<boolean> = {
    size: 1,
    encode: (d, t, v) => UInt8.encode(d, t, v ? 1 : 0),
    decode: (d, t): boolean => UInt8.decode(d, t) == 1
}

// Compressed int64 (0 to 18446744073709551615)
export const VarInt: DataType<number> = {
    size(value: number): number {
        let size = 0;
        while (value >= 0x80) {
            value >>= 7
            size++
        }
        return size + 1
    },
    encode(d: DataView, t: DataViewTracker, v: number) {
        while (v >= 0x80) {
            UInt8.encode(d, t, v | 0x80)
            v >>= 7
        }
        UInt8.encode(d, t, v);
    },
    decode(d: DataView, t: DataViewTracker): number {
        let value = 0, bitOffset = 0, byte = 0;
        do {
            if (bitOffset == 35) return value
            byte = UInt8.decode(d, t);
            value |= ((byte & 127) << bitOffset)
            bitOffset += 7
        } while ((value & 128) != 0)
        return value
    }
}

// The function for determining the size of a VarInt (used a lot so stored here)
export const VarIntSize: DataSizeFunction<number> = VarInt.size as DataSizeFunction<number>

// Array of bytes []byte
export const ByteArray: DataType<Uint8Array> = {
    size(value: Uint8Array): number {
        return VarIntSize(value.length) + value.length
    },
    encode(d: DataView, t: DataViewTracker, v: Uint8Array) {
        VarInt.encode(d, t, v.length)
        for (let elm of v) {
            UInt8.encode(d, t, elm)
        }
    },
    decode(d: DataView, t: DataViewTracker): Uint8Array {
        const size = VarInt.decode(d, t)
        return new Uint8Array(d.buffer, t.many(size), size)
    }
}


// String
export const Str: DataType<string> = {
    size(value: string): number {
        return VarIntSize(value.length) + value.length
    },
    encode(d: DataView, t: DataViewTracker, v: string) {
        VarInt.encode(d, t, v.length)
        for (let i = 0; i < v.length; i++) {
            UInt8.encode(d, t, v.charCodeAt(i))
        }
    },
    decode(d: DataView, t: DataViewTracker): string {
        const arr = ByteArray.decode(d, t)
        // @ts-ignore
        return String.fromCharCode.apply(null, arr);
    }
}
