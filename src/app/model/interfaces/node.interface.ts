export interface Node {
    tag: string;
    attrs?: {
    [key: string]: string;
    };
    children?: (Node | string)[];
}