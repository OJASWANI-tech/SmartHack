import { createContext, useContext } from 'react'

export const EvaluatorMentorThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
})

export function useEvaluatorMentorTheme() {
  return useContext(EvaluatorMentorThemeContext)
}
