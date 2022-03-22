import { BinarySocket, PacketDefinition, Str, UInt8 } from "./index";

export function Test() {
    const TestPacket = new PacketDefinition(0x02, {
        name: Str,
        user: UInt8
    }, ['name', 'user'])

    const socket = new BinarySocket('ws://localhost:8080/ws')
    socket.definePacket(TestPacket)

    socket.addListener(TestPacket, ({user, name}) => {
        console.table({user, name})
    })

    socket.setOpenListener(function () {
        socket.send(TestPacket.create({
            name: 'Jacob',
            user: 2
        }))
    })
}