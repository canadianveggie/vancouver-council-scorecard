import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"
import "./quiz.css"
import QuizApp from "./quiz/QuizApp"

// biome-ignore lint/style/noNonNullAssertion: quiz entry point always has a root
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QuizApp />
	</StrictMode>,
)
