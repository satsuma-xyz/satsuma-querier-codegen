import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {CreateServerConfig} from "./template/types";
import { execSync } from 'child_process';

export const generateServer = (config: CreateServerConfig, metadata: Record<string, any>, inputDirectory: string, outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'satsuma-')), verbose?: string): string => {
    // Write the server.json
    fs.writeFileSync(path.join(outputDirectory, 'server.config.json'), JSON.stringify(config));

    // Write the satsuma config
    fs.writeFileSync(path.join(outputDirectory, '.satsuma.json'), JSON.stringify(metadata));

    // copy resolvers.ts & typeDefs.ts from inputDirectory to outputDirectory
    const required = [
        'resolvers.ts',
        'typeDefs.ts',
    ];
    for (const file of required) {
        fs.copyFileSync(path.join(inputDirectory, file), path.join(outputDirectory, file));
    }

    // Copy helpers, if it's present.
    const helpersPath = path.join(inputDirectory, 'helpers.ts');
    if (fs.existsSync(helpersPath)) {
        fs.copyFileSync(helpersPath, path.join(outputDirectory, 'helpers.ts'));
    }

    // copy all files in the templates directory to outputDirectory
    const templatesDirectory = path.join(__dirname, 'template');
    const templateFiles = [
        'package.json',
        'tsconfig.json',
        "pl.json",
        "server.ts",
        "start-server.ts",
        "types.ts",
        "deep-clone-vm.ts",
        "knex.ts",
    ]
    for (const file of templateFiles) {
        if (file.endsWith('.json') || file.endsWith('.ts')) {
            const filePath = path.join(templatesDirectory, file);
            if (fs.statSync(filePath).isFile()) {
                fs.copyFileSync(filePath, path.join(outputDirectory, file));
            }
        }
    }

    // This gets renamed by .github action to avoid npm publish filtering it out
    fs.renameSync(path.join(outputDirectory, 'pl.json'), path.join(outputDirectory, 'package-lock.json'));

    return outputDirectory;
}