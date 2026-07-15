import Button from 'ajo-ui-playa/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from 'ajo-ui-playa/card'

export default () => (
	<main class="mx-auto flex min-h-screen max-w-xl items-center px-6">
		<Card class="w-full">
			<CardHeader>
				<CardTitle>Welcome to ajo-kit</CardTitle>
				<CardDescription>Edit src/page.tsx to get started.</CardDescription>
			</CardHeader>
			<CardContent class="text-sm text-muted-foreground">
				Playa is already connected to UnoCSS through one preset.
			</CardContent>
			<CardFooter>
				<Button>Build something</Button>
			</CardFooter>
		</Card>
	</main>
)
