import {CliVersion} from "../../shared/types";

const v1: CliVersion = {
    server: (args) => {
        console.log('server v1', args);
    },
    types: (args) => {
        console.log('types v1', args);
    },
    upgrade: (args) => {
        console.log('upgrade v1', args);
    }
}

export default v1;
