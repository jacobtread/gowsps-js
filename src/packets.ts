import "reflect-metadata"
import { DataType } from "./encoding";

export interface Packet {
    readonly id: number;
}

export type PacketField<T> = keyof T

const fieldTypeKey = Symbol('field:type')
const fieldsKey = Symbol('fields:order')

export function Field(type: DataType): any {
    return Reflect.metadata(fieldTypeKey, type)
}

export function DefinePacket<T>(fields: Array<keyof T>) {
    return Reflect.metadata(fieldsKey, fields)
}

export function getFieldOrder<T extends Packet>(packet: T): PacketField<T>[] {
    return Reflect.getMetadata(fieldsKey, packet)
}

export function getType(packet: any, property: string | symbol): DataType {
    const type = Reflect.getMetadata(fieldTypeKey, packet, property)
    return type as DataType
}

@DefinePacket(['name', 'user'])
class ExamplePacket implements Packet {
    readonly id: number = 0x02;

    @Field(DataType.String) name: string
    @Field(DataType.UInt8) user: number
}

