import { defineConfig } from 'vitest/config';

import { angularJit } from './tests/angularJitPlugin';

export default defineConfig( {
	plugins: [angularJit()],
	test: {
		environment: 'jsdom',
		include: ['tests/**/*.test.ts']
	}
} );
