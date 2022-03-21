import "reflect-metadata"
import { DataType } from "./encoding";

interface Packet {
    readonly id: number;
}

const fieldTypeKey = Symbol('field:type')
const fieldsKey = Symbol('fields:order')

function Field(type: DataType): any {
    return Reflect.metadata(fieldTypeKey, type)
}

function Packet<T>(fields: Array<keyof T>) {
    return Reflect.metadata(fieldsKey, fields)
}

function getFieldOrder(packet: Packet): string[] {
    return Reflect.getMetadata(fieldsKey, packet)
}

function getType(packet: any, property: string | symbol): DataType {
    const type = Reflect.getMetadata(fieldTypeKey, packet, property)
    return type as DataType
}

@Packet(['name', 'user'])
class ExamplePacket implements Packet {
    readonly id: number = 0x02;

    @Field(DataType.String) name: string
    @Field(DataType.UInt8) user: number
}

