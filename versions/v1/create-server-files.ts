import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {CreateServerConfig} from "./template/types";
import { execSync } from 'child_process';

export const generateServer = (config: CreateServerConfig, inputDirectory: string, outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'satsuma-'))): string => {
    // Write the server.json
    fs.writeFileSync(path.join(outputDirectory, 'server.json'), JSON.stringify(config));

    // copy resolvers.ts, typeDefs.ts, and satsuma.json from inputDirectory to outputDirectory
    const required = [
        '.satsuma.json',
        'resolvers.ts',
        'typeDefs.ts',
    ]
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
    const templateFiles = fs.readdirSync(templatesDirectory);
    for (const file of templateFiles) {
        if (file.endsWith('.json') || file.endsWith('.ts')) {
            const filePath = path.join(templatesDirectory, file);
            if (fs.statSync(filePath).isFile()) {
                fs.copyFileSync(filePath, path.join(outputDirectory, file));
            }
        }
    }

    // Run npm install & typescript compile in that directory
    execSync('npm install', { cwd: outputDirectory });
    execSync('npx tsc start-server.ts', { cwd: outputDirectory });

    return outputDirectory;
}