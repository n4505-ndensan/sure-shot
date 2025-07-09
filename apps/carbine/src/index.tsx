/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import "@sureshot/ui/global.scss";

render(() => <App />, document.getElementById("root") as HTMLElement);
