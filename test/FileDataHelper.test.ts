import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { CryptoHelper } from "../src/services/CryptoHelper.ts";
import { CryptoHelper2304 } from "../src/services/CryptoHelper2304.ts";
import { CryptoHelperFactory } from "../src/services/CryptoHelperFactory.ts";
import { CryptoHelperObsolete } from "../src/services/CryptoHelperObsolete.ts";
import { FileData, FileDataHelper, JsonFileEncoding } from "../src/services/FileDataHelper.ts";
import { Decryptable } from "../src/features/feature-inplace-encrypt/Decryptable.ts";
import { FIXTURE_PASSWORD, FIXTURE_TEXT, FIXTURE_V1, FIXTURE_V2 } from "./fixtures.ts";

function decryptable( version: number ): Decryptable {
	const result = new Decryptable();
	result.version = version;
	return result;
}

describe( 'CryptoHelperFactory', () => {

	it( 'encrypts with the current format by default', () => {
		const helper = CryptoHelperFactory.BuildDefault();
		assert.ok( helper instanceof CryptoHelper2304 );
		assert.equal( helper.vectorSize, 16 );
		assert.equal( helper.saltSize, 16 );
		assert.equal( helper.iterations, 210000 );
	});

	it( 'maps file versions to helpers', () => {
		assert.ok( CryptoHelperFactory.BuildFromFileDataOrNull( new FileData( '1.0', '', '' ) ) instanceof CryptoHelper );
		assert.ok( CryptoHelperFactory.BuildFromFileDataOrNull( new FileData( '2.0', '', '' ) ) instanceof CryptoHelper2304 );
		assert.equal( CryptoHelperFactory.BuildFromFileDataOrNull( new FileData( '3.0', '', '' ) ), null );
	});

	it( 'throws for an unknown file version', () => {
		assert.throws( () => CryptoHelperFactory.BuildFromFileDataOrThrow( new FileData( '3.0', '', '' ) ) );
	});

	it( 'maps inplace versions to helpers', () => {
		assert.ok( CryptoHelperFactory.BuildFromDecryptableOrNull( decryptable(0) ) instanceof CryptoHelperObsolete );
		assert.ok( CryptoHelperFactory.BuildFromDecryptableOrNull( decryptable(1) ) instanceof CryptoHelper );
		assert.ok( CryptoHelperFactory.BuildFromDecryptableOrNull( decryptable(2) ) instanceof CryptoHelper2304 );
		assert.equal( CryptoHelperFactory.BuildFromDecryptableOrNull( decryptable(3) ), null );
	});

	it( 'throws for an unknown inplace version', () => {
		assert.throws( () => CryptoHelperFactory.BuildFromDecryptableOrThrow( decryptable(3) ) );
	});

});

describe( 'FileDataHelper', () => {

	it( 'encrypts as the default version and keeps the hint', async () => {
		const data = await FileDataHelper.encrypt( 'password', 'my hint', 'note body' );
		assert.equal( data.version, FileDataHelper.DEFAULT_VERSION );
		assert.equal( data.version, '2.0' );
		assert.equal( data.hint, 'my hint' );
		assert.notEqual( data.encodedData, 'note body' );
	});

	it( 'round trips', async () => {
		const data = await FileDataHelper.encrypt( 'password', '', 'note body' );
		assert.equal( await FileDataHelper.decrypt( data, 'password' ), 'note body' );
	});

	it( 'round trips an empty note', async () => {
		const data = await FileDataHelper.encrypt( 'password', '', '' );
		assert.equal( await FileDataHelper.decrypt( data, 'password' ), '' );
	});

	it( 'returns null for the wrong password', async () => {
		const data = await FileDataHelper.encrypt( 'password', '', 'note body' );
		assert.equal( await FileDataHelper.decrypt( data, 'Password' ), null );
	});

	it( 'decrypts v1.0 files', async () => {
		const data = new FileData( '1.0', '', FIXTURE_V1 );
		assert.equal( await FileDataHelper.decrypt( data, FIXTURE_PASSWORD ), FIXTURE_TEXT );
	});

	it( 'decrypts v2.0 files', async () => {
		const data = new FileData( '2.0', '', FIXTURE_V2 );
		assert.equal( await FileDataHelper.decrypt( data, FIXTURE_PASSWORD ), FIXTURE_TEXT );
	});

	it( 'treats a file with no encoded data as empty', async () => {
		assert.equal( await FileDataHelper.decrypt( new FileData( '2.0', '', '' ), 'anything' ), '' );
	});

	it( 'throws for an unknown version', async () => {
		await assert.rejects( FileDataHelper.decrypt( new FileData( '3.0', '', FIXTURE_V2 ), FIXTURE_PASSWORD ) );
	});

});

describe( 'JsonFileEncoding', () => {

	it( 'round trips file data', () => {
		const data = new FileData( '2.0', 'hint "with" quotes 💡', FIXTURE_V2 );
		assert.deepEqual( JsonFileEncoding.decode( JsonFileEncoding.encode( data ) ), { ...data } );
	});

	it( 'decodes an on-disk .mdenc file', async () => {
		const onDisk = `{\n  "version": "2.0",\n  "hint": "a hint",\n  "encodedData": "${FIXTURE_V2}"\n}`;
		const data = JsonFileEncoding.decode( onDisk );
		assert.equal( data.hint, 'a hint' );
		assert.equal( await FileDataHelper.decrypt( data, FIXTURE_PASSWORD ), FIXTURE_TEXT );
	});

	it( 'decodes an empty file as an empty note of the default version', () => {
		const data = JsonFileEncoding.decode( '' );
		assert.equal( data.version, FileDataHelper.DEFAULT_VERSION );
		assert.equal( data.hint, '' );
		assert.equal( data.encodedData, '' );
	});

	it( 'recognises encoded content', async () => {
		const encoded = JsonFileEncoding.encode( await FileDataHelper.encrypt( 'password', '', 'note body' ) );
		assert.equal( JsonFileEncoding.isEncoded( encoded ), true );
		assert.equal( JsonFileEncoding.isEncoded( '# A markdown note\n\nwith text' ), false );
		assert.equal( JsonFileEncoding.isEncoded( '' ), false );
	});

});
