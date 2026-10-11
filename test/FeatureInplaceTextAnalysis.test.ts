import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { CryptoHelperFactory } from "../src/services/CryptoHelperFactory.ts";
import { FeatureInplaceTextAnalysis } from "../src/features/feature-inplace-encrypt/featureInplaceTextAnalysis.ts";
import { FIXTURE_OBSOLETE, FIXTURE_PASSWORD, FIXTURE_TEXT, FIXTURE_V1, FIXTURE_V2 } from "./fixtures.ts";

describe( 'FeatureInplaceTextAnalysis', () => {

	it( 'allows encrypting plain text', () => {
		const analysis = new FeatureInplaceTextAnalysis( 'some plain text' );
		assert.equal( analysis.isEmpty, false );
		assert.equal( analysis.canEncrypt, true );
		assert.equal( analysis.canDecrypt, false );
		assert.equal( analysis.containsEncryptedMarkers, false );
		assert.equal( analysis.decryptable, undefined );
	});

	it( 'flags empty text', () => {
		const analysis = new FeatureInplaceTextAnalysis( '' );
		assert.equal( analysis.isEmpty, true );
		assert.equal( analysis.canDecrypt, false );
	});

	const formats = [
		{ prefix: '%%🔐β ', suffix: ' 🔐%%', version: 2, visible: false, fixture: FIXTURE_V2 },
		{ prefix: '🔐β ', suffix: ' 🔐', version: 2, visible: true, fixture: FIXTURE_V2 },
		{ prefix: '%%🔐α ', suffix: ' 🔐%%', version: 1, visible: false, fixture: FIXTURE_V1 },
		{ prefix: '🔐α ', suffix: ' 🔐', version: 1, visible: true, fixture: FIXTURE_V1 },
		{ prefix: '%%🔐 ', suffix: ' 🔐%%', version: 0, visible: false, fixture: FIXTURE_OBSOLETE },
		{ prefix: '🔐 ', suffix: ' 🔐', version: 0, visible: true, fixture: FIXTURE_OBSOLETE },
	];

	for ( const { prefix, suffix, version, visible, fixture } of formats ) {

		it( `parses and decrypts '${prefix}' blocks`, async () => {
			const analysis = new FeatureInplaceTextAnalysis( `${prefix}${fixture}${suffix}` );

			assert.equal( analysis.canDecrypt, true );
			assert.equal( analysis.canEncrypt, false );
			assert.equal( analysis.hasObsoleteEncryptedPrefix, version === 0 );
			assert.ok( analysis.decryptable );
			assert.equal( analysis.decryptable.version, version );
			assert.equal( analysis.decryptable.showInReadingView, visible );
			assert.equal( analysis.decryptable.base64CipherText, fixture );
			assert.equal( analysis.decryptable.hint, undefined );

			const helper = CryptoHelperFactory.BuildFromDecryptableOrThrow( analysis.decryptable );
			assert.equal( await helper.decryptFromBase64( analysis.decryptable.base64CipherText, FIXTURE_PASSWORD ), FIXTURE_TEXT );
		});

		it( `parses the hint of '${prefix}' blocks`, () => {
			const analysis = new FeatureInplaceTextAnalysis( `${prefix}💡my hint💡${fixture}${suffix}` );

			assert.equal( analysis.canDecrypt, true );
			assert.ok( analysis.decryptable );
			assert.equal( analysis.decryptable.hint, 'my hint' );
			assert.equal( analysis.decryptable.base64CipherText, fixture );
		});

	}

	it( 'rejects a block with an unterminated hint', () => {
		const analysis = new FeatureInplaceTextAnalysis( `%%🔐β 💡my hint${FIXTURE_V2} 🔐%%` );
		assert.equal( analysis.canDecrypt, false );
		assert.equal( analysis.decryptable, undefined );
	});

	it( 'rejects a block missing its suffix', () => {
		const analysis = new FeatureInplaceTextAnalysis( `%%🔐β ${FIXTURE_V2}` );
		assert.equal( analysis.canDecrypt, false );
		assert.equal( analysis.canEncrypt, false );
	});

	it( 'rejects a selection spanning two blocks', () => {
		const analysis = new FeatureInplaceTextAnalysis( `%%🔐β ${FIXTURE_V2} 🔐%% and %%🔐β ${FIXTURE_V2} 🔐%%` );
		assert.equal( analysis.canDecrypt, false );
		assert.equal( analysis.canEncrypt, false );
	});

	it( 'refuses to encrypt text that already contains an encrypted block', () => {
		const analysis = new FeatureInplaceTextAnalysis( `before %%🔐β ${FIXTURE_V2} 🔐%% after` );
		assert.equal( analysis.containsEncryptedMarkers, true );
		assert.equal( analysis.canEncrypt, false );
		assert.equal( analysis.canDecrypt, false );
	});

});
