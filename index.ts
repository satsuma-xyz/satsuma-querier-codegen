import * as fs from 'fs';
import v1Cli from './versions/v1';
import {CliVersion, ServerArgs} from "./shared/types";

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

// Read the version from the satsuma.json file
const EXISTING_VERSION = (() => {
    try {
        const {version} = JSON.parse(fs.readFileSync('./.satsuma.json', 'utf8')) as SatsumaJson;
        return version;
    } catch (err) {
        return null;
    }
})();

const NEWEST_VERSION = 'v1';
const DEFAULT_VERSION = (EXISTING_VERSION || NEWEST_VERSION) as SupportedVersions;

export const generateServer = async (version: SupportedVersions = DEFAULT_VERSION, options: ServerArgs) => {
    if (!checkVersion(version)) {
        throw new Error(`Unsupported version: ${version}`);
    }

    await versions[version].server(options);
}

export const generateTypes = async (version: SupportedVersions = DEFAULT_VERSION, options: Record<string, any>) => {
    if (!checkVersion(version)) {
        throw new Error(`Unsupported version: ${version}`);
    }

    await versions[version].types(options);
}