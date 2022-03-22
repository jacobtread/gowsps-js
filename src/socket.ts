import { IdentifiedPacket, PacketDefinition, PacketStruct, PacketStructTyped } from "./packets";
import { DataViewTracker, VarInt } from "./data";

export interface Config {
    reconnectTimeout?: number;
}

type EventFunction = (event: Event) => any
type PacketListener<T extends PacketStruct, K extends PacketStructTyped<T>> = (packet: K) => any;
type PacketListeners = { [key: number]: PacketListener<any, any>[] }

/**
 * A wrapper around the websocket class to provide functionality
 * for encoding and decoding binary packets for GoWSPS
 */
export class BinarySocket {
    // The websocket connection
    ws: WebSocket;
    // The configuration settings
    config: Config;

    // The url that should be connected to
    private readonly url: string | URL;

    // Open and close event listeners
    private openListener?: EventFunction;
    private closeListener?: EventFunction;

    // Listeners for each packet types
    private packetListeners: PacketListeners = {};

    // The definitions mapped to the id of the packet
    private definitions: Record<number, PacketDefinition<any>> = {}

    // Tracker for tracking write offset position
    private writeTracker: DataViewTracker = new DataViewTracker()
    // Tracker for tracking read offset position
    private readTracker: DataViewTracker = new DataViewTracker()

    /**
     * Creates a new instance of the binary socket
     *
     * @param url
     * @param config
     */
    constructor(url: string | URL, config?: Config) {
        this.url = url;
        this.config = config ?? {};
        this.ws = this.createConnection()
    }

    /**
     * Creates a new connection to the websocket and adds
     * all the listeners
     *
     * @private Shouldn't be accessed outside this class
     */
    private createConnection(): WebSocket {
        const ws = new WebSocket(this.url)
        ws.binaryType = 'arraybuffer';
        ws.onopen = (event: Event) => {
            if (ws.readyState === WebSocket.OPEN) {
                this.openListener?.call(this, event)
            }
        }
        ws.onclose = (event: Event) => {
            this.closeListener?.call(this, event)
            console.log('Connection closed', event)
            if (this.config.reconnectTimeout !== undefined) {
                setTimeout(() => {
                    this.ws = this.createConnection();
                    console.debug('Reconnecting socket')
                }, this.config.reconnectTimeout)
            }
        }
        ws.onmessage = (event: MessageEvent) => {
            const view: DataView = new DataView(event.data as ArrayBuffer)
            const id: number = VarInt.decode(view, this.readTracker)
            const definition: PacketDefinition<any> | undefined = this.definitions[id]
            if (definition) {
                const out = definition.decode(view, this.readTracker)
                const listeners = this.packetListeners[id]
                if (listeners) {
                    for (let listener of listeners) {
                        listener(out)
                    }
                }
            } else {
                console.error(`No packet actor defined for ${id.toString(16)}`)
            }
            this.readTracker.reset()
        }
        return ws
    }

    send(packet: IdentifiedPacket<any>) {
        const actor = this.definitions[packet.id]
        if (actor) {
            const out = actor.encode(this.writeTracker, packet)
            this.ws.send(out)
        }
        this.writeTracker.reset()
    }

    definePacket(packet: PacketDefinition<any>) {
        this.definitions[packet.id] = packet
    }

    addListener<T extends PacketStruct>(definition: PacketDefinition<T>, handler: PacketListener<T, PacketStructTyped<T>>) {
        const list = this.packetListeners[definition.id]
        if (list) {
            list.push(handler)
        } else {
            this.packetListeners[definition.id] = [handler]
        }
    }

    setOpenListener(listener: EventFunction) {
        this.openListener = listener
    }

    setCloseListener(listener: EventFunction) {
        this.closeListener = listener
    }
}
