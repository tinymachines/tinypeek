// The documents the site serves, as they are in the repository: Vite reads them at build time, so the
// site can never show a version of the spec the repository does not have.
import spec from "../../spec/tm-protocol-spec.md?raw";
import explainer from "../../docs/stack-explainer.md?raw";
import family from "../../docs/family.md?raw";

export interface DocInfo { path: string; file: string; kicker: string; md: string }

export const DOCS: DocInfo[] = [
  { path: "/spec", file: "spec/tm-protocol-spec.md", kicker: "the spec", md: spec },
  { path: "/explainer", file: "docs/stack-explainer.md", kicker: "the explainer", md: explainer },
  { path: "/family", file: "docs/family.md", kicker: "who does what", md: family },
];

/** Where a file of the repository is on GitHub, for a link the site has no page for. */
export const REPO = "https://github.com/tinymachines/tinypeek";
export const blob = (file: string) => `${REPO}/blob/main/${file}`;
