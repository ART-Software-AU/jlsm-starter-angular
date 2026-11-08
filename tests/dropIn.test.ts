import '@angular/compiler';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { beforeAll, describe, expect, it } from 'vitest';

import { ATTRIBUTION, JsonValue, LayoutServiceData, PageItemDates } from '../src/lib/jsonld/jsonld';
import { JsonLdScriptComponent } from '../src/lib/jsonld/jsonld-script.component';

const CLUB = String.fromCharCode( 0x2663 );
const BACKSLASH = String.fromCharCode( 92 );

function jsonLdRendering( uid: string, template: unknown ) {
	return {
		uid,
		componentName: 'JSON-LD',
		fields: {
			jsonTemplate: { value: JSON.stringify( template ) },
			references: [],
			jlsmSiteRoot: { value: 'https://www.siriuscanada.com' },
			jlsmDefaultLanguage: { value: 'en' },
			jlsmContract: { value: '2' }
		}
	};
}

function layout( components: unknown[], pageEditing = false ): LayoutServiceData {
	return {
		sitecore: {
			context: { pageEditing, itemPath: '/sirius/home/research/q2-report' },
			route: {
				name: 'q2-report',
				itemLanguage: 'en',
				fields: { headline: { value: 'Q2 report' } },
				placeholders: {
					'headless-main': [
						{ componentName: 'Hero', uid: 'hero' },
						{ componentName: 'Container', uid: 'container', placeholders: { 'container-1': components } }
					]
				}
			}
		}
	};
}

const components = [
	jsonLdRendering( 'a', { '@type': 'Article', '@id': `${CLUB}page:id/article`, headline: `${CLUB}field:headline`, url: `${CLUB}page:url` } ),
	jsonLdRendering( 'b', { '@type': 'Organization', '@id': 'https://www.siriusgroup.com/#organization', name: 'Sirius Group' } )
];

const articleAndOrganisation = layout( components );

const expectedGraph = {
	'@context': 'https://schema.org',
	'@graph': [
		{ '@type': 'Article', '@id': 'https://www.siriuscanada.com/q2-report/#article', headline: 'Q2 report', url: 'https://www.siriuscanada.com/sirius/home/research/q2-report' },
		{ '@type': 'Organization', '@id': 'https://www.siriusgroup.com/#organization', name: 'Sirius Group' }
	]
};

const hostile = `</script><script>alert(1)</script><!-- a & b > c ${String.fromCharCode( 0x2028 )} d ${String.fromCharCode( 0x2029 )} e`;

const hostileLayout = layout( [jsonLdRendering( 'a', { '@type': 'Article', headline: hostile } )] );

@Component( {
	selector: 'jlsm-host',
	imports: [JsonLdScriptComponent],
	template: '<main>body</main><jlsm-json-ld-script [layout]="layout" [dates]="dates" />'
} )
class HostComponent {
	layout: LayoutServiceData | null = null;
	dates: PageItemDates | null = null;
}

function scriptsIn( root: ParentNode ): HTMLScriptElement[] {
	return Array.from( root.querySelectorAll( 'script[type="application/ld+json"]' ) );
}

describe( 'the Angular drop-in in the browser', () => {
	beforeAll( () => TestBed.initTestEnvironment( BrowserTestingModule, platformBrowserTesting() ) );

	it( 'emits one script holding every JSON-LD rendering on the page', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = articleAndOrganisation;

		await fixture.whenStable();

		const scripts = scriptsIn( fixture.nativeElement as HTMLElement );

		expect( scripts ).toHaveLength( 1 );
		expect( scripts[0].getAttribute( 'data-source' ) ).toBe( ATTRIBUTION );
		expect( JSON.parse( scripts[0].textContent ?? '' ) as JsonValue ).toEqual( expectedGraph );
	} );

	it( 'writes the page dates it is given', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = layout( [jsonLdRendering( 'd', { '@type': 'WebPage', dateModified: `${CLUB}page:updated` } )] );
		fixture.componentInstance.dates = { created: null, updated: '20261104T004826Z' };

		await fixture.whenStable();

		const scripts = scriptsIn( fixture.nativeElement as HTMLElement );

		expect( scripts ).toHaveLength( 1 );
		expect( scripts[0].textContent ).toContain( '"dateModified":"2026-11-04T00:48:26Z"' );
	} );

	it( 'emits nothing when the page carries no JSON-LD rendering', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = layout( [{ componentName: 'Hero', uid: 'hero' }] );

		await fixture.whenStable();

		expect( scriptsIn( fixture.nativeElement as HTMLElement ) ).toHaveLength( 0 );
	} );

	it( 'drops the script again when the layout stops carrying a JSON-LD rendering', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = articleAndOrganisation;

		await fixture.whenStable();

		expect( scriptsIn( fixture.nativeElement as HTMLElement ) ).toHaveLength( 1 );

		fixture.componentInstance.layout = layout( [] );

		fixture.changeDetectorRef.markForCheck();

		await fixture.whenStable();

		expect( scriptsIn( fixture.nativeElement as HTMLElement ) ).toHaveLength( 0 );
	} );

	it( 'shows the chip and no script in editing mode', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = layout( components, true );

		await fixture.whenStable();

		const element = fixture.nativeElement as HTMLElement;

		expect( scriptsIn( element ) ).toHaveLength( 0 );
		expect( element.textContent ).toContain( '{ } JSON-LD' );
		expect( element.textContent ).toMatch( /\d+ bytes/ );
		expect( element.querySelector( 'div' )?.getAttribute( 'style' ) ).toContain( '#99419F' );
		expect( element.querySelector( 'div' )?.getAttribute( 'class' ) ).toBe( 'jsonld-marker' );
	} );

	it( 'keeps a hostile value inside the script element', async () => {
		const fixture = TestBed.createComponent( HostComponent );

		fixture.componentInstance.layout = hostileLayout;

		await fixture.whenStable();

		const scripts = scriptsIn( fixture.nativeElement as HTMLElement );

		expect( scripts ).toHaveLength( 1 );
		expect( scripts[0].textContent ).not.toMatch( new RegExp( `[<>&${String.fromCharCode( 0x2028, 0x2029 )}]`, 'u' ) );
		expect( ( JSON.parse( scripts[0].textContent ?? '' ) as { '@graph': Array<{ headline: string }> } )['@graph'][0].headline ).toBe( hostile );
	} );
} );

@Component( {
	selector: 'jlsm-ssr-root',
	imports: [JsonLdScriptComponent],
	template: '<main>body</main><jlsm-json-ld-script [layout]="layout" />'
} )
class SsrRootComponent {
	layout = articleAndOrganisation;
}

@Component( {
	selector: 'jlsm-ssr-root',
	imports: [JsonLdScriptComponent],
	template: '<main>body</main><jlsm-json-ld-script [layout]="layout" />'
} )
class SsrHostileRootComponent {
	layout = hostileLayout;
}

function renderOnServer( root: typeof SsrRootComponent | typeof SsrHostileRootComponent ): Promise<string> {
	return renderApplication( ( context: BootstrapContext ) => bootstrapApplication( root, { providers: [provideServerRendering()] }, context ), {
		document: '<!doctype html><html><head></head><body><jlsm-ssr-root></jlsm-ssr-root></body></html>',
		url: '/'
	} );
}

describe( 'the Angular drop-in under server-side rendering', () => {
	it( 'writes the script into the served HTML, after the body content', async () => {
		const html = await renderOnServer( SsrRootComponent );

		const matches: string[] = html.match( /<script type="application\/ld\+json" data-source="[^"]*">([\s\S]*?)<\/script>/gu ) ?? [];

		expect( matches ).toHaveLength( 1 );

		const script = matches[0] ?? '';

		expect( html.indexOf( '<main>body</main>' ) ).toBeLessThan( html.indexOf( script ) );
		expect( html.indexOf( script ) ).toBeGreaterThan( html.indexOf( '<body' ) );

		const json = script.replace( /^<script[^>]*>/u, '' ).replace( /<\/script>$/u, '' );

		expect( JSON.parse( json ) as JsonValue ).toEqual( expectedGraph );
	} );

	it( 'serves a hostile value already escaped, so the script cannot be closed early', async () => {
		const html = await renderOnServer( SsrHostileRootComponent );

		expect( html.match( /<\/script>/gu ) ).toHaveLength( 1 );
		expect( html ).toContain( `${BACKSLASH}u003c${BACKSLASH}/script${BACKSLASH}u003e` );
	} );
} );
