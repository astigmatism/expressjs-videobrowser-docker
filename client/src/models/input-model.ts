// input-modal-config.ts
export interface InputModalConfig {
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    buttonLabel?: string;
    emoji?: string;
    onSubmit?: (value: string) => void;
}