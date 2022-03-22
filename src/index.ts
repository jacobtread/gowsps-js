import { Test } from "./test";

export {
    Int8, Int16, Int32,
    UInt8, UInt16, UInt32,
    VarInt, Float32, Float64,
    Str, StrArray, Bool, BoolArray,
    ByteArray, UInt16Array, UInt32Array,
    Int8ArrayType, Int16ArrayType, Int32ArrayType,
    Float32ArrayType, Float64ArrayType
} from "./data";
export { PacketDefinition } from "./packets";
export { BinarySocket, Config } from "./socket"

Test()