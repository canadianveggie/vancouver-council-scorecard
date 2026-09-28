import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	base: process.env.GITHUB_ACTIONS ? '/vancouver-council-scorecard/' : '/',
	build: {
		rollupOptions: {
			input: {
				index: path.resolve(import.meta.dirname, 'index.html'),
				quiz: path.resolve(import.meta.dirname, 'quiz.html'),
				resultsAbc: path.resolve(import.meta.dirname, 'results-abc.html'),
				resultsGreen: path.resolve(import.meta.dirname, 'results-green.html'),
				resultsOneCity: path.resolve(import.meta.dirname, 'results-onecity.html'),
				resultsCope: path.resolve(import.meta.dirname, 'results-cope.html'),
				resultsVoteVancouver: path.resolve(import.meta.dirname, 'results-vote-vancouver.html'),
			},
		},
	},
})
