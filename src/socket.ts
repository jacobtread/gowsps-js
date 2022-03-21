import { IdentifiedPacket, PacketConvertedStruct, PacketDefinition, PacketStruct, WrappedDataView } from "./encoding";

export interface Config {
    autoReconnect?: boolean;
    reconnectTimeout?: number;
}

interface AssertedConfig {
    autoReconnect: boolean;
    reconnectTimeout: number;
}

type EventName = keyof EventListeners
type EventFunction = (event: EventListener) => any

interface EventListeners {
    open?: EventFunction,
    closed?: EventFunction
}

type PacketListener<T extends PacketStruct> = (packet: PacketConvertedStruct<T>) => any
type PacketListeners = { [key: number]: PacketListener<any>[] }


export class BinarySocket {
    private readonly url: string | URL;
    private readonly config: AssertedConfig;

    private ws: WebSocket;
    private eventListeners: EventListeners = {};
    private packetListeners: PacketListeners = {};

    private actors = new Map<number, PacketDefinition<any>>()

    constructor(url: string | URL, config?: Config) {
        this.url = url;
        if (!config) config = {}
        this.config = {
            autoReconnect: config.autoReconnect ?? false,
            reconnectTimeout: config.reconnectTimeout ?? 1000,
        }
        this.ws = this.createConnection()
    }

    private createConnection(): WebSocket {
        const ws = new WebSocket(this.url)
        ws.binaryType = 'arraybuffer';
        ws.onopen = (event: Event) => {
            if (ws.readyState === WebSocket.OPEN) {
                this.pushEvent('open', event)
            }
        }
        ws.onclose = (event: Event) => {
            this.pushEvent('closed', event)
            console.log('Connection closed', event)
            if (this.config.autoReconnect) {
                setTimeout(() => {
                    this.ws = this.createConnection();
                    console.debug('Reconnecting socket')
                }, this.config.reconnectTimeout)
            }
        }
        ws.onmessage = (event: MessageEvent) => this.onMessage(event)
        return ws
    }

    private onMessage(event: MessageEvent) {
        const dv = new WrappedDataView(event.data as ArrayBuffer)
        const packetId = dv.getVarInt()
        const actor = this.actors.get(packetId)
        if (actor) {
            const out = actor.decode(dv)
            const listeners = this.packetListeners[packetId]
            if (listeners) {
                for (let listener of listeners) {
                    listener(out)
                }
            }
        } else {
            console.error(`No packet actor defined for ${packetId.toString(16)}`)
        }
    }

    send(packet: IdentifiedPacket<any>) {
        const actor = this.actors.get(packet.id)
        if (actor) {
            const out = new ArrayBuffer(actor.computeSize(packet))
            const dv = new WrappedDataView(out)
            actor.encode(dv, packet)
            this.ws.send(out)
        }
    }

    private pushEvent(this: BinarySocket, key: EventName, event: any) {
        const listener = this.eventListeners[key]
        if (listener !== undefined) {
            listener(event)
        }
    }

    setEventListener(name: EventName, listener: EventFunction) {
        this.eventListeners[name] = listener
    }

    definePacket(packet: PacketDefinition<any>) {
        this.actors.set(packet.id, packet)
    }

    addListener<T extends PacketStruct>(definition: PacketDefinition<T>, handler: PacketListener<T>) {
        this.packetListeners[definition.id].push(handler)
    }
}