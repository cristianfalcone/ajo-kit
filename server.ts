import { dev, prod, listen } from 'kit/node'
import sade from 'sade'

sade('kit')
  .version('1.0.0')
  .option('--port, -p', 'Port to start the server on', 5173)
  .command('dev')
  .describe('Start the development server')
  .action(async (opts: { port: number }) => { await listen(await dev(), opts.port) })
  .command('prod')
  .describe('Start the production server')
  .action(async (opts: { port: number }) => { await listen(await prod(), opts.port) })
  .parse(process.argv)
