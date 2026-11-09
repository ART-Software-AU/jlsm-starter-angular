import { Component, computed, inject, input, makeStateKey, PLATFORM_ID, resource, TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { ComponentRendering, SITECORE_CONFIG_TOKEN, SitecoreContextService } from '@sitecore-content-sdk/angular';

import { JsonLdRendering, LayoutServiceData, PageItemDates, readPageDates } from './jsonld';
import { JsonLdScriptComponent } from './jsonld-script.component';

/**
 * The `JSON-LD` rendering. The first one on the page writes the script holding every JSON-LD rendering on
 * it; the others render nothing, so the page carries one script whatever number of graphs it has.
 */
@Component( {
	selector: 'jlsm-json-ld',
	imports: [JsonLdScriptComponent],
	template: `
		@if ( writesThePage() ) {
			<jlsm-json-ld-script [layout]="layout()" [dates]="dates.value()" />
		}
	`
} )
export class JsonLdComponent {
	/** Set by `sc-placeholder` on every mapped component. */
	readonly rendering = input<ComponentRendering>();
	readonly fields = input<{ [key: string]: unknown }>( {} );
	readonly params = input<{ [key: string]: string }>( {} );

	private readonly context = inject( SitecoreContextService );
	private readonly config = inject( SITECORE_CONFIG_TOKEN );
	private readonly transferState = inject( TransferState );
	private readonly onServer = isPlatformServer( inject( PLATFORM_ID ) );

	readonly layout = computed<LayoutServiceData | undefined>( () => this.context.page()?.layout );

	readonly writesThePage = computed( () => JsonLdRendering.findAll( this.layout() )[0]?.uid === this.rendering()?.uid );

	/** Read on the server, where the Edge context id is, and carried to the browser in the transfer state. */
	readonly dates = resource( {
		params: () => this.writesThePage() ? this.layout() : undefined,
		loader: ( { params } ) => this.readDates( params )
	} );

	private async readDates( layout: LayoutServiceData ): Promise<PageItemDates | null> {
		const route = layout.sitecore?.route;
		const key = makeStateKey<PageItemDates | null>( `jlsm-page-dates:${route?.itemId ?? ''}:${route?.itemLanguage ?? ''}` );

		if ( !this.onServer && this.transferState.hasKey( key ) ) return this.transferState.get( key, null );

		const dates = await readPageDates( layout, { contextId: this.config.api?.edge?.contextId ?? '' } );

		if ( this.onServer ) this.transferState.set( key, dates );

		return dates;
	}
}

export default JsonLdComponent;
