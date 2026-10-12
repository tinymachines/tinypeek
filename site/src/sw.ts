/// <reference lib="webworker" />
// The service worker: the kit's, with this app's choices. The build fills in self.__WB_MANIFEST.
// pass: the lens is served beside the app (public/lens, copied from the tinylens checkout) and reads the
// namespace itself; the shell must never answer for it or for an API path.
import { startWorker } from "@tinymachines/kit/sw";
declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };
startWorker({ manifest: self.__WB_MANIFEST, prefix: "tinypeek", pass: /^\/(api|lens)(\/|$)/, force: import.meta.env.VITE_FORCE_UPDATE === "1" });
