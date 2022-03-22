import { Test } from "./test";

export {
    Int8, Int16, Int32,
    UInt8, UInt16, UInt32,
    VarInt, Float32, Float64,
    Str, Bool, ByteArray,
    ArrayType, Struct, StructArray
} from "./data";
export { PacketDefinition } from "./packets";
export { BinarySocket, Config } from "./socket"

Test()