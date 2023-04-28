import {CreateServerConfig} from "../versions/v1/templates/types";

export type CliFnArgs = {
}

export type UpgradeArgs = CliFnArgs & {from: string}
export type ServerArgs = CliFnArgs & CreateServerConfig & {outputPath: string}

type CliFunction<T extends CliFnArgs = CliFnArgs, ReturnType = void> = (args: T) => Promise<ReturnType>;

export interface CliVersion {
    server: CliFunction<ServerArgs, string>;
    types: CliFunction;
    upgrade: CliFunction<UpgradeArgs>;
}