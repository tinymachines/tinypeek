import { useEffect } from "react";
import { usePath, navigate, onLink } from "@tinymachines/kit/lib/router";
import { describe } from "@tinymachines/kit/lib/seo";
import { applyHead } from "@tinymachines/kit/lib/head";
import { SiteHeader } from "@tinymachines/kit/components/SiteHeader";
import { SiteFooter } from "@tinymachines/kit/components/SiteFooter";
import { UpdateBar } from "@tinymachines/kit/components/UpdateBar";
import { SharePanel } from "@tinymachines/kit/components/SharePanel";
import ThemePage from "@tinymachines/kit/pages/ThemePage";
import SharePage from "@tinymachines/kit/pages/SharePage";
import AppPage from "@tinymachines/kit/pages/AppPage";
import Account from "@tinymachines/kit/pages/Account";
import FilesPage from "@tinymachines/kit/pages/FilesPage";
import { useAccount } from "@tinymachines/kit/lib/account";
import Home from "./pages/Home";
import Showcase from "./pages/Showcase";
import Doc from "./pages/Doc";
import { DOCS } from "./docs";

// The account page, Your files and the account load are the kit's (the shared account service, since 2026-10-15).
// The lens at /lens/ is outside the app (app.config.ts: outside).

function NotHere({ path }: { path: string }) {
  return <article><h1>Not here</h1><p>There is no page at {path}.</p><p><a href="/" onClick={onLink}>Home</a></p></article>;
}

export function App() {
  const path = usePath();
  const load = useAccount((s) => s.load);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (path === "/open") navigate("/", { replace: true }); }, [path]);
  useEffect(() => { applyHead(describe(location.pathname, location.search)); }, [path]);
  const doc = DOCS.find((d) => d.path === path);
  let page: React.ReactNode;
  if (path === "/") page = <Home />;
  else if (doc) page = <Doc doc={doc} />;
  else if (path === "/showcase") page = <Showcase />;
  else if (path === "/theme") page = <ThemePage />;
  else if (path === "/share") page = <SharePage />;
  else if (path === "/app") page = <AppPage />;
  else if (path === "/account") page = <Account />;
  else if (path === "/files") page = <FilesPage />;
  else page = <NotHere path={path} />;
  return (
    <>
      <SiteHeader path={path} />
      <UpdateBar />
      <main>{page}</main>
      <SiteFooter path={path} />
      <SharePanel />
    </>
  );
}
