# JSON-LD Schema Manager — Angular add-on

Adds the JSON-LD Schema Manager renderer to an Angular head built on the Sitecore Content SDK for Angular
(`@sitecore-content-sdk/angular` 1.x, Angular 21).

JSON-LD Schema Manager (JLSM) compiles each graph onto the datasource of a `JSON-LD` rendering and places that
rendering on pages through a partial design, in the `jlsm-jsonld` placeholder. Your head renders that
placeholder; the first `JSON-LD` rendering on the page writes one `<script type="application/ld+json">`
holding every graph on the page, in the **body**, including under server-side rendering.

These instructions are written for the Angular app that `create-content-sdk-app` generates (template
`angular`). Sitecore's [`sitecore-xmcloud-starter-js`](https://github.com/Sitecore/sitecore-xmcloud-starter-js)
repository has no Content SDK Angular example: its `examples/basic-spa/angular` is a JSS app and is not
covered here.

It is a drop-in, not a package: you copy three files into your head and own them from there.

## What is in this repository

| Path | Holds |
|---|---|
| `src/lib/jsonld/jsonld.ts` | The engine |
| `src/lib/jsonld/jsonld-script.component.ts` | The standalone component that writes the script |
| `src/lib/jsonld/json-ld.component.ts` | The `JSON-LD` component the placeholder renders |

## 1. Add the placeholder to the layout

Render a placeholder with the key `jlsm-jsonld` in the shared layout, `src/app/shared/layout.component.ts`,
before the header. The key is set in JLSM Settings on the dashboard; if you change it there, use the same key
here.

```ts
template: `
  …
  <div [attr.class]="layoutClassAttr()">
    @if (scRoute()) {
      <sc-placeholder name="jlsm-jsonld" [rendering]="scRoute()!"></sc-placeholder>
    }

    <header>…</header>
    <main>…</main>
    <footer>…</footer>
  </div>
`,
```

`ScPlaceholderComponent` is already in the layout's `imports`. Placed first, the script is near the top of
the HTML, and in the Pages editor the `{ } JSON-LD` chip shows above the header, where authors see it.

## 2. Copy the component into your project

Copy the three files in `src/lib/jsonld/` to the same folder in your head.

- Copy the files, do not retype them: `jsonld.ts` holds escape sequences that retyping can corrupt.
- Keep them in `src/lib`, outside `src/app/components`, so the component map generator does not register
  them (see step 3).
- Import them as `lib/jsonld/…`, the alias the template's `tsconfig.json` already declares.

## 3. Register the component in the component map

The map needs one entry, keyed by the rendering's component name:

```ts
// .sitecore/component-map.ts
export const componentMap = new Map<string, AngularContentSdkComponent>([
  // … built-in components and your other components
  ['JSON-LD', JsonLdComponent],
]);
```

The template generates `.sitecore/component-map.ts` from `src/app/components` on every `npm run dev` and
`npm run build`, and the Angular generator turns each file name into a PascalCase key. It cannot write the
key `JSON-LD`, and it overwrites an entry added by hand. So add the entry where the map is used, after the
generated map is imported. The template uses it in two places, and both need it:

`src/app/app.config.ts`:

```ts
import { componentMap } from '.sitecore/component-map';
import { JsonLdComponent } from 'lib/jsonld/json-ld.component';

componentMap.set( 'JSON-LD', JsonLdComponent );

// … { provide: SITECORE_COMPONENT_MAP, useValue: componentMap } as before
```

`src/server.ts`, for the editing config endpoint Sitecore Pages calls before it renders a page:

```ts
import { componentMap } from '.sitecore/component-map';
import { JsonLdComponent } from './lib/jsonld/json-ld.component';

componentMap.set( 'JSON-LD', JsonLdComponent );
```

If your head maintains `.sitecore/component-map.ts` by hand (its `dev` and `build` scripts do not run
`generate-map`), put the `['JSON-LD', JsonLdComponent]` entry in that file instead.

JLSM delivers each graph inside a partial design, so the map also needs `PartialDesignDynamicPlaceholder`.
The template includes it.

## 4. The rendering in Sitecore

JLSM's Plugin Setup already creates and registers everything Sitecore needs. There is nothing to add by hand:

| Item | Path |
|---|---|
| The `JSON-LD` rendering (Json Rendering, component name `JSON-LD`) | `/sitecore/layout/Renderings/Feature/JSON-LD/JSON-LD` |
| The placeholder settings for `jlsm-jsonld`, allowing only the `JSON-LD` rendering | `/sitecore/layout/Placeholder Settings/Feature/JSON-LD/JSON-LD` |
| `jlsm-jsonld` in the Headless Layout's Layout Service Placeholders, so every page returns it | `/sitecore/layout/Layouts/Foundation/JSS Experience Accelerator/Presentation/JSS Layout` |

Publish the layout and the placeholder settings folder after Plugin Setup runs. On a tenant without the
Headless Layout, Plugin Setup asks you to add `jlsm-jsonld` to your own layout's placeholders.

> **Do not rename the rendering or change its Component Name.** The head finds JSON-LD renderings by the
> name `JSON-LD`: it is the component map key, and the engine walks the layout for components of that name.
> Under any other name the rendering maps to nothing and the page emits no JSON-LD.

## How it renders

- Every `JSON-LD` rendering on the page renders `JsonLdComponent`. The first one in the layout renders
  `jlsm-json-ld-script` for all of them, with entities shared between graphs written once; the rest render
  nothing.
- The component reads the page from `SitecoreContextService` and the Edge context id from the Sitecore
  configuration (`SITECORE_CONFIG_TOKEN`).
- Angular strips `<script>` from templates and from `[innerHTML]`, so `jlsm-json-ld-script` builds the
  element with `Renderer2` inside an `effect`. Effects run during server-side rendering, so the script is in
  the served HTML.

### Page dates

The page's created and updated dates are the one thing the layout does not carry, so `readPageDates` reads
them from Experience Edge. It asks only when a graph on the page uses a date, holds the answer five minutes,
and gives `null` after a failure or two seconds, in which case the page still emits without
`datePublished` and `dateModified`.

The read happens on the server, where the configuration holds the context id, and the result travels to the
browser in Angular's transfer state, so the context id stays on the server and the browser render keeps the
dates.

We're working on a mechanism to avoid this round-trip in an upcoming version. Today, the extra round-trip
is only executed if your schema includes the `♣page:created` or `♣page:updated` tokens. We advise avoiding use
of the `♣page:created` token in particular for the time being.

### Editing mode

In the Pages editor the component emits no script and shows an inline `{ } JSON-LD` chip with the size of
what the published page carries. Its outer element has `class="jsonld-marker"`.

### Contract

This renderer reads contract **2**: the datasource carries `jsonTemplate`, `references`, `jlsmSiteRoot`,
`jlsmDefaultLanguage` and `jlsmContract`. A datasource on another contract emits nothing. Upgrade the app,
republish every graph, then copy the new files here.

## Checking it

On a published page, view the source: there should be exactly one `application/ld+json` script with
`data-source` naming JSON-LD Schema Manager, in the body, and its `@graph` should hold one node per entity.

## Licence

MIT. See `LICENSE`.
