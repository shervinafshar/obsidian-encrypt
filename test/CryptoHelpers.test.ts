import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { CryptoHelper } from "../src/services/CryptoHelper.ts";
import { CryptoHelper2304 } from "../src/services/CryptoHelper2304.ts";
import { CryptoHelperObsolete } from "../src/services/CryptoHelperObsolete.ts";
import { ICryptoHelper } from "../src/services/ICryptoHelper.ts";
import { FIXTURE_OBSOLETE, FIXTURE_PASSWORD, FIXTURE_TEXT, FIXTURE_V1, FIXTURE_V2 } from "./fixtures.ts";

const helpers: { name: string, build: () => ICryptoHelper, fixture: string }[] = [
	{ name: 'CryptoHelperObsolete', build: () => new CryptoHelperObsolete(), fixture: FIXTURE_OBSOLETE },
	{ name: 'CryptoHelper', build: () => new CryptoHelper(), fixture: FIXTURE_V1 },
	{ name: 'CryptoHelper2304', build: () => new CryptoHelper2304( 16, 16, 210000 ), fixture: FIXTURE_V2 },
];

const sampleTexts = [
	'',
	'a',
	'plain ascii text',
	'multi\nline\r\ntext\twith tabs',
	'unicode: héllo 🔐 мир 中文 العربية',
	'x'.repeat( 100_000 ),
];

function flipFirstChar( base64: string ): string {
	return ( base64[0] === 'A' ? 'B' : 'A' ) + base64.substring(1);
}

for ( const { name, build, fixture } of helpers ) {

	describe( name, () => {

		it( 'decrypts the frozen fixture', async () => {
			assert.equal( await build().decryptFromBase64( fixture, FIXTURE_PASSWORD ), FIXTURE_TEXT );
		});

		it( 'round trips', async () => {
			const helper = build();
			for ( const text of sampleTexts ) {
				const encrypted = await helper.encryptToBase64( text, 'password' );
				assert.equal( await helper.decryptFromBase64( encrypted, 'password' ), text );
			}
		});

		it( 'round trips with a unicode password', async () => {
			const helper = build();
			const encrypted = await helper.encryptToBase64( 'secret', 'пароль 🔑' );
			assert.equal( await helper.decryptFromBase64( encrypted, 'пароль 🔑' ), 'secret' );
		});

		it( 'round trips with an empty password', async () => {
			const helper = build();
			const encrypted = await helper.encryptToBase64( 'secret', '' );
			assert.equal( await helper.decryptFromBase64( encrypted, '' ), 'secret' );
		});

		it( 'does not leak the plaintext into the output', async () => {
			const encrypted = await build().encryptToBase64( 'plain ascii text', 'password' );
			assert.ok( !atob( encrypted ).includes( 'plain ascii text' ) );
		});

		it( 'returns null for the wrong password', async () => {
			const helper = build();
			assert.equal( await helper.decryptFromBase64( fixture, FIXTURE_PASSWORD + ' ' ), null );
			assert.equal( await helper.decryptFromBase64( fixture, '' ), null );
		});

		it( 'returns null for tampered ciphertext', async () => {
			const helper = build();
			assert.equal( await helper.decryptFromBase64( flipFirstChar( fixture ), FIXTURE_PASSWORD ), null );

			const truncated = btoa( atob( fixture ).slice( 0, -1 ) );
			assert.equal( await helper.decryptFromBase64( truncated, FIXTURE_PASSWORD ), null );
		});

		it( 'returns null for malformed input', async () => {
			const helper = build();
			assert.equal( await helper.decryptFromBase64( 'not base64 !!', FIXTURE_PASSWORD ), null );
			assert.equal( await helper.decryptFromBase64( '', FIXTURE_PASSWORD ), null );
			assert.equal( await helper.decryptFromBase64( 'AAAA', FIXTURE_PASSWORD ), null );
		});

	});

}

describe( 'CryptoHelper2304', () => {

	const helper = new CryptoHelper2304( 16, 16, 210000 );

	it( 'uses a fresh salt and iv for every encryption', async () => {
		const first = atob( await helper.encryptToBase64( 'same text', 'password' ) );
		const second = atob( await helper.encryptToBase64( 'same text', 'password' ) );

		assert.notEqual( first.slice( 0, 16 ), second.slice( 0, 16 ), 'iv' );
		assert.notEqual( first.slice( 16, 32 ), second.slice( 16, 32 ), 'salt' );
		assert.notEqual( first.slice( 32 ), second.slice( 32 ), 'ciphertext' );
	});

	it( 'cannot decrypt with a different iteration count', async () => {
		assert.equal( await new CryptoHelper2304( 16, 16, 1000 ).decryptFromBase64( FIXTURE_V2, FIXTURE_PASSWORD ), null );
	});

});

describe( 'CryptoHelper', () => {

	it( 'uses a fresh iv for every encryption', async () => {
		const helper = new CryptoHelper();
		const first = atob( await helper.encryptToBase64( 'same text', 'password' ) );
		const second = atob( await helper.encryptToBase64( 'same text', 'password' ) );

		assert.notEqual( first.slice( 0, 16 ), second.slice( 0, 16 ) );
	});

});

describe( 'format isolation', () => {

	it( 'no helper decrypts another format', async () => {
		for ( const { name, build } of helpers ) {
			for ( const other of helpers.filter( h => h.name !== name ) ) {
				assert.equal(
					await build().decryptFromBase64( other.fixture, FIXTURE_PASSWORD ),
					null,
					`${name} decrypted a ${other.name} payload`
				);
			}
		}
	});

});
