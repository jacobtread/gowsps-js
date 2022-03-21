import { BinarySocket } from "./socket";
import { DataType, PacketDefinition } from "./encoding";


const TestPacket = new PacketDefinition(0x02, {
    name: DataType.String,
    user: DataType.UInt8
}, ['name', 'user'])

export function Test() {
    const socket = new BinarySocket('ws://localhost:8080/ws')
    socket.definePacket(TestPacket)

    socket.addListener(TestPacket, ({user, name}) => {
        console.log(user, name)
    })

    socket.setEventListener('open', function () {
        socket.send(TestPacket.create({
            user: 2,
            name: 'Test User'
        }))
    })
}