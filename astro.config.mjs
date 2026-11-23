// @ts-check
import { defineConfig } from 'astro/config';

// Derrp Studio — standalone command-center site for the Derrp household.
// Static output: the whole app is one rich client-side page that talks to the
// Mochi Tailscale bridge from the visitor's browser (see DEPLOY-KIT.md).
export default defineConfig({
  site: 'https://derrp-studio.pages.dev',
});
