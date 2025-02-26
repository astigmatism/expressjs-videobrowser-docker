export interface Message {
    source: string;
    command: MessageType;
    content: string;
}

export enum MessageType {
    LOG = 'log'
}