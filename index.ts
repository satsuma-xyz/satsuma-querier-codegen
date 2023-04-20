import fs from 'fs';
import yargs, {PositionalOptions} from 'yargs';
import v1Cli from './versions/v1';
import {CliVersion, CliFnArgs, UpgradeArgs} from "./shared/types";

enum SupportedVersions {
    v1 = 'v1',
}

const versions: Record<SupportedVersions, CliVersion> = {
    [SupportedVersions.v1]: v1Cli,
}

interface SatsumaJson {
    version: string;
}

const checkVersion = (version: string): version is SupportedVersions => {
    return Object.values(SupportedVersions).includes(version as SupportedVersions);
}

// Read the default version from the satsuma.json file
const DEFAULT_VERSION = (() => {
    try {
        const {version} = JSON.parse(fs.readFileSync('./.satsuma.json', 'utf8')) as SatsumaJson;
        return version;
    } catch (err) {
        return null;
    }
})();

const NEWEST_VERSION = 'v1';


if (require.main === module) {
    console.log('Entry');
    const cliOptions = yargs
        .option('cli-version', {
            alias: 'v',
            describe: 'Version of the script to run',
            type: 'string',
            choices: ['v1'],
            default: DEFAULT_VERSION || NEWEST_VERSION,
        }).command({
            command: 'server',
            describe: 'Generate the code to run the server',
            handler: (args) => {
                if (checkVersion(args.cliVersion)) {
                    versions[args.cliVersion].server(args as unknown as CliFnArgs)
                } else {
                    throw new Error(`Unsupported version: ${args.cliVersion}`);
                }
            },
        })
        .command({
            command: 'types',
            describe: 'Generate the graphql schema & types',
            handler: (args) => {
                if (checkVersion(args.cliVersion)) {
                    versions[args.cliVersion].types(args as unknown as CliFnArgs)
                } else {
                    throw new Error(`Unsupported version: ${args.cliVersion}`);
                }
            },
        })
        .command({
            command: 'upgrade',
            describe: 'Upgrade the project to the latest version',
            handler: (args) => {
                if (checkVersion(args.cliVersion)) {
                    versions[args.cliVersion].upgrade(args as unknown as UpgradeArgs)
                } else {
                    throw new Error(`Unsupported version: ${args.cliVersion}`);
                }
            },
        }).parseSync();

    console.log('Exit', cliOptions);
}
