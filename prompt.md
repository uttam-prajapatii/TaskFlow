# AI Code Generation Rules

## 🧠 General Rules
- Always generate clean, readable, and beginner-friendly code
- Avoid overly complex patterns unless necessary
- Follow consistent naming conventions
- Use meaningful variable and function names

## 🏗️ Project Structure Rules
- Follow existing folder structure strictly
- Do not create random new folders
- Respect module-based architecture (feature-based)

## 🎯 Backend Rules (Node.js - ES Modules)
- Use ES Modules (import/export), NOT CommonJS
- Follow structure:
  - controller → service → repository → model
- Keep business logic inside service layer
- Keep controllers thin
- Use async/await (no callbacks)
- Handle errors properly using try/catch

## 🎨 Frontend Rules (React)
- Use functional components only
- Keep components small and reusable
- Follow existing folder structure (features-based)
- Use clear and simple JSX
- Avoid unnecessary complexity

## 🎨 UI / Theme Rules
- Follow existing UI theme strictly
- Do not change colors, fonts, or layout unless asked
- Reuse existing components if available

## 🧹 Code Style Rules
- Write simple and understandable code
- Avoid deep nesting
- Add comments only when necessary
- Keep functions small and focused

## 🚫 Avoid
- Over-engineering
- Unnecessary abstraction
- Large files
- Complex one-liners

## ✅ Output Expectations
- Code should be production-ready
- Code should be easy to understand for a mid-level developer
- Maintain consistency with existing codebase