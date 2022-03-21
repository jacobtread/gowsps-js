import { BinarySocket } from "./socket";
import { DefinePacket, Field, Packet } from "./packets";
import { DataType } from "./encoding";

@DefinePacket(['name', 'user'])
class ExamplePacket implements Packet {
    readonly id: number = 0x02;

    @Field(DataType.String) name: string
    @Field(DataType.UInt8) user: number
}


export function Test() {
    const socket = new BinarySocket('ws://localhost:8080')
    socket.definePacket(new ExamplePacket())

    socket.setEventListener('open', function () {
        const packet = new ExamplePacket()
        packet.name = 'Test Name'
        packet.user = 2
        socket.send(packet)
    })
}