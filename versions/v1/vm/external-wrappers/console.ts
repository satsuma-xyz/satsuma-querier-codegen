import {SatsumaVM} from "../types";

export const addConsoleToVM = (vm: SatsumaVM) => {
    // Transfer console to the isolated context under the console object
    const consoleMethods = ['warn', 'log', 'error', 'debug', 'info', 'table'];
    const consoleName = (method: string) => `console__${method}`;
    for (const method of consoleMethods) {
        vm.jail.setSync(consoleName(method), function (...args: any[]) {
            // @ts-ignore
            console[method](...args)
        });
    }
    vm.context.evalSync(`console = {${consoleMethods.map((m) => `${m}: ${consoleName(m)}`).join(', ')}};`);
}