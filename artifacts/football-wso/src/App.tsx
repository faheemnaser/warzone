import { Switch, Route, Router as WouterRouter } from "wouter";
import { Analytics } from "@vercel/analytics/react";
import SessionsHub from "@/pages/SessionsHub";
import CreateSession from "@/pages/CreateSession";
import MatchSetup from "@/pages/MatchSetup";
import LiveMatch from "@/pages/LiveMatch";
import SessionSummary from "@/pages/SessionSummary";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SessionsHub} />
      <Route path="/create" component={CreateSession} />
      <Route path="/match-setup/:id" component={MatchSetup} />
      <Route path="/live/:id" component={LiveMatch} />
      <Route path="/summary/:id" component={SessionSummary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
      <Analytics />
    </WouterRouter>
  );
}

export default App;
