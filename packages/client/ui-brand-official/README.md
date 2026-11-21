---
description: "Official sidebar branding and the default click-triggered pixel whale on the home page."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-brand-official

English | [中文](README.zh.md)

## Summary

This package supplies a click-triggered pixel whale on the blank home and gives an `official` client build the DeepSeek Harness sidebar artwork. The shipped Web and Desktop compositions load it by default. Other build profiles retain their existing branding. The hero mark stays on its animated fish fallback. The background owns only temporary canvas resources and adds no model requests. A Phoenix build also installs a host-side employee-dispatch guard for its office integration.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

The shipped Web and Desktop compositions already mount this plugin. Home feedback needs no extra installation or enablement; an `official` client build also registers the DeepSeek sidebar artwork.

### Choosing the profile

`DSH_CLIENT_BUILD_PROFILE` selects the official sidebar mark and name. A Phoenix local build selected by `DSH_CLIENT_BRAND=phoenix` instead renders the Phoenix sidebar mark and name, omits the whale background, and installs a light/dark orange and charcoal palette through the native theme registry. A first Phoenix launch defaults to dark when the preference is still `system`; later appearance choices remain under the user's control. Other nonofficial builds leave the shell fallbacks in place. The plugin loads and validates in every profile; its presentation registrations depend on the selected build identity.

### Home feedback

The default home stays clear until a primary click on empty space plays one light-gray whale breach. Successive completed clicks alternate between dots and code lettering, starting with dots. Both use the same large animated silhouette. The animation lasts 5.7 seconds, then clears. Repeated clicks leave the current playback uninterrupted. The whale's frame layer classifies clicks: blank space inside its frame triggers playback, including margins beside the input card, while input fields, controls, the input card, portaled overlays, and a click that ends a text selection never do. The canvas takes neither focus nor pointer events; the frame receives the clicks. On narrow homes the whale keeps a larger scale and is cropped at the canvas edges, without adding horizontal scrolling. Reduced-motion preference disables it, and leaving the blank home releases its animation and observers.

The whale uses very faint neutral theme ink, appearing as a subtle background texture; code lettering has more contrast than the dots. Water splashes retain fine particles with stronger ink, especially on the left during landing. A packaged frame atlas supplies the motion; the browser loads it once through the plugin asset route on the first eligible click. Code fills use dense 7px lettering drawn only from authored code slogans, and the moving silhouette clips text as it enters or leaves the water. Decode or pixel-read failures stop the decoration, leave home usable, and log a reload action.

The artwork values are fixed and the row takes no configuration. This is built-in presentation, without a separately installed bundle or Plugins-page toggle.

### Replacing the brand

A deployment with its own identity can leave this package out and compose another package that occupies the sidebar slots and the `conversation.hero.frame` layer — and the hero-mark slot, which this package leaves on its fallback. The local Phoenix build is selected through `DSH_CLIENT_BRAND` within this package; other deployments use slot composition.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The two occupants install as one declaration-aware registration set: nested `ctx.slots.inject()` calls wait on the sidebar declaration, so the set works whether this row activates before or after the declarer, withdraws both occupants when the declaration collapses, and leaves no partial brand mix during HMR. The independent `conversation.hero.frame` layer owns the canvas renderer and waits for its declaration through `ctx.slots.inject()`. While `hero` is true it paints the canvas at negative `z-index`, which the frame contract places above the Conversation background and below all Conversation content. It plays on primary clicks that reach its own frame outside controls and the composer card; clicks from portaled overlays and clicks that end a text selection inside the frame are ignored. It never changes the composer or conversation state. The browser half is [`src/client/index.ts`](src/client/index.ts). In Phoenix only, the node half wraps the installed collaboration tools: after a successful `message_bot` or `post_to_group` dispatch with `report_back: true`, the same agent and conversation lane cannot dispatch again until a new inbox message is claimed. A failed dispatch releases immediately. A write-only group announcement does not occupy the reply gate, so it may be followed by the next addressed assignment. A single group post may still mention multiple employees for intentional parallel work, and independent direct-message lanes remain independent. The [frame atlas](src/client/assets/breach-atlas.webp) derives from the user-supplied [showcase video](https://yinghuo-hg.deepseek.com/wuyexinrui/dev-cpu/web-showcase/orca.mp4): 1.5–7.2 seconds at 24 frames per second, sampled to 192 × 108 cells and stored as lossless WebP. Its red and green channels encode dot radius and opacity at 32 levels; the renderer reads it once after the first eligible click. The browser title is a build-environment concern (`DSH_CLIENT_TITLE`), outside the slot system.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

Read these pages when the brand surface is not enough. They move from the slots this package occupies to the shell that renders them.

- [ui-sidebar](../ui-sidebar/README.md) — declares `sidebar.brand.mark` and `sidebar.brand.name` and renders their fallbacks.
- [ui-conversation](../ui-conversation/README.md) — declares `conversation.hero.brand.mark` in the hero and the `conversation.hero.frame` layer this package occupies.
- [Web client architecture](../../../docs/subsystems/web-client.md) — how browser plugin rows load and register slots.

-----

<a id="model-experience"></a>
## Model Experience

Indirectly, through the Phoenix-only dispatch guard returning a model-visible tool failure when one agent tries a second employee assignment in the same conversation lane before a new inbox message is claimed.

#### KV Cache effect

The guard adds no prompt prefix and starts no model request. Only a rejected overlapping dispatch adds one short tool-result suffix to the current turn; ordinary serial dispatches have no additional token or KV-cache effect.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define how brand presentation is supplied. They are current package constraints, not a brand-design comparison or a task backlog.

- **One occupant set** — alternative presentation belongs in another Cordis package occupying the same slots.
- **Decorative rendering requires Canvas 2D** — unavailable contexts or reduced-motion preference leave the home clear.
- **The browser title is independent** — `DSH_CLIENT_TITLE` selects title text at build time rather than through a UI slot.

### Phoenix office

The Phoenix profile presents the existing employee roster in an offline 3D office. The scene fills the available workspace. Drag to orbit the center, scroll to zoom, and use Reset view to restore the overview; dragging does not pan or select an employee. Clicking an employee or nameplate opens the complete existing employee surface and its original Session; the top selector only changes the camera. The office header uses the native window drag region. Nameplates show saved names and job titles; the overview supports search, job filtering, employee cameras and additional floors. Idle drinking is decorative and is interrupted by work, blocked, waiting or unknown states. The sandboxed renderer receives display data only. Group seating and hall views are presentation controls, not task completion signals. See the [acceptance record](../../../apps/desktop/phoenix-office-acceptance.md) for verified operations and remaining integration work.

Employee creation, editing, model binding, credentials, folders, conversations, groups, members, room settings and persisted history remain owned by the installed team service. Phoenix supplies one branded office entry, opens that complete native surface for management and chat, and provides a visible return to the office. It does not maintain duplicate employee forms, room chat, room settings or a second data store. User-visible shell, team-surface and navigation product names are translated to Phoenix wording; compatibility package identifiers and license metadata remain unchanged internally.

Phoenix also prevents two separate assignments to the same employee conversation or group from being accepted back-to-back by one orchestrator. The first successful assignment stays pending until the employee reply or another inbox message starts the next step. This is an admission barrier, not a durable workflow engine: restart recovery still requires an authoritative persisted checkpoint, final summaries still need a source-of-truth event ledger, and a whole-task model-call budget is not enforced here.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>
