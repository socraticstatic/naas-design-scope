# Local patches on top of the Claude Design export

Applied 2026-09-08. Each one is small and lives in the export files, so a
fresh export from Claude Design will drop it unless the change was also made
there. Re-apply after `rsync` if the symptom returns.

## 1. Template wrap (console noise)
`NaaS Storefront.dc.html`, `Elevator Boards.dc.html`: the `<x-dc>` body is
wrapped in `<template>…</template>`, followed by a one-line inline script that
moves the template content back into `<x-dc>` and sets `window.__resources`.
Without it the browser parses every `{{ }}` SVG attribute on load and logs
about 90 errors per page; inert template content parses silently. Setting
`__resources` stops the runtime from re-fetching the raw file, which would
otherwise re-introduce the wrapper into the template string.

## 2. Header icon props (root 404s)
Header buttons used `url('{{ iconDir }}/search.svg')`; the placeholder render
resolves that to `/search.svg` and 404s at the site root. Replaced with
`{{ iconSearch }}`, `{{ iconBell }}`, `{{ iconPerson }}`, `{{ iconGear }}`
(`{{ iconQuestion }}` on the boards page) and added those props next to
`storeIcon` in `naas-app.js` and in the boards page return.

## 3. Pending Actions bar (Go live unreachable at 1280)
`section[aria-label="Pending actions"]`: columns `220px minmax(0,1fr) auto`
and the stage `<ol>` gets `flex-wrap:wrap;row-gap:6px;min-width:0`. The
`1fr` column could not shrink below the five nowrap stages, so the buttons
were pushed under the Andi panel.

## 4. By tag group line (`naas-app.js` tagTree)
Pluralises regions and clouds and counts workloads from the detailed VPC
objects, which carry their count under a different field than the rollups.
