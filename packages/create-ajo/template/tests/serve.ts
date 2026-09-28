import { start } from './server.ts'

const app = await start(5217)
const stop = async () => { await app.close(); process.exit() }
process.once('SIGTERM', stop)
process.once('SIGINT', stop)
console.log(`Notebook test server ready at ${app.url}`)
