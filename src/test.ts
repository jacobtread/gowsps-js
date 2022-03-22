import { ArrayType, BinarySocket, PacketDefinition, Str, Struct, UInt8 } from "./index";

export function Test() {


    const TestNest = Struct({
        name: Str,
        value: UInt8
    }, ['name', 'value'])

    const TestPacket = new PacketDefinition(0x02, {
        name: Str,
        user: UInt8,
        values: ArrayType(TestNest)
    }, ['name', 'user', 'values'])

    const socket = new BinarySocket('ws://localhost:8080/ws')
    socket.definePacket(TestPacket)

    socket.addListener(TestPacket, ({user, name, values}) => {
        console.table({user, name, values})
    })

    socket.setOpenListener(function () {
        socket.send(TestPacket.create({
            name: 'Jacob',
            user: 2,
            values: [
                {name: 'Test', value: 0}
            ]
        }))
    })
}