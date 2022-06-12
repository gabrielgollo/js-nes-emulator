export interface BusInterface {
    ram: Uint8Array;
    read(address: number): number;
    write(address: number, value: number): void;
}