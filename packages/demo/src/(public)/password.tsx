import type { Stateless } from 'ajo'
import { Field, FieldDescription, FieldLabel } from 'ajo-ui-playa/field'
import { Input } from 'ajo-ui-playa/input'

const Password: Stateless<{ disabled: boolean; label?: string }> = ({ disabled, label = 'Password' }) => (
	<>
		<Field>
			<FieldLabel for="password">{label}</FieldLabel>
			<Input
				id="password"
				type="password"
				name="password"
				required
				minlength={8}
				autocomplete="new-password"
				disabled={disabled}
				aria-describedby="password-hint"
			/>
			<FieldDescription id="password-hint">At least 8 characters</FieldDescription>
		</Field>

		<Field>
			<FieldLabel for="confirm">Confirm Password</FieldLabel>
			<Input
				id="confirm"
				type="password"
				name="confirm"
				required
				minlength={8}
				autocomplete="new-password"
				disabled={disabled}
			/>
		</Field>
	</>
)

export default Password
