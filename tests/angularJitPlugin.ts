import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { angularJitApplicationTransform } from '@angular/compiler-cli';
import ts from 'typescript';
import type { Plugin } from 'vite';

const root = resolve( dirname( fileURLToPath( import.meta.url ) ), '..' );

/**
 * A Vite plugin that emits each Angular-aware TypeScript file through the Angular JIT transform, so signal
 * inputs declared with `input()` are registered on the component the way the Angular CLI registers them.
 */
export function angularJit(): Plugin {
	let program: ts.Program | null = null;

	return {
		name: 'jlsm-angular-jit',
		enforce: 'pre',
		transform( code, id ) {
			if ( !id.endsWith( '.ts' ) || id.includes( 'node_modules' ) || !code.includes( '@angular/core' ) ) return null;

			program ??= createProgram();

			const sourceFile = program.getSourceFile( id.split( '\\' ).join( '/' ) );

			if ( !sourceFile ) return null;

			let output: string | null = null;

			program.emit(
				sourceFile,
				( name, text ) => { if ( name.endsWith( '.js' ) ) output = text; },
				undefined,
				false,
				{ before: [angularJitApplicationTransform( program )] } );

			return output === null ? null : { code: output, map: null };
		}
	};
}

function createProgram(): ts.Program {
	const configFile = ts.readConfigFile( resolve( root, 'tsconfig.json' ), ts.sys.readFile );

	const parsed = ts.parseJsonConfigFileContent( configFile.config, ts.sys, root );

	return ts.createProgram( parsed.fileNames, {
		...parsed.options,
		noEmit: false,
		declaration: false,
		sourceMap: false,
		inlineSourceMap: true,
		inlineSources: true,
		experimentalDecorators: true,
		module: ts.ModuleKind.ESNext,
		target: ts.ScriptTarget.ES2022
	} );
}
