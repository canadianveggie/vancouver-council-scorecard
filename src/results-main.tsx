import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import "./quiz.css"
import ResultsApp from "./quiz/ResultsApp"

// biome-ignore lint/style/noNonNullAssertion: result entry point always has a root
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ResultsApp />
	</StrictMode>,
)
