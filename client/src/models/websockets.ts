export enum MessageType {
    LOG = 'log',
    METADATA_UPDATE = 'metadata-update',
    // Add more types as needed
}

export interface Message<T = any> {
    source: string;
    command: MessageType;
    content: T;
}

// Specific content structure for metadata updates
export interface MetadataUpdatePayload {
    action: 'increment' | 'set';
    target: string;
    value?: any;
    fullname: string;
    homePath: string;
    type: 'video' | 'image' | 'folder';
}