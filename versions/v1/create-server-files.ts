import {CreateServerConfig} from "./types";
import * as fs from 'fs';
import * as path from 'path';

export const createServerFiles = async (config: CreateServerConfig, outputPath = "./") => {
    const jsonConfig = JSON.stringify(config);
    const serverTemplatePath = path.resolve(path.join(__dirname, './server.template'));
    const serverPath = path.resolve(`${outputPath}/satsuma-server.tmp.ts`);

    // Read the server template file
    const serverTemplate = fs.readFileSync(serverTemplatePath, { encoding: 'utf8' });

    let serverFileContent = resolveRelativeImports(serverTemplate, serverTemplatePath, new Set<string>());

    // Replace the {{CONFIG}} template variable with the JSON stringified config object
    serverFileContent = serverFileContent.replace('{{CONFIG}}', jsonConfig);

    // Write the new server file to the specified path
    fs.writeFileSync(serverPath, `${serverFileContent}`);

    for (const f of [
        config.helpersFile, config.resolverFile, config.typeDefsFile
    ]) {
        // copy the file to the output path
        try {
            const fileContent = fs.readFileSync(f, {encoding: 'utf8'});
            const resolvedFileContent = resolveRelativeImports(fileContent, f, new Set<string>());
            const resolvedFilePath = path.resolve(`${outputPath}/${path.basename(f)}`);
            fs.writeFileSync(resolvedFilePath, resolvedFileContent);
        } catch (e) {
            console.log(e);
        }
    }

    return serverPath;
}

const resolveRelativeImports = (fileContent: string, filePath: string, visitedFiles: Set<string>): string => {
    // Return early if we've already visited this file
    if (visitedFiles.has(filePath)) {
        return '';
    }

    // Add this file to the visited set to prevent infinite recursion
    visitedFiles.add(filePath);

    // Parse the import content for relative imports and recursively resolve their dependencies
    const importRegex = /import\s+(.+?)\s+from\s+"(\.{1,2}\/.+?)";/gm;
    const importsToAppend: string[] = [];
    let resolvedImportContent = fileContent.replace(importRegex, (match, imports, importPath) => {
        const absoluteImportPath = path.resolve(path.dirname(filePath), importPath + '.ts');
        const importContent = fs.readFileSync(absoluteImportPath, { encoding: 'utf8' });
        const resolvedImportContent = resolveRelativeImports(importContent, absoluteImportPath, visitedFiles);
        importsToAppend.push(resolvedImportContent);
        return '';
    });

    // Append the imported file contents to the end of the resolved import content
    resolvedImportContent = `${resolvedImportContent}\n${importsToAppend.join('')}`;

    return resolvedImportContent;
}