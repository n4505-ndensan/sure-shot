/* @refresh reload */
import { render } from "solid-js/web";
import "@sureshot/ui/global.scss";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
