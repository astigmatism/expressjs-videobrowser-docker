export interface IPath {
    name: string,
    url: string
}

export class Path implements IPath {
    name: string;
    url: string;
    
    constructor(name: string, url: string) {

        if (name === '') name = 'home';
        if (url === '') url = '/';

        this.name = name;
        this.url = url;
    }

    static buildPathsFromListing(path: string): Path[] {
        if (path === "/") {
            return [new Path("home", "/")];
        }
    
        const deconstructed = path.split('/');
        let reconstructed: string[] = [];
        let result: Path[] = [];
    
        for (const segment of deconstructed) {
            if (segment !== "") {
                reconstructed.push(segment);
                result.push(new Path(segment, reconstructed.join('/')));
            }
        }
    
        return [new Path("home", "/"), ...result];
    }
}