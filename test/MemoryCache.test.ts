import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { MemoryCache } from "../src/services/MemoryCache.ts";

describe( 'MemoryCache', () => {

	it( 'returns the default for a missing key', () => {
		const cache = new MemoryCache<string>();
		assert.equal( cache.get( 'missing', 'default' ), 'default' );
		assert.equal( cache.getOrNull( 'missing' ), null );
		assert.equal( cache.containsKey( 'missing' ), false );
	});

	it( 'stores and overwrites values', () => {
		const cache = new MemoryCache<string>();
		cache.put( 'a', 'one' );
		cache.put( 'a', 'two' );
		assert.equal( cache.get( 'a', 'default' ), 'two' );
		assert.equal( cache.getOrNull( 'a' ), 'two' );
		assert.deepEqual( cache.getKeys(), ['a'] );
	});

	it( 'returns the first matching key in priority order', () => {
		const cache = new MemoryCache<string>();
		cache.put( 'b', 'bee' );
		cache.put( 'c', 'sea' );
		assert.equal( cache.getFirst( ['a', 'b', 'c'], 'default' ), 'bee' );
		assert.equal( cache.getFirst( ['c', 'b'], 'default' ), 'sea' );
		assert.equal( cache.getFirst( ['x', 'y'], 'default' ), 'default' );
	});

	it( 'removes and clears keys', () => {
		const cache = new MemoryCache<string>();
		cache.put( 'a', 'one' );
		cache.put( 'b', 'two' );

		assert.equal( cache.removeKey( 'a' ), true );
		assert.equal( cache.removeKey( 'a' ), false );
		assert.equal( cache.containsKey( 'a' ), false );

		cache.clear();
		assert.deepEqual( cache.getKeys(), [] );
	});

});
