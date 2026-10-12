import { onLink } from "@tinymachines/kit/lib/router";

// The front door: what the protocol is, in the words of the repository's README, and the four doors.
export default function Home() {
  return (
    <article className="home">
      <p className="kicker">tinypeek · <b>the tm:// protocol</b></p>
      <h1>Every real thing on a machine has an address</h1>
      <p className="lede">A read-only URI namespace over MCP. Every site, repository and file on a machine gets an address, and every address tells you what it is connected to.</p>

      <pre className="sample"><code>{`tm://tinymachines/http/tinymachines.ai/autopsy/lessons/jump
  tm:source   → tm://tinymachines/git/public/lessons/jump/prg.s
  tm:data     → tm://tinymachines/fs/data/lessons.json
  alternate   → tm://tinymachines/http/tinymachines.ai/ja/autopsy/lessons/jump`}</code></pre>

      <p>An AI client walks one machine's websites, source repositories and filesystem through a single grammar, and pivots between the faces of a thing (the rendered page, the code that emits it, the data it reads, the history behind it) by following typed links instead of guessing paths.</p>

      <section className="sheet">
        <h2>Read it</h2>
        <p className="controls">
          <a className="btn" href="/spec" onClick={onLink}>The spec</a>
          <a className="btn quiet" href="/explainer" onClick={onLink}>The explainer</a>
          <a className="btn quiet" href="/family" onClick={onLink}>Who does what</a>
        </p>
        <p>The spec says what runs, measured against the live server. Every section is marked shipped, partial or planned, with the ticket that moves it.</p>
      </section>

      <section className="sheet">
        <h2>Look through it</h2>
        <p className="controls">
          <a className="btn" href="/lens/">Open tinylens</a>
          <a className="btn quiet" href="/showcase" onClick={onLink}>The showcase</a>
        </p>
        <p>tinylens is a browser for tm://. The thing you are reading sits in the middle, its typed links around it, the views of it on a dial, and the trail that brought you here as a tree. It reads the live namespace from your browser and writes nothing.</p>
      </section>

      <section className="sheet">
        <h2>Principles</h2>
        <ul>
          <li><b>Read-only.</b> Safety lives in the verb set, not a curated view.</li>
          <li><b>The OS is the namespace.</b> Real files, repositories and sites, not a hand-built tree.</li>
          <li><b>Rules, not lists.</b> Templates publish the grammar; clients compose addresses they were never shown.</li>
          <li><b>Errors teach.</b> A wrong guess comes back with the nearest addresses that do resolve.</li>
          <li><b>Standards first.</b> MCP, RFC 3986, 6570 and 8288, Plan 9.</li>
        </ul>
      </section>

      <section className="sheet">
        <h2>The reference deployment</h2>
        <p>The <code>tinymachines</code> server runs the protocol live over its <code>fs</code>, <code>git</code>, <code>http</code> and <code>offbox</code> mounts and an <code>entity</code> mount, the first application built on them. The endpoint is <code>https://tinymachines.ai/api/mcp</code>, open to any MCP client with no token. The <a href="https://tinymachines.ai/docs/mcp-setup-guide">setup guide</a> says how to connect.</p>
        <p>The protocol and this site live in one repository, <a href="https://github.com/tinymachines/tinypeek">tinymachines/tinypeek</a>, under the MIT licence.</p>
      </section>
    </article>
  );
}
