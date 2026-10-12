import { onLink } from "@tinymachines/kit/lib/router";

// The three projects built on the protocol, as they stand on the day this page was written. Nothing here is
// a promise: a project that has not built something says so. The page shows real reads only where they
// are public (docs/family.md): nothing an agent said, and no finding derived from a commercial cartridge.
const WALKS = [
  { uri: "tm://tinymachines/entity/pattern/pad-poll", what: "a pattern in 19 games" },
  { uri: "tm://tinymachines/entity/lesson/jump", what: "the jump lesson" },
  { uri: "tm://tinymachines/http/tinymachines.ai/autopsy/lessons/jump", what: "its page" },
  { uri: "tm://tinymachines/git/tinypeek/README.md", what: "a file with history" },
  { uri: "tm://", what: "every host" },
];

export default function Showcase() {
  return (
    <article className="showcase">
      <p className="kicker">tinypeek · <b>built on it</b></p>
      <h1>Three projects on one protocol</h1>
      <p className="lede">The protocol never gains a write verb. Only helpers write, the lens only reads, and the agents' inbox is the same pattern kept apart. <a href="/family" onClick={onLink}>Who does what</a> is the page that keeps the line.</p>

      <section className="sheet">
        <h2>tinylens, a browser for tm://</h2>
        <p>Built over the live server without changing anything below it. A pattern, a game and a lesson are drawn as pages nobody wrote: pad-poll's page is built from 26 reads, and every sentence on it is computed from them. Each page ends with the addresses it was built from.</p>
        <p>Every time the lens has to work around the addressing it logs a bend, and the bends become issues on the spec. That is the test of layer 2, and it found seven things on its first day.</p>
        <p className="controls"><a className="btn" href="/lens/">Open tinylens</a></p>
        <ul className="walks">
          {WALKS.map((w) => <li key={w.uri}><a href={`/lens/?uri=${encodeURIComponent(w.uri)}`}>{w.what}</a> <code>{w.uri}</code></li>)}
        </ul>
      </section>

      <section className="sheet">
        <h2>tinyhelper, every service that crawls or generates</h2>
        <p>The write side the protocol deliberately does not have. A helper asks a question of a model, draws a frame from the console, or walks the namespace to make an index, and keeps the raw result with the recipe that makes it again. A mount serves each finding read-only at its own address, linked both ways to what it is about.</p>
        <p>Measured and generated never mix: a console result keeps a recipe that runs again byte for byte, and a model's answer is cited, dated and marked generated, never shown as data.</p>
        <p><b>As it stands:</b> the pattern is written and its first drivers are being built. Findings are private by default, so this page shows none yet.</p>
      </section>

      <section className="sheet">
        <h2>tinyagent, an inbox for the owner's agents</h2>
        <p>An observer reads something, writes an envelope, and the envelope has an address. It is the same pattern as a helper, kept as its own project because another service already reads it.</p>
        <p><b>What this page never shows:</b> the live roster, or anything an agent said. An agent's words can hold clients and keys. When this showcase has examples, they will be made for the purpose.</p>
      </section>
    </article>
  );
}
