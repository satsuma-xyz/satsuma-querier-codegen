import {CreateServerConfig} from "../versions/v1/types";

export type CliFnArgs = {
}

export type UpgradeArgs = CliFnArgs & {from: string}
export type ServerArgs = CliFnArgs & CreateServerConfig & {outputPath: string}

type CliFunction<T extends CliFnArgs = CliFnArgs> = (args: T) => Promise<void>;

export interface CliVersion {
    server: CliFunction<ServerArgs>;
    types: CliFunction;
    upgrade: CliFunction<UpgradeArgs>;
}