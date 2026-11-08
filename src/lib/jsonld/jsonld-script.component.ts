import { Component, computed, effect, ElementRef, inject, input, Renderer2 } from '@angular/core';

import { ATTRIBUTION, isEditing, JsonLdLogger, JsonLdPage, LayoutServiceData, PageItemDates, ScriptWriter } from './jsonld';

/**
 * The one `application/ld+json` script a page emits, holding every JSON-LD rendering on it in a single
 * `@graph`. In the Pages editor it shows the editing chip instead. Renders nothing when the page has no
 * JSON-LD to emit.
 */
@Component( {
	selector: 'jlsm-json-ld-script',
	template: ''
} )
export class JsonLdScriptComponent {
	/** The layout service response for the page, as the Content SDK's `Page.layout` holds it. */
	readonly layout = input<LayoutServiceData | null | undefined>();

	/** Where the engine reports a component it emits nothing for. */
	readonly logger = input<JsonLdLogger | undefined>();

	/** The page's dates, as `readPageDates( layout, { contextId } )` answers them. Without them a date token drops its key. */
	readonly dates = input<PageItemDates | null | undefined>();

	/** The page's JSON-LD, recomputed whenever an input changes. */
	readonly page = computed<JsonLdPage>( () => JsonLdPage.buildPage( this.layout(), this.logger(), this.dates() ?? null ) );

	private readonly host = inject<ElementRef<HTMLElement>>( ElementRef );
	private readonly renderer = inject( Renderer2 );

	constructor() {
		effect( () => this.render( this.page(), isEditing( this.layout() ) ) );
	}

	private render( page: JsonLdPage, editing: boolean ): void {
		const element = this.host.nativeElement;

		while ( element.firstChild ) this.renderer.removeChild( element, element.firstChild );

		if ( editing ) {
			this.renderer.appendChild( element, this.chip( page ) );

			return;
		}

		if ( page.isEmpty ) return;

		const script = this.renderer.createElement( 'script' );

		this.renderer.setAttribute( script, 'type', 'application/ld+json' );
		this.renderer.setAttribute( script, 'data-source', ATTRIBUTION );
		this.renderer.appendChild( script, this.renderer.createText( page.scriptText ) );
		this.renderer.appendChild( element, script );
	}

	private chip( page: JsonLdPage ): unknown {
		const chip = this.renderer.createElement( 'div' );
		const badge = this.renderer.createElement( 'span' );
		const text = this.renderer.createElement( 'span' );

		this.renderer.setAttribute( chip, 'class', ScriptWriter.CHIP_CLASS );
		this.renderer.setAttribute( chip, 'style', ScriptWriter.CHIP_STYLE );
		this.renderer.setAttribute( chip, 'title', ScriptWriter.CHIP_TITLE );
		this.renderer.setAttribute( badge, 'style', ScriptWriter.CHIP_BADGE_STYLE );
		this.renderer.appendChild( badge, this.renderer.createText( ScriptWriter.CHIP_BADGE ) );
		this.renderer.appendChild( text, this.renderer.createText( ScriptWriter.chipText( page ) ) );
		this.renderer.appendChild( chip, badge );
		this.renderer.appendChild( chip, text );

		return chip;
	}
}
