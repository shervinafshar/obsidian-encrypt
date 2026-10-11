import esbuild from "esbuild";
import { readdirSync } from 'fs';

// Bundles the tests so they can be run with the node test runner (see `npm test`)

const testDir = './test';
const outDir = './dist/test';

await esbuild.build({
	entryPoints: readdirSync( testDir )
		.filter( name => name.endsWith('.test.ts') )
		.map( name => `${testDir}/${name}` ),
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node20',
	logLevel: "warning",
	sourcemap: 'inline',
	outdir: outDir,
	outExtension: { '.js': '.mjs' },
});
