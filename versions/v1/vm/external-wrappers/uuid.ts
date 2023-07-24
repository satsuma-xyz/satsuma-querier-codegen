import {SatsumaVM} from "../types";
import * as uuid from 'uuid';

export const addUUIDToVM = async (vm: SatsumaVM) => {
    await vm.context.eval(`additionalContext.utils.uuid = {};`);

    for (const operationName of Object.keys(uuid)) {
        // @ts-ignore
        const operation = uuid[operationName];

        if (typeof operation !== 'function') {
            continue;
        }

        await vm.jail.set(`uuid__${operationName}`, operation);
        await vm.context.eval(`additionalContext.utils.uuid.${operationName} = uuid__${operationName};`);
    }
}