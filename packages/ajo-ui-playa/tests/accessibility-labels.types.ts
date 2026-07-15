import type {
	CommandDialogArgs,
} from 'ajo-ui-playa/command'
import type {
	InputDateArgs,
	InputDateTimeArgs,
	InputTimeArgs,
} from 'ajo-ui-playa/input-date'

declare const command: CommandDialogArgs
declare const date: InputDateArgs
declare const dateTime: InputDateTimeArgs
declare const time: InputTimeArgs

/** Compile-only contract: every nested assistive-technology label is a named string override. */
export const accessibilityLabels: Array<string | undefined> = [
	command.closeLabel,
	date.emptyLabel,
	dateTime.emptyLabel,
	time.emptyLabel,
]
