import {createNewSchema} from "./server.js";
import { printSchema } from 'graphql';
import fs from 'fs';

createNewSchema().then(schema => {
    fs.writeFileSync('./schema.graphql', printSchema(schema));
});
