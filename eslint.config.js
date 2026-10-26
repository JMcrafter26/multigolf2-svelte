import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		// The legacy implementation is kept as a read-only reference.
		ignores: ['multigolf2/**', 'build/**', 'static/**']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// The app is deployed at the domain root and preserves the legacy
			// absolute URLs, so resolve() would only add noise here.
			'svelte/no-navigation-without-resolve': 'off',
			// Plain Date/Set/URL/URLSearchParams instances are used as
			// non-reactive simulation data, not as Svelte state.
			'svelte/prefer-svelte-reactivity': 'off'
		}
	},
	{
		// These pages render the static HTML that was extracted from the legacy
		// website. The HTML is trusted, checked-in content, never user input.
		files: [
			'src/routes/about/**',
			'src/routes/data-privacy/**',
			'src/routes/impressum/**',
			'src/routes/promo/**'
		],
		rules: { 'svelte/no-at-html-tags': 'off' }
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {}
	}
);
