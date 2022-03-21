import { PacketActor, WrappedDataView } from "./encoding";
import { DefinePacket, Packet } from "./packets";

export interface Config {
    autoReconnect?: boolean;
    reconnectTimeout?: number;
}

interface AssertedConfig {
    autoReconnect: boolean;
    reconnectTimeout: number;
}

export type EventFunction = (event: EventListener) => any

export interface EventListeners {
    open?: EventFunction,
    closed?: EventFunction
}

export type PacketListener<T extends Packet> = (packet: T) => any
type PacketListeners = { [key: number]: PacketListener<any>[] }

type EventName = keyof EventListeners

export class BinarySocket {
    private readonly url: string | URL;
    private readonly config: AssertedConfig;

    private ws: WebSocket;
    private eventListeners: EventListeners = {};
    private packetListeners: PacketListeners = {};

    private actors = new Map<number, PacketActor<any>>()

    constructor(url: string | URL, config?: Config) {
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

    private pushEvent(this: BinarySocket, key: EventName, event: any) {
        const listener = this.eventListeners[key]
        if (listener !== undefined) {
            listener(event)
        }
    }

    definePacket(id: number, packet: any) {
        const actor = new PacketActor(packet)
        this.actors.set(id, actor)
    }

    addListener<T extends Packet>(id: number, handler: PacketListener<T>) {
        this.packetListeners[id].push(handler)
    }
}