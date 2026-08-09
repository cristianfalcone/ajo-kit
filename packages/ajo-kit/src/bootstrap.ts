import type { Kysely } from './database'
import type { EngineEnvironment } from './engine-config'

/** Application startup hook run after migrations and before request handling. */
export type Bootstrap<Database = any> = (context: {
	db: Kysely<Database>
	config: Readonly<EngineEnvironment>
}) => Promise<void>

type Root = () => Promise<Record<string, unknown>>

/** Runs the optional bootstrap export from the application root module. */
export async function run(
	root: Root | undefined,
	database: () => Kysely<any>,
	config: Readonly<EngineEnvironment>,
): Promise<void> {
	if (!root) return

	const hook = (await root()).bootstrap as Bootstrap | undefined
	if (hook) await hook({ db: database(), config })
}
