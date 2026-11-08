# JSON-LD Schema Manager — Angular add-on

Drops the JSON-LD Schema Manager renderer into an Angular head built from a Sitecore Content SDK Angular
starter kit.

JSON-LD Schema Manager compiles a schema.org document onto the datasource behind a `JSON-LD` rendering.
Sitecore puts that datasource on the page's layout, and this renderer reads the layout, fills the document in
and writes one `<script type="application/ld+json">` into the page **body**, including under server-side
rendering.

It is a drop-in, not a package: you copy two files into your head and own them from there. The only runtime
dependency is `@angular/core` 21 or later.

## What you copy

```
src/lib/jsonld/
├── jsonld.ts                    the engine
└── jsonld-script.component.ts   the standalone component you place in your layout
```

Keep them side by side: the component imports the engine as `'./jsonld'`. Everything else in this repository
is the smoke test.

## The one layout edit

Place the component once in the shared layout (`src/app/shared/layout.component.ts` in the starter), after
the body content, bound to the page's layout service data:

```ts
import { resource } from '@angular/core';
import { JsonLdScriptComponent } from 'lib/jsonld/jsonld-script.component';
import { readPageDates } from 'lib/jsonld/jsonld';

@Component({
  selector: 'app-layout',
  imports: [ScPlaceholderComponent, JsonLdScriptComponent],
  template: `
    <header>...</header>
    <main>...</main>
    <footer>...</footer>
    <jlsm-json-ld-script [layout]="page().layout" [dates]="dates.value()" />
  `,
})
export class LayoutComponent {
  readonly page = input.required<Page>();

  readonly dates = resource( {
    params: () => this.page().layout,
    loader: ( { params } ) => readPageDates( params, { contextId: environment.sitecoreEdgeContextId } ),
  } );
}
```

Where the `Page` is not an input, `SitecoreContextService` holds it as a signal:
`[layout]="context.page()?.layout"`.

There is no component to register in the component map and no site configuration: the site root and the
default language arrive on the layout.

Angular strips `<script>` from templates and from `[innerHTML]`, so the component has an empty template and
builds the element with `Renderer2` inside an `effect`. Effects run during server-side rendering, so the
script is in the served HTML.

## Page dates

The page's created and updated dates are the one thing the layout cannot carry, so `readPageDates` reads
them from Experience Edge with the context id the head already uses. It asks only when a rendering on the
page uses a date, holds the answer five minutes, and gives `null` after a failure or two seconds, in which
case the page still emits without `datePublished` and `dateModified`. If the context id must not reach the
browser, read only on the server (`isPlatformServer`) and carry the result across with `TransferState`.

## Editing mode

In the Pages editor the component emits no script and shows an inline `{ } JSON-LD` chip with the size of
what the published page carries. Its outer element has `class="jsonld-marker"`.

## Contract

This renderer reads contract **2**: the datasource carries `jsonTemplate`, `references`, `jlsmSiteRoot`,
`jlsmDefaultLanguage` and `jlsmContract`. A datasource on another contract emits nothing, and logs one
warning when the component is given a `logger`. Upgrade the app, republish every graph, then copy the new
files here.

## Checking it

```
npm install
npm test
npm run typecheck
```

The tests render the component in the browser and through `renderApplication`. `tests/angularJitPlugin.ts`
lets Vitest register signal inputs the way the Angular CLI does; a head built with the CLI does not need it.

On a published page, view the source: there should be exactly one `application/ld+json` script, in the body,
with `data-source` naming JSON-LD Schema Manager.

## Licence

MIT. See `LICENSE`.
