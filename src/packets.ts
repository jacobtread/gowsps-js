import { DataType, DataViewTracker, VarInt, VarIntSize } from "./data";

// Identity represents an object with an ID value
type Identity = { readonly id: number }
// Represents an object that has an ID property
type Identified<T> = T & Identity

// The user defined packet struct of keys to data types
export type PacketStruct = {
    [key: string]: DataType<any>
}

// The generated javascript typed packet struct
export type PacketStructTyped<Origin extends PacketStruct> = {
    [Key in keyof Origin]: Origin[Key] extends DataType<infer V> ? V : unknown
}

// Represents a key of a struct
type StructKey<T> = keyof T;
// Represents all the keys of a struct
type StructKeys<T> = Array<StructKey<T>>;

// Represents the pairing of a key and data type
type DefinitionField<T> = [StructKey<T>, DataType<any>];
// Represents all the pairs of keys and data types for a struct
type DefinitionFields<T> = DefinitionField<T>[];

// Represents a typed packet struct with an ID
export type IdentifiedPacket<T extends PacketStruct> = Identified<PacketStructTyped<T>>;

export class PacketDefinition<T extends PacketStruct> {

    public readonly id: number;
    private readonly fields: DefinitionFields<T>;

    /**
     * Creates a new packet definition from the provided data
     *
     * @param id The id of the packet
     * @param struct The structure of the packet
     * @param keys The order of the packet keys
     */
    constructor(id: number, struct: T, keys: StructKeys<T>) {
        this.id = id;
        const fields: DefinitionFields<T> = new Array(keys.length);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i], type = struct[key];
            fields[i] = [key, type];
        }
        this.fields = fields;
    }

    /**
     * Calculates the needed size for the underlying byte array
     * that must be produced. This uses the types for each field
     * and calls {@see DataType.getSize} with the value to determine
     * the actual resulting size of all the packet fields
     *
     * @param packet
     */
    computeSize(packet: PacketStructTyped<T>) {
        let size: number = 0;
        for (let [key, type] of this.fields) {
            const s = type.size
            if (typeof s === 'number') {
                size += s
            } else {
                size += s(packet[key])
            }
        }
        return size + VarIntSize(this.id)
    }

    /**
     * Create a new packet using the packet fields.
     * This function adds the packet id to the provided
     * packet data so that it can be sent
     *
     * @param data The data for the packet
     * @return The packet with its id added
     */
    create(data: PacketStructTyped<T>): IdentifiedPacket<T> {
        return {
            id: this.id,
            ...data
        }
    }

    /**
     * Decodes all the packet fields and returns
     * the new packet
     *
     * @param view The view of the data
     * @param tracker The data tracker
     * @return The newly created packet object
     */
    decode(view: DataView, tracker: DataViewTracker): PacketStructTyped<T> {
        const out: any = {};
        for (let [key, type] of this.fields) {
            out[key] = type.decode(view, tracker);
        }
        return out;
    }

    /**
     * Encodes the packet id and all of its fields to
     * an array buffer and returns the ArrayBuffer
     *
     * @param tracker The data tracker
     * @param packet The packet to encode
     * @return The encoded ArrayBuffer
     */
    encode(tracker: DataViewTracker, packet: IdentifiedPacket<T>): ArrayBuffer {
        const buffer = new ArrayBuffer(this.computeSize(packet));
        const view = new DataView(buffer);
        VarInt.encode(view, tracker, packet.id)
        for (let [key, type] of this.fields) {
            const value = packet[key]
            type.encode(view, tracker, value)
        }
        return buffer
    }
}