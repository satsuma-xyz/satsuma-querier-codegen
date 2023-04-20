export type CliFnArgs = {
    cliVersion: string;
}

export type UpgradeArgs = CliFnArgs & {from: string}

type CliFunction<T extends CliFnArgs = CliFnArgs> = (args: T) => void;

export interface CliVersion {
    server: CliFunction;
    types: CliFunction;
    upgrade: CliFunction<UpgradeArgs>;
}