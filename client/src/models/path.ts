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

        const deconstructed: string[] = path.split('/');
        let reconstructed: string[] = [];
        let result: Path[] = [];

        for (const path of deconstructed) {

            reconstructed.push(path);
            result.push(new Path(path, reconstructed.join('/')));
        }
        return result;
    }
}