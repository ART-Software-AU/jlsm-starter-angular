# Applying the JSON-LD renderer to an Angular head

Instructions for an agent adding this renderer to a customer's Sitecore Content SDK Angular head. Follow the
steps in order and change nothing else.

1. Copy `src/lib/jsonld/jsonld.ts` and `src/lib/jsonld/jsonld-script.component.ts` from this repository into
   the head's `src/lib/jsonld/` folder. Copy the bytes; do not retype either file, because `jsonld.ts` holds
   escape sequences that retyping corrupts.
2. Open the head's shared layout component, usually `src/app/shared/layout.component.ts`.
3. Add `JsonLdScriptComponent` to its `imports`.
4. Add a `dates` field:
   `resource( { params: () => this.page().layout, loader: ( { params } ) => readPageDates( params, { contextId } ) } )`,
   where `contextId` is the Edge context id the head already passes to the Content SDK.
5. Add `<jlsm-json-ld-script [layout]="page().layout" [dates]="dates.value()" />` exactly once, after the
   footer. `layout` is the layout service data, never the `Page`.
6. Do not register `JSON-LD` in the component map, add site settings, add a dependency, or copy
   `tests/angularJitPlugin.ts`.
7. Build the head with server-side rendering. Then fetch a published page and confirm its HTML has exactly
   one `<script type="application/ld+json" data-source="…">` in the body.

The README has the full layout code.
