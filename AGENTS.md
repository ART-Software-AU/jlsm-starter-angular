# Applying the JSON-LD renderer to an Angular head

Instructions for an agent adding this renderer to a customer's Sitecore Content SDK Angular head. Follow the
steps in order and change nothing else.

1. In the shared layout component, usually `src/app/shared/layout.component.ts`, add
   `@if (scRoute()) { <sc-placeholder name="jlsm-jsonld" [rendering]="scRoute()!"></sc-placeholder> }` once,
   before `<header>`, inside the same wrapper element.
2. Copy `src/lib/jsonld/jsonld.ts`, `src/lib/jsonld/jsonld-script.component.ts` and
   `src/lib/jsonld/json-ld.component.ts` from this repository into the head's `src/lib/jsonld/` folder. Copy
   the bytes; do not retype any file, because `jsonld.ts` holds escape sequences that retyping can corrupt. Do
   not put them under `src/app/components`.
3. In `src/app/app.config.ts`, after the `.sitecore/component-map` import, import `JsonLdComponent` from
   `lib/jsonld/json-ld.component` and add `componentMap.set( 'JSON-LD', JsonLdComponent );`.
4. In `src/server.ts`, after the `.sitecore/component-map` import, import `JsonLdComponent` from
   `./lib/jsonld/json-ld.component` and add the same `componentMap.set( 'JSON-LD', JsonLdComponent );`.
5. If the head's scripts do not run `sitecore-tools:generate-map`, add `['JSON-LD', JsonLdComponent]` to
   `.sitecore/component-map.ts` instead of steps 3 and 4.
6. Confirm the component map has `PartialDesignDynamicPlaceholder`.
7. Add no Sitecore items, settings or dependencies: JLSM's Plugin
   Setup creates the rendering and the placeholder. Do not rename the `JSON-LD` rendering or its component
   name.
8. Build the head with server-side rendering. Then fetch a published page that carries a JLSM graph and
   confirm its HTML has exactly one `<script type="application/ld+json" data-source="…">` in the body.

The README has the full code.
