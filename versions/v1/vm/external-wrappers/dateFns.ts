import {SatsumaVM} from "../types";
import * as dateFns from 'date-fns';

export const addDateFnsToVM = async (vm: SatsumaVM) => {
    await vm.context.eval(`additionalContext.utils.dateFns = {};`);

    for (const operationName of Object.keys(dateFns)) {
        // @ts-ignore
        const operation = dateFns[operationName];

        if (typeof operation !== 'function') {
            continue;
        }

        await vm.jail.set(`dateFns__${operationName}`, operation);
        await vm.context.eval(`additionalContext.utils.dateFns.${operationName} = dateFns__${operationName};`);
    }
}